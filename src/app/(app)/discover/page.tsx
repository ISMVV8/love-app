'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Zap, RefreshCw, MessageCircle } from 'lucide-react';
import SwipeCard from '@/components/SwipeCard';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import type { DiscoverProfile, SwipeAction, Profile, ProfilePhoto, Interest } from '@/lib/types';

const DAILY_LIKE_LIMIT = 50;

interface ProfileWithRelations extends Profile {
  profile_photos: ProfilePhoto[];
  profile_interests: {
    interest_id: string;
    interests: Interest;
  }[];
}

export default function DiscoverPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [matchAnimation, setMatchAnimation] = useState<{ name: string; matchId: string } | null>(null);
  const [dailyLikes, setDailyLikes] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [limitToast, setLimitToast] = useState(false);

  // Boost state
  const [boostActive, setBoostActive] = useState(false);
  const [boostAvailable, setBoostAvailable] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);

  const fetchDailyLikes = useCallback(async (uid: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_likes')
      .select('like_count')
      .eq('user_id', uid)
      .eq('date', today)
      .single();

    const count = data?.like_count || 0;
    setDailyLikes(count);
    setLimitReached(count >= DAILY_LIKE_LIMIT);
    return count;
  }, []);

  const incrementDailyLike = useCallback(async (uid: string) => {
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('daily_likes')
      .select('like_count')
      .eq('user_id', uid)
      .eq('date', today)
      .single();

    if (existing) {
      await supabase
        .from('daily_likes')
        .update({ like_count: existing.like_count + 1 })
        .eq('user_id', uid)
        .eq('date', today);
    } else {
      await supabase
        .from('daily_likes')
        .insert({ user_id: uid, date: today, like_count: 1 });
    }

    const newCount = (existing?.like_count || 0) + 1;
    setDailyLikes(newCount);
    if (newCount >= DAILY_LIKE_LIMIT) {
      setLimitReached(true);
      setLimitToast(true);
      setTimeout(() => setLimitToast(false), 4000);
    }
  }, []);

  const checkBoostStatus = useCallback(async (uid: string) => {
    const now = new Date().toISOString();

    const { data: activeBoost } = await supabase
      .from('boosts')
      .select('*')
      .eq('user_id', uid)
      .gt('expires_at', now)
      .order('activated_at', { ascending: false })
      .limit(1);

    if (activeBoost && activeBoost.length > 0) {
      setBoostActive(true);
      setBoostAvailable(false);
      return;
    }

    setBoostActive(false);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentBoost } = await supabase
      .from('boosts')
      .select('*')
      .eq('user_id', uid)
      .gt('activated_at', sevenDaysAgo)
      .limit(1);

    setBoostAvailable(!recentBoost || recentBoost.length === 0);
  }, []);

  const activateBoost = async () => {
    if (!userId || !boostAvailable || boostLoading) return;

    setBoostLoading(true);
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

      await supabase.from('boosts').insert({
        user_id: userId,
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      await supabase
        .from('user_scores')
        .update({
          new_user_boost: 3.0,
          boost_expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', userId);

      setBoostActive(true);
      setBoostAvailable(false);
    } catch {
      // Error activating boost
    } finally {
      setBoostLoading(false);
    }
  };

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      const [, , , myProfileRes, swipedRes, blockedByMeRes, blockedMeRes] = await Promise.all([
        fetchDailyLikes(currentUserId),
        checkBoostStatus(currentUserId),
        supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', currentUserId),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUserId)
          .single(),
        supabase
          .from('swipes')
          .select('swiped_id')
          .eq('swiper_id', currentUserId),
        supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', currentUserId),
        supabase
          .from('blocks')
          .select('blocker_id')
          .eq('blocked_id', currentUserId),
      ]);

      const myProfile = myProfileRes.data as Profile | null;
      const swipedIds = (swipedRes.data as { swiped_id: string }[] | null)?.map(s => s.swiped_id) || [];

      const blockedIds = [
        ...((blockedByMeRes.data || []) as { blocked_id: string }[]).map(b => b.blocked_id),
        ...((blockedMeRes.data || []) as { blocker_id: string }[]).map(b => b.blocker_id),
      ];

      const excludeIds = [currentUserId, ...swipedIds, ...blockedIds];

      let query = supabase
        .from('profiles')
        .select(`
          *,
          profile_photos (*),
          profile_interests (
            interest_id,
            interests (*)
          )
        `)
        .eq('is_active', true)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(20);

      if (myProfile?.gender_preference && myProfile.gender_preference.length > 0) {
        query = query.in('gender', myProfile.gender_preference);
      }

      const { data: candidateProfiles } = await query as { data: ProfileWithRelations[] | null };

      if (!candidateProfiles || candidateProfiles.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const visibleCandidates: ProfileWithRelations[] = [];

      for (const p of candidateProfiles) {
        if (p.invisible_mode) {
          const { data: theirLike } = await supabase
            .from('swipes')
            .select('id')
            .eq('swiper_id', p.id)
            .eq('swiped_id', currentUserId)
            .eq('action', 'like')
            .limit(1);

          if (!theirLike || theirLike.length === 0) continue;
        }

        const birthDate = new Date(p.birth_date);
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (myProfile && (age < myProfile.age_min || age > myProfile.age_max)) continue;

        visibleCandidates.push(p);
      }

      const scoredProfiles = await Promise.all(
        visibleCandidates.map(async (p): Promise<DiscoverProfile> => {
          let feedScore = 0;
          try {
            const { data: scoreData } = await supabase.rpc('feed_score', {
              viewer_id: currentUserId,
              candidate_id: p.id,
            });
            feedScore = (scoreData as number) ?? 0;
          } catch {
            try {
              const { data: compatData } = await supabase.rpc('compatibility_score', {
                user_a: currentUserId,
                user_b: p.id,
              });
              feedScore = (compatData as number) ?? 0;
            } catch {
              feedScore = 0;
            }
          }

          return {
            ...p,
            compatibility_score: feedScore,
            profile_photos: p.profile_photos || [],
            profile_interests: p.profile_interests || [],
          };
        })
      );

      scoredProfiles.sort((a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0));

      setProfiles(scoredProfiles);
    } catch {
      // Error fetching profiles
    } finally {
      setLoading(false);
    }
  }, [fetchDailyLikes, checkBoostStatus]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSwipe = async (action: SwipeAction) => {
    if (!userId || profiles.length === 0) return;

    if ((action === 'like' || action === 'super_like') && limitReached) {
      setLimitToast(true);
      setTimeout(() => setLimitToast(false), 4000);
      return;
    }

    const target = profiles[0];

    try {
      if (action === 'like' || action === 'super_like') {
        await supabase.from('swipes').upsert({
          swiper_id: target.id,
          swiped_id: userId,
          action: 'like',
        }, { onConflict: 'swiper_id,swiped_id' });

        await incrementDailyLike(userId);
      }

      const { error } = await supabase.from('swipes').insert({
        swiper_id: userId,
        swiped_id: target.id,
        action,
      });

      if (error) throw error;

      if (action === 'like' || action === 'super_like') {
        // Check if mutual match exists
        const { data: match } = await supabase
          .from('matches')
          .select('id')
          .or(`and(user_a.eq.${userId},user_b.eq.${target.id}),and(user_a.eq.${target.id},user_b.eq.${userId})`)
          .single();

        if (match) {
          setMatchAnimation({ name: target.first_name, matchId: match.id });
        }
      }
    } catch {
      // Swipe error
    }

    setProfiles(prev => prev.slice(1));
  };

  if (loading) {
    return <SkeletonLoader variant="discover" />;
  }

  return (
    <div className="px-3 pt-3 flex flex-col" style={{ height: 'calc(100dvh - env(safe-area-inset-top, 0px))' }}>
      {/* Minimal header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <Heart className="w-6 h-6 text-[#F9A8D4]" fill="currentColor" />
        </div>
        <div className="flex items-center gap-2">
          {/* Daily likes pill */}
          <div className="flex items-center gap-1.5 bg-[#141416] border border-white/[0.04] rounded-full px-3 py-1.5">
            <Heart className="w-3 h-3 text-[#F9A8D4]" fill="currentColor" />
            <span className={`text-[11px] font-semibold tabular-nums ${dailyLikes >= DAILY_LIKE_LIMIT ? 'text-red-400' : dailyLikes >= 40 ? 'text-[#F59E0B]' : 'text-white/70'}`}>
              {DAILY_LIKE_LIMIT - dailyLikes}
            </span>
          </div>

          {/* Boost */}
          <button
            onClick={activateBoost}
            disabled={!boostAvailable || boostLoading || boostActive}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              boostActive
                ? 'bg-[#EC4899]'
                : boostAvailable
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#141416] border border-white/[0.04] opacity-40'
            }`}
            style={boostActive ? { background: 'linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)' } : undefined}
          >
            <Zap className={`w-4 h-4 ${boostActive || boostAvailable ? 'text-white' : 'text-white/25'}`} fill={boostActive ? 'currentColor' : 'none'} />
          </button>

          {/* Refresh */}
          <button
            onClick={fetchProfiles}
            className="w-9 h-9 rounded-full bg-[#141416] border border-white/[0.04] flex items-center justify-center text-white/50 active:scale-90 transition-transform"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Boost active banner */}
      {boostActive && (
        <div className="mb-2 rounded-2xl bg-[#141416] border border-white/[0.04] px-3 py-2 flex items-center gap-2 shrink-0">
          <Zap className="w-4 h-4 text-[#F9A8D4]" fill="currentColor" />
          <p className="text-[12px] font-semibold text-white">Boost actif ! Ton profil est mis en avant.</p>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="flex-1 flex items-center">
          <EmptyState
            icon={Heart}
            title="Plus de profils"
            description="Tu as vu tous les profils disponibles. Reviens plus tard ou ajuste tes préférences."
            action={{ label: 'Rafraîchir', onClick: fetchProfiles }}
          />
        </div>
      ) : (
        <div className="relative flex-1 mb-[calc(60px+env(safe-area-inset-bottom,0px)+0.5rem)]">
          <AnimatePresence>
            {profiles.slice(0, 2).reverse().map((profile) => (
              <SwipeCard
                key={profile.id}
                profile={profile}
                onSwipe={handleSwipe}
                isTop={profile.id === profiles[0].id}
                zIndex={profile.id === profiles[0].id ? 10 : 1}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Limit toast */}
      <AnimatePresence>
        {limitToast && (
          <motion.div
            className="fixed bottom-28 left-4 right-4 z-50 max-w-sm mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="rounded-2xl bg-[#141416] backdrop-blur-xl border border-white/[0.04] p-4 flex items-center gap-3 shadow-2xl">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)' }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Limite quotidienne atteinte</p>
                <p className="text-[12px] text-white/50">Tu as utilisé tes {DAILY_LIKE_LIMIT} likes du jour. Reviens demain !</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match animation — PREMIUM design */}
      <AnimatePresence>
        {matchAnimation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center px-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {/* Two overlapping circles */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-[90px] h-[90px] rounded-full bg-[#141416] border-2 border-white/20 flex items-center justify-center overflow-hidden -rotate-6">
                    <Heart className="w-10 h-10 text-[#F9A8D4]" fill="currentColor" />
                  </div>
                  <div className="w-[90px] h-[90px] rounded-full bg-[#141416] border-2 border-white/20 flex items-center justify-center overflow-hidden absolute top-0 left-14 rotate-6">
                    <Heart className="w-10 h-10 text-[#F9A8D4]" fill="currentColor" />
                  </div>
                  {/* Small heart between */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
                    style={{ background: 'linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)' }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <Heart className="w-5 h-5 text-white" fill="currentColor" />
                  </motion.div>
                </div>
              </div>

              <h2 className="text-[28px] font-bold text-white mb-2">
                C&apos;est un Match !
              </h2>
              <p className="text-white/50 text-base mb-8">
                Toi et {matchAnimation.name} vous vous plaisez
              </p>

              <button
                onClick={() => { setMatchAnimation(null); router.push(`/matches/${matchAnimation.matchId}`); }}
                className="w-full py-3.5 rounded-full text-white font-semibold text-base flex items-center justify-center gap-2 mb-3 active:scale-[0.97] transition-transform"
                style={{ background: 'linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)' }}
              >
                <MessageCircle className="w-5 h-5" />
                Envoyer un message
              </button>
              <button
                onClick={() => setMatchAnimation(null)}
                className="w-full py-3 rounded-full bg-transparent border border-white/[0.06] text-white/70 text-sm font-medium active:scale-[0.97] transition-transform"
              >
                Continuer à découvrir
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
