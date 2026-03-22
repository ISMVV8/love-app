'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, Heart, Zap } from 'lucide-react';
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
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [matchAnimation, setMatchAnimation] = useState<string | null>(null);
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

      // Run all initial queries in parallel
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

      // Filter invisible mode and age — collect visible candidates first
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

      // Score all visible candidates in parallel
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
        setMatchAnimation(target.first_name);
        setTimeout(() => setMatchAnimation(null), 2500);
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
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#F4F4F5] tracking-tight">
          Découvrir
        </h1>
        <div className="flex items-center gap-2.5">
          {/* Daily likes counter */}
          <div className="flex items-center gap-1.5 bg-[#161618] border border-[#262628] rounded-full px-3 py-2">
            <Heart className="w-3.5 h-3.5 text-[#E11D48]" fill="currentColor" />
            <span className={`text-xs font-semibold tabular-nums ${dailyLikes >= DAILY_LIKE_LIMIT ? 'text-red-400' : dailyLikes >= 40 ? 'text-[#F59E0B]' : 'text-zinc-300'}`}>
              {DAILY_LIKE_LIMIT - dailyLikes}
            </span>
          </div>

          {/* Boost button */}
          <button
            onClick={activateBoost}
            disabled={!boostAvailable || boostLoading || boostActive}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all relative active:scale-90 ${
              boostActive
                ? 'bg-[#E11D48]'
                : boostAvailable
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#161618] border border-[#262628] opacity-40'
            }`}
          >
            <Zap className={`w-5 h-5 ${boostActive || boostAvailable ? 'text-white' : 'text-zinc-500'}`} fill={boostActive ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={fetchProfiles}
            className="w-10 h-10 rounded-full bg-[#161618] border border-[#262628] flex items-center justify-center text-zinc-500 hover:text-white transition-colors active:scale-90"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Boost active banner */}
      {boostActive && (
        <div className="mb-3 rounded-xl bg-[#161618] border border-[#262628] px-3 py-2.5 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#F59E0B]" fill="currentColor" />
          <p className="text-xs font-semibold text-white">Boost actif ! Ton profil est mis en avant.</p>
        </div>
      )}

      {profiles.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Plus de profils"
          description="Tu as vu tous les profils disponibles. Reviens plus tard ou ajuste tes préférences."
          action={{ label: 'Rafraîchir', onClick: fetchProfiles }}
        />
      ) : (
        <div className="relative w-full" style={{ height: 'calc(100dvh - 200px)' }}>
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
          <div className="fixed bottom-28 left-4 right-4 z-50 max-w-sm mx-auto animate-[fadeIn_0.2s_ease-out]">
            <div className="rounded-2xl bg-[#161618] backdrop-blur-xl border border-[#262628] p-4 flex items-center gap-3 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-[#E11D48] flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Limite quotidienne atteinte</p>
                <p className="text-xs text-zinc-400">Tu as utilisé tes {DAILY_LIKE_LIMIT} likes du jour. Reviens demain !</p>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Match animation — KEEP framer-motion here (core feature) */}
      <AnimatePresence>
        {matchAnimation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="text-center animate-[slideUp_0.3s_ease-out]">
              <div className="text-7xl mb-4 animate-bounce">
                💖
              </div>
              <h2 className="text-3xl font-extrabold text-[#E11D48] mb-2">
                C&apos;est un Match !
              </h2>
              <p className="text-zinc-300 text-lg">
                Toi et {matchAnimation} vous vous plaisez mutuellement
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
