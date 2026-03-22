'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { MapPin, Heart, X, Star, ChevronUp } from 'lucide-react';
import ProfileDetail from '@/components/ProfileDetail';
import VerifiedBadge from '@/components/VerifiedBadge';
import { calculateAge } from '@/lib/utils';
import { SWIPE_THRESHOLD } from '@/lib/constants';
import type { DiscoverProfile } from '@/lib/types';

interface SwipeCardProps {
  profile: DiscoverProfile;
  onSwipe: (action: 'like' | 'dislike' | 'super_like') => void;
  isTop: boolean;
  zIndex?: number;
}

export default function SwipeCard({ profile, onSwipe, isTop, zIndex = 1 }: SwipeCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-20, 0, 20]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const dislikeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const likeScale = useTransform(x, [0, 150], [0.5, 1]);
  const dislikeScale = useTransform(x, [-150, 0], [1, 0.5]);

  const photos = profile.profile_photos.sort((a, b) => a.position - b.position);
  const currentPhoto = photos[photoIndex] || photos[0];
  const age = calculateAge(profile.birth_date);
  const interests = profile.profile_interests || [];

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipeForce = Math.abs(offset.x) * velocity.x;

    if (offset.x > SWIPE_THRESHOLD || swipeForce > 10000) {
      setExitDirection('right');
      onSwipe('like');
    } else if (offset.x < -SWIPE_THRESHOLD || swipeForce < -10000) {
      setExitDirection('left');
      onSwipe('dislike');
    }
  };

  const handlePhotoNav = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
    } else if (direction === 'next' && photoIndex < photos.length - 1) {
      setPhotoIndex(photoIndex + 1);
    }
  };

  if (!isTop) {
    return null;
  }

  return (
    <>
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate, zIndex }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      animate={
        exitDirection === 'left'
          ? { x: -500, opacity: 0, transition: { duration: 0.3 } }
          : exitDirection === 'right'
            ? { x: 500, opacity: 0, transition: { duration: 0.3 } }
            : { x: 0 }
      }
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-[#141416]">
        {/* Photo */}
        {currentPhoto && (
          <div className="photo-protected-wrapper w-full h-full">
            <Image
              src={currentPhoto.url}
              alt={profile.first_name}
              fill
              className="object-cover photo-protected"
              priority
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
        )}

        {/* Photo navigation zones */}
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePhotoNav('prev'); }}
              className="absolute left-0 top-0 w-1/3 h-2/3 z-10"
              aria-label="Photo précédente"
            />
            <button
              onClick={(e) => { e.stopPropagation(); handlePhotoNav('next'); }}
              className="absolute right-0 top-0 w-1/3 h-2/3 z-10"
              aria-label="Photo suivante"
            />
          </>
        )}

        {/* Photo dot indicators at top */}
        {photos.length > 1 && (
          <div className="absolute top-3 left-4 right-4 flex gap-1 z-20">
            {photos.map((_, i) => (
              <div
                key={photos[i].id}
                className={`h-[3px] rounded-full flex-1 transition-all duration-300 ${
                  i === photoIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Verified badge top-right */}
        {profile.is_verified && (
          <div className="absolute top-3 right-4 z-20">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              <VerifiedBadge size="sm" />
              <span className="text-[11px] font-medium text-white/90">Vérifié</span>
            </div>
          </div>
        )}

        {/* Like overlay */}
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <motion.div
            className="px-8 py-4 rounded-2xl bg-emerald-500/80 backdrop-blur-sm"
            style={{ scale: likeScale }}
          >
            <span className="text-white text-4xl font-extrabold tracking-wider">LIKE</span>
          </motion.div>
        </motion.div>

        {/* Nope overlay */}
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          style={{ opacity: dislikeOpacity }}
        >
          <motion.div
            className="px-8 py-4 rounded-2xl bg-red-500/80 backdrop-blur-sm"
            style={{ scale: dislikeScale }}
          >
            <span className="text-white text-4xl font-extrabold tracking-wider">NOPE</span>
          </motion.div>
        </motion.div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 photo-gradient" />

        {/* Profile info on gradient */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Name + Age */}
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <h2 className="text-[28px] font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {profile.first_name}
            </h2>
            <span className="text-[28px] font-light text-white/90">{age}</span>
          </div>

          {/* Location chip */}
          {profile.location_city && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 mb-2">
              <MapPin className="w-3 h-3 text-white/70" />
              <span className="text-[12px] text-white/80">{profile.location_city}</span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-[14px] text-white/80 line-clamp-2 leading-relaxed mb-2.5">
              {profile.bio}
            </p>
          )}

          {/* Interest chips */}
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {interests.slice(0, 4).map((pi) => (
                <span
                  key={pi.interest_id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] text-white/90"
                >
                  {pi.interests.emoji && <span className="text-[11px]">{pi.interests.emoji}</span>}
                  {pi.interests.name}
                </span>
              ))}
              {interests.length > 4 && (
                <span className="px-2 py-1 text-[12px] text-white/50">
                  +{interests.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Voir plus button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] text-white/70 mb-5 active:scale-95 transition-transform"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Voir plus
          </button>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-5">
            <motion.button
              onClick={() => { setExitDirection('left'); onSwipe('dislike'); }}
              className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" strokeWidth={2.5} />
            </motion.button>

            <motion.button
              onClick={() => onSwipe('super_like')}
              className="w-11 h-11 rounded-full bg-blue-500/20 backdrop-blur-md flex items-center justify-center text-blue-400"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.9 }}
            >
              <Star className="w-5 h-5" fill="currentColor" />
            </motion.button>

            <motion.button
              onClick={() => { setExitDirection('right'); onSwipe('like'); }}
              className="w-14 h-14 rounded-full bg-[rgba(225,29,72,0.2)] backdrop-blur-md flex items-center justify-center text-[#E11D48]"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.9 }}
            >
              <Heart className="w-6 h-6" fill="currentColor" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>

    <AnimatePresence>
      {showDetail && (
        <ProfileDetail
          profile={profile}
          onClose={() => setShowDetail(false)}
          onLike={() => { setShowDetail(false); onSwipe('like'); }}
          onDislike={() => { setShowDetail(false); onSwipe('dislike'); }}
        />
      )}
    </AnimatePresence>
    </>
  );
}
