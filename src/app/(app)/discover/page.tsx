'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, RefreshCw } from 'lucide-react';
import SwipeCard from '@/components/SwipeCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import type { DiscoverProfile, SwipeAction, Profile, ProfilePhoto, Interest } from '@/lib/types';

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

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single() as { data: Profile | null };

      const { data: swipedData } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', currentUserId) as { data: { swiped_id: string }[] | null };
      const swipedIds = swipedData?.map(s => s.swiped_id) || [];
      const excludeIds = [currentUserId, ...swipedIds];

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

      const profilesWithScores: DiscoverProfile[] = [];
      for (const p of candidateProfiles) {
        let score = 0;
        try {
          const rpcFn = supabase.rpc as unknown as (fn: string, params: Record<string, string>) => PromiseLike<{ data: number | null }>;
          const { data: scoreData } = await rpcFn('compatibility_score', {
            user_a: currentUserId,
            user_b: p.id,
          });
          score = scoreData ?? 0;
        } catch {
          // Score stays 0
        }

        const birthDate = new Date(p.birth_date);
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (myProfile && (age < myProfile.age_min || age > myProfile.age_max)) continue;

        profilesWithScores.push({
          ...p,
          compatibility_score: score,
          profile_photos: p.profile_photos || [],
          profile_interests: p.profile_interests || [],
        });
      }

      profilesWithScores.sort((a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0));
      setProfiles(profilesWithScores);
    } catch {
      // Error fetching profiles
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSwipe = async (action: SwipeAction) => {
    if (!userId || profiles.length === 0) return;

    const target = profiles[0];

    try {
      // If liking, auto-create a mutual like from the other side (demo mode)
      if (action === 'like' || action === 'super_like') {
        // Insert the other person's like first (so the trigger creates the match)
        await supabase.from('swipes').upsert({
          swiper_id: target.id,
          swiped_id: userId,
          action: 'like',
        }, { onConflict: 'swiper_id,swiped_id' });
      }

      // Insert our swipe (this triggers the match via DB trigger)
      const { error } = await supabase.from('swipes').insert({
        swiper_id: userId,
        swiped_id: target.id,
        action,
      });

      if (error) throw error;

      if (action === 'like' || action === 'super_like') {
        // Match was auto-created by the trigger — show animation
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Compass className="w-6 h-6 text-pink-400" />
          Découvrir
        </h1>
        <motion.button
          onClick={fetchProfiles}
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          whileTap={{ scale: 0.9 }}
        >
          <RefreshCw className="w-5 h-5" />
        </motion.button>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Plus de profils"
          description="Tu as vu tous les profils disponibles. Reviens plus tard ou ajuste tes préférences."
          action={{ label: 'Rafraîchir', onClick: fetchProfiles }}
        />
      ) : (
        <div className="relative w-full" style={{ height: 'calc(100dvh - 180px)' }}>
          <AnimatePresence>
            {profiles.slice(0, 2).map((profile, index) => (
              <SwipeCard
                key={profile.id}
                profile={profile}
                onSwipe={handleSwipe}
                isTop={index === 0}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

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
