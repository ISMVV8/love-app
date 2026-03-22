'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { MapPin, Heart, X, Star, ChevronUp } from 'lucide-react';
import ProfileDetail from '@/components/ProfileDetail';
import VerifiedBadge from '@/components/VerifiedBadge';
import InterestBadge from '@/components/InterestBadge';
import { calculateAge, getCompatibilityColor, getCompatibilityLabel } from '@/lib/utils';
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
  const score = profile.compatibility_score ?? 0;
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
      <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-[#161618] shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
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

        {/* Photo indicators */}
        {photos.length > 1 && (
          <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-20">
            {photos.map((_, i) => (
              <div
                key={photos[i].id}
                className={`h-1 rounded-full flex-1 transition-colors ${
                  i === photoIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Like overlay — clean text badge */}
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

        {/* Nope overlay — clean text badge */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          {/* Compatibility */}
          {score > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(225,29,72,0.1)] text-xs font-semibold mb-3 text-[#E11D48]">
              <Heart className="w-3.5 h-3.5" fill="currentColor" />
              {score}% — {getCompatibilityLabel(score)}
            </div>
          )}

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-white">
                  {profile.first_name}, {age}
                </h2>
                {profile.is_verified && <VerifiedBadge size="md" />}
              </div>
              {profile.location_city && (
                <div className="flex items-center gap-1.5 text-zinc-300 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.location_city}</span>
                </div>
              )}
            </div>

            {/* Info button */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
              className="w-9 h-9 rounded-full bg-[#161618]/80 backdrop-blur-sm border border-[#262628] flex items-center justify-center"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-zinc-300 mt-3 line-clamp-2 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {interests.slice(0, 5).map((pi) => (
                <InterestBadge
                  key={pi.interest_id}
                  name={pi.interests.name}
                  emoji={pi.interests.emoji}
                  category={pi.interests.category}
                  size="sm"
                />
              ))}
              {interests.length > 5 && (
                <span className="px-2.5 py-1 text-xs text-zinc-400">
                  +{interests.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                onClick={() => { setExitDirection('left'); onSwipe('dislike'); }}
                className="w-[60px] h-[60px] rounded-full bg-[#161618] border border-[#262628] flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
                whileTap={{ scale: 0.85 }}
              >
                <X className="w-7 h-7" strokeWidth={2.5} />
              </motion.button>
              <span className="text-[10px] text-zinc-500 font-medium">Passer</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                onClick={() => onSwipe('super_like')}
                className="w-[52px] h-[52px] rounded-full bg-[#161618] border border-[#262628] flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors"
                whileTap={{ scale: 0.85 }}
              >
                <Star className="w-6 h-6" fill="currentColor" />
              </motion.button>
              <span className="text-[10px] text-zinc-500 font-medium">Super</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                onClick={() => { setExitDirection('right'); onSwipe('like'); }}
                className="w-[60px] h-[60px] rounded-full bg-[#E11D48] flex items-center justify-center text-white"
                whileTap={{ scale: 0.85 }}
              >
                <Heart className="w-7 h-7" fill="currentColor" />
              </motion.button>
              <span className="text-[10px] text-zinc-500 font-medium">Liker</span>
            </div>
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
