'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { calculateAge } from '@/lib/utils';
import type { Profile, ProfilePhoto } from '@/lib/types';

interface LikeProfile extends Profile {
  photo_url: string | null;
}

export default function LikesPage() {
  const [likes, setLikes] = useState<LikeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [matchAnimation, setMatchAnimation] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchLikes = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const currentUserId = session.user.id;
    setUserId(currentUserId);

    const { data: mySwipes } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', currentUserId);

    const swipedIds = mySwipes?.map(s => s.swiped_id) || [];

    const query = supabase
      .from('swipes')
      .select('swiper_id')
      .eq('swiped_id', currentUserId)
      .eq('action', 'like');

    const { data: likeSwipes } = await query;

    if (!likeSwipes || likeSwipes.length === 0) {
      setLikes([]);
      setLoading(false);
      return;
    }

    const likerIds = likeSwipes
      .map(s => s.swiper_id)
      .filter(id => !swipedIds.includes(id));

    if (likerIds.length === 0) {
      setLikes([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', likerIds);

    if (!profiles) {
      setLikes([]);
      setLoading(false);
      return;
    }

    const { data: photos } = await supabase
      .from('profile_photos')
      .select('*')
      .in('profile_id', likerIds)
      .eq('is_primary', true);

    const photoMap = new Map<string, string>();
    (photos || []).forEach((p: ProfilePhoto) => {
      photoMap.set(p.profile_id, p.url);
    });

    const likeProfiles: LikeProfile[] = profiles.map(p => ({
      ...p,
      photo_url: photoMap.get(p.id) || null,
    }));

    setLikes(likeProfiles);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  const handleLikeBack = async (profile: LikeProfile) => {
    if (!userId) return;

    setRemovingId(profile.id);

    try {
      await supabase.from('swipes').insert({
        swiper_id: userId,
        swiped_id: profile.id,
        action: 'like',
      });

      setMatchAnimation(profile.first_name);
      setTimeout(() => setMatchAnimation(null), 2500);

      setTimeout(() => {
        setLikes(prev => prev.filter(l => l.id !== profile.id));
        setRemovingId(null);
      }, 400);
    } catch {
      setRemovingId(null);
    }
  };

  if (loading) {
    return <SkeletonLoader variant="likes" />;
  }

  return (
    <div className="px-4 pt-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="w-6 h-6 text-[#E11D48]" fill="currentColor" />
          Likes
        </h1>
      </div>

      {likes.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aucun like pour le moment"
          description="Quand quelqu'un te like, tu le verras ici. Continue à découvrir des profils !"
        />
      ) : (
        <>
          {/* Counter */}
          <div className="mb-6 text-center">
            <p className="text-5xl font-extrabold text-[#F4F4F5] mb-1">
              {likes.length}
            </p>
            <p className="text-sm text-zinc-400">
              personne{likes.length > 1 ? 's' : ''} t&apos;{likes.length > 1 ? 'ont' : 'a'} liké
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-3">
            {likes.map((profile) => {
              const age = calculateAge(profile.birth_date);
              const isRemoving = removingId === profile.id;

              return (
                <button
                  key={profile.id}
                  className={`relative rounded-2xl overflow-hidden aspect-[3/4] bg-zinc-800 transition-all duration-200 active:scale-95 ${isRemoving ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
                  onClick={() => handleLikeBack(profile)}
                >
                    {/* Photo (blurred) */}
                    {profile.photo_url ? (
                      <div className="photo-protected-wrapper w-full h-full">
                        <Image
                          src={profile.photo_url}
                          alt={profile.first_name}
                          fill
                          className="object-cover photo-protected"
                          style={{ filter: 'blur(20px)' }}
                          sizes="50vw"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-600">
                        {profile.first_name.charAt(0)}
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Heart icon overlay */}
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#E11D48] flex items-center justify-center">
                      <Heart className="w-4 h-4 text-white" fill="currentColor" />
                    </div>

                    {/* Name + age overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-sm truncate">
                          {profile.first_name}, {age}
                        </span>
                        {profile.is_verified && <VerifiedBadge size="sm" />}
                      </div>
                    </div>
                </button>
              );
            })}
          </div>
        </>
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
              <h2 className="text-3xl font-extrabold text-[#E11D48] mb-2">
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
