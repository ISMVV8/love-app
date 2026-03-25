'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { MapPin, Heart, X, Star, ChevronUp } from 'lucide-react';
import ProfileDetail from '@/components/ProfileDetail';
import VerifiedBadge from '@/components/VerifiedBadge';
import { calculateAge } from '@/lib/utils';
import { SWIPE_THRESHOLD, INTEREST_CATEGORIES } from '@/lib/constants';
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
      <div className="relative w-full h-full rounded-3xl overflow-hidden bg-[#27272a]" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
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

        {/* Photo bar indicators at top */}
        {photos.length > 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1 z-20 w-[200px]">
            {photos.map((_, i) => (
              <div
                key={photos[i].id}
                className={`h-[3px] rounded-full flex-1 transition-all duration-300 ${
                  i === photoIndex ? 'bg-white' : 'bg-white/25'
                }`}
              />
            ))}
          </div>
        )}

        {/* Compatibility badge */}
        {profile.compatibility_score != null && profile.compatibility_score > 0 && (
          <div className="absolute top-5 left-5 z-20 flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
            <Heart className="w-3.5 h-3.5 text-[#22c55e]" fill="currentColor" />
            <span className="text-[13px] font-semibold text-[#22c55e]">
              {Math.round(profile.compatibility_score)}%
            </span>
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

        {/* Gradient overlay — bottom half */}
        <div className="absolute inset-x-0 bottom-0 h-[280px]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)' }} />

        {/* Profile info on gradient */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Name + Age + Verified */}
          <div className="flex items-center gap-2.5 mb-1.5">
            <h2 className="text-[28px] font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {profile.first_name}, {age}
            </h2>
            {profile.is_verified && <VerifiedBadge size="md" />}
          </div>

          {/* Location */}
          {profile.location_city && (
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-[#a1a1aa]" />
              <span className="text-[13px] text-[#a1a1aa]">{profile.location_city}</span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className="text-[14px] text-white/80 line-clamp-2 leading-relaxed mb-3">
              {profile.bio}
            </p>
          )}

          {/* Interest tags with colors */}
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {interests.slice(0, 4).map((pi) => {
                const color = INTEREST_CATEGORIES[pi.interests.category] || '#ec4899';
                return (
                  <span
                    key={pi.interest_id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[12px] font-medium"
                    style={{
                      background: `${color}22`,
                      border: `1px solid ${color}44`,
                      color: `${color}`,
                    }}
                  >
                    {pi.interests.emoji && <span className="text-[11px]">{pi.interests.emoji}</span>}
                    {pi.interests.name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Voir plus button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px] text-white/70 mb-5 active:scale-95 transition-transform"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Voir plus
          </button>

          {/* Action buttons */}
          <div className="flex items-center justify-between px-6">
            {/* Pass (X) — red border */}
            <motion.button
              onClick={() => { setExitDirection('left'); onSwipe('dislike'); }}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(24, 24, 27, 0.8)',
                border: '2px solid #ef4444',
              }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6 text-[#ef4444]" strokeWidth={2.5} />
            </motion.button>

            {/* Super Like (Star) — blue border */}
            <motion.button
              onClick={() => onSwipe('super_like')}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(24, 24, 27, 0.8)',
                border: '2px solid #3b82f6',
              }}
              whileTap={{ scale: 0.9 }}
            >
              <Star className="w-5 h-5 text-[#3b82f6]" />
            </motion.button>

            {/* Like (Heart) — gradient fill */}
            <motion.button
              onClick={() => { setExitDirection('right'); onSwipe('like'); }}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}
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
