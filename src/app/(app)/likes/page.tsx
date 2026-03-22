'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
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
      setTimeout(() => setMatchAnimation(null), 3500);

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
      {/* Header — centré comme Chats */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <h1 className="text-[18px] font-bold text-white">Likes</h1>
        {likes.length > 0 && (
          <span className="min-w-[24px] h-6 rounded-full bg-[#F9A8D4] text-[12px] font-bold flex items-center justify-center text-[#09090B] px-2">
            {likes.length}
          </span>
        )}
      </div>

      {likes.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aucun like pour le moment"
          description="Quand quelqu'un te like, tu le verras ici. Continue à découvrir des profils !"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {likes.map((profile) => {
            const age = calculateAge(profile.birth_date);
            const isRemoving = removingId === profile.id;

            return (
              <motion.button
                key={profile.id}
                className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-[#141416] active:scale-[0.97] transition-all duration-200"
                onClick={() => handleLikeBack(profile)}
                animate={isRemoving ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
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
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/25">
                    {profile.first_name.charAt(0)}
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Heart badge top-right with glow */}
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F9A8D4] flex items-center justify-center animate-pulse-glow">
                  <Heart className="w-4 h-4 text-[#09090B]" fill="currentColor" />
                </div>

                {/* Name + age at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white text-sm truncate">
                      {profile.first_name}, {age}
                    </span>
                    {profile.is_verified && <VerifiedBadge size="sm" />}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Match animation */}
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
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-[90px] h-[90px] rounded-full bg-[#141416] border-2 border-white/20 flex items-center justify-center -rotate-6">
                    <Heart className="w-10 h-10 text-[#F9A8D4]" fill="currentColor" />
                  </div>
                  <div className="w-[90px] h-[90px] rounded-full bg-[#141416] border-2 border-white/20 flex items-center justify-center absolute top-0 left-14 rotate-6">
                    <Heart className="w-10 h-10 text-[#F9A8D4]" fill="currentColor" />
                  </div>
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
                Toi et {matchAnimation} vous vous plaisez
              </p>

              <button
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
