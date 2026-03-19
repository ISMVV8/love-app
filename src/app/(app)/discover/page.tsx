'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, RefreshCw, Heart, Zap } from 'lucide-react';
import SwipeCard from '@/components/SwipeCard';
import LoadingSpinner from '@/components/LoadingSpinner';
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

  // Boost state
  const [boostActive, setBoostActive] = useState(false);
  const [boostAvailable, setBoostAvailable] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);

  // Fetch daily like count
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

  // Increment daily like count
  const incrementDailyLike = useCallback(async (uid: string) => {
    const today = new Date().toISOString().split('T')[0];

    // Upsert — increment or create
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
    if (newCount >= DAILY_LIKE_LIMIT) setLimitReached(true);
  }, []);

  // Check boost status
  const checkBoostStatus = useCallback(async (uid: string) => {
    const now = new Date().toISOString();

    // Check if boost is currently active
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

    // Check if last boost was more than 7 days ago
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
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // +1h

      // Insert boost record
      await supabase.from('boosts').insert({
        user_id: userId,
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      // Update user_scores boost
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

      // Fetch daily likes + boost status
      await fetchDailyLikes(currentUserId);
      await checkBoostStatus(currentUserId);

      // Update last_active_at
      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', currentUserId);

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single() as { data: Profile | null };

      // Get already swiped profiles
      const { data: swipedData } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', currentUserId) as { data: { swiped_id: string }[] | null };
      const swipedIds = swipedData?.map(s => s.swiped_id) || [];

      // Get blocked profiles (both directions)
      const { data: blockedByMe } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', currentUserId);
      const { data: blockedMe } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', currentUserId);

      const blockedIds = [
        ...(blockedByMe || []).map(b => b.blocked_id),
        ...(blockedMe || []).map(b => b.blocker_id),
      ];

      const excludeIds = [currentUserId, ...swipedIds, ...blockedIds];

      // Build query with filters
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
        .limit(30);

      // Gender preference filter
      if (myProfile?.gender_preference && myProfile.gender_preference.length > 0) {
        query = query.in('gender', myProfile.gender_preference);
      }

      const { data: candidateProfiles } = await query as { data: ProfileWithRelations[] | null };

      if (!candidateProfiles || candidateProfiles.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      // Calculate feed_score for each candidate
      const profilesWithScores: DiscoverProfile[] = [];

      for (const p of candidateProfiles) {
        // Filter invisible mode profiles (only show if they liked us)
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

        // Age filter
        const birthDate = new Date(p.birth_date);
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (myProfile && (age < myProfile.age_min || age > myProfile.age_max)) continue;

        // Get feed_score from DB function
        let feedScore = 0;
        try {
          const { data: scoreData } = await supabase.rpc('feed_score', {
            viewer_id: currentUserId,
            candidate_id: p.id,
          });
          feedScore = (scoreData as number) ?? 0;
        } catch {
          // Fallback to compatibility_score
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

        profilesWithScores.push({
          ...p,
          compatibility_score: feedScore,
          profile_photos: p.profile_photos || [],
          profile_interests: p.profile_interests || [],
        });
      }

      // Sort by feed_score DESC — this is the magic
      profilesWithScores.sort((a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0));

      setProfiles(profilesWithScores);
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

    // Check daily limit for likes
    if ((action === 'like' || action === 'super_like') && limitReached) {
      return; // Don't process — limit popup is shown
    }

    const target = profiles[0];

    try {
      // Demo mode: auto-create mutual like for instant match
      if (action === 'like' || action === 'super_like') {
        await supabase.from('swipes').upsert({
          swiper_id: target.id,
          swiped_id: userId,
          action: 'like',
        }, { onConflict: 'swiper_id,swiped_id' });

        // Increment daily like counter
        await incrementDailyLike(userId);
      }

      // Insert our swipe (triggers match check + score recalculation)
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
    return (
      <div className="min-h-[80dvh] flex items-center justify-center">
        <LoadingSpinner text="Recherche de profils..." />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Compass className="w-6 h-6 text-pink-400" />
          Découvrir
        </h1>
        <div className="flex items-center gap-3">
          {/* Daily likes counter */}
          <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1.5">
            <Heart className="w-3.5 h-3.5 text-pink-400" fill="currentColor" />
            <span className={`text-xs font-semibold ${dailyLikes >= DAILY_LIKE_LIMIT ? 'text-red-400' : dailyLikes >= 40 ? 'text-amber-400' : 'text-zinc-300'}`}>
              {DAILY_LIKE_LIMIT - dailyLikes}
            </span>
          </div>

          {/* Boost button */}
          <motion.button
            onClick={activateBoost}
            disabled={!boostAvailable || boostLoading || boostActive}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all relative ${
              boostActive
                ? 'gradient-accent shadow-lg shadow-purple-500/30'
                : boostAvailable
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-orange-500/30'
                  : 'glass opacity-40'
            }`}
            whileTap={boostAvailable ? { scale: 0.9 } : undefined}
          >
            <Zap className={`w-5 h-5 ${boostActive || boostAvailable ? 'text-white' : 'text-zinc-400'}`} fill={boostActive ? 'currentColor' : 'none'} />
            {boostActive && (
              <motion.div
                className="absolute inset-0 rounded-full gradient-accent"
                animate={{ opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.button>

          <motion.button
            onClick={fetchProfiles}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            whileTap={{ scale: 0.9 }}
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Boost active banner */}
      <AnimatePresence>
        {boostActive && (
          <motion.div
            className="mb-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-yellow-500/10 border border-purple-500/20 p-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
              >
                <Zap className="w-5 h-5 text-yellow-400" fill="currentColor" />
              </motion.div>
              <p className="text-sm font-semibold text-white">Boost actif ! Ton profil est mis en avant.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily limit reached banner */}
      <AnimatePresence>
        {limitReached && (
          <motion.div
            className="mb-4 rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 p-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Limite quotidienne atteinte</p>
                <p className="text-xs text-zinc-400">Tu as utilisé tes {DAILY_LIKE_LIMIT} likes du jour. Reviens demain !</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Compass}
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

      {/* Match animation */}
      <AnimatePresence>
        {matchAnimation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <motion.div
                className="text-7xl mb-4"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                💖
              </motion.div>
              <h2 className="text-3xl font-extrabold gradient-accent-text mb-2">
                C&apos;est un Match !
              </h2>
              <p className="text-zinc-300 text-lg">
                Toi et {matchAnimation} vous vous plaisez mutuellement
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
