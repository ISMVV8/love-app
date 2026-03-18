'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { MapPin, Heart, X, Star, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import ProfileDetail from '@/components/ProfileDetail';
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
    return null; // Don't render the card behind at all
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
            : {}
      }
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden bg-zinc-900 shadow-2xl">
        {/* Photo */}
        {currentPhoto && (
          <Image
            src={currentPhoto.url}
            alt={profile.first_name}
            fill
            className="object-cover"
            priority
          />
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

        {/* Like/Dislike overlays */}
        <motion.div
          className="absolute top-20 left-6 z-20 border-4 border-green-400 rounded-xl px-4 py-2 -rotate-12"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-green-400 font-extrabold text-3xl">LIKE</span>
        </motion.div>

        <motion.div
          className="absolute top-20 right-6 z-20 border-4 border-red-400 rounded-xl px-4 py-2 rotate-12"
          style={{ opacity: dislikeOpacity }}
        >
          <span className="text-red-400 font-extrabold text-3xl">NOPE</span>
        </motion.div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Profile info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          {/* Compatibility */}
          {score > 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-semibold mb-3 ${getCompatibilityColor(score)}`}>
              <Heart className="w-3.5 h-3.5" fill="currentColor" />
              {score}% — {getCompatibilityLabel(score)}
            </div>
          )}

          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white">
                {profile.first_name}, {age}
              </h2>
              {profile.location_city && (
                <div className="flex items-center gap-1.5 text-zinc-300 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.location_city}</span>
                </div>
              )}
            </div>

            {/* Info + Photo nav arrows */}
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
                className="w-8 h-8 rounded-full glass flex items-center justify-center"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePhotoNav('prev'); }}
                    disabled={photoIndex === 0}
                    className="w-8 h-8 rounded-full glass flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePhotoNav('next'); }}
                    disabled={photoIndex === photos.length - 1}
                    className="w-8 h-8 rounded-full glass flex items-center justify-center disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
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
          <div className="flex items-center justify-center gap-5 mt-5">
            <motion.button
              onClick={() => { setExitDirection('left'); onSwipe('dislike'); }}
              className="w-16 h-16 rounded-full glass border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
              whileTap={{ scale: 0.85 }}
            >
              <X className="w-7 h-7" />
            </motion.button>

            <motion.button
              onClick={() => onSwipe('super_like')}
              className="w-14 h-14 rounded-full glass border border-blue-500/30 flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-colors"
              whileTap={{ scale: 0.85 }}
            >
              <Star className="w-6 h-6" fill="currentColor" />
            </motion.button>

            <motion.button
              onClick={() => { setExitDirection('right'); onSwipe('like'); }}
              className="w-16 h-16 rounded-full gradient-accent flex items-center justify-center text-white shadow-lg shadow-pink-500/30"
              whileTap={{ scale: 0.85 }}
            >
              <Heart className="w-7 h-7" fill="currentColor" />
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
