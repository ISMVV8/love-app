'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Heart, MapPin } from 'lucide-react';
import InterestBadge from '@/components/InterestBadge';
import { calculateAge, getCompatibilityColor, getCompatibilityLabel } from '@/lib/utils';
import {
  GENDER_LABELS,
  LOOKING_FOR_LABELS,
  HAIR_COLOR_LABELS,
  EYE_COLOR_LABELS,
  BODY_TYPE_LABELS,
  SKIN_TONE_LABELS,
  SMOKING_LABELS,
  DRINKING_LABELS,
} from '@/lib/constants';
import type { DiscoverProfile } from '@/lib/types';

interface ProfileDetailProps {
  profile: DiscoverProfile;
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
}

export default function ProfileDetail({ profile, onClose, onLike, onDislike }: ProfileDetailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const photos = profile.profile_photos.sort((a, b) => a.position - b.position);
  const age = calculateAge(profile.birth_date);
  const score = profile.compatibility_score ?? 0;
  const interests = profile.profile_interests || [];

  const appearance: { emoji: string; label: string; value: string }[] = [];
  if (profile.hair_color) appearance.push({ emoji: '💇', label: 'Cheveux', value: HAIR_COLOR_LABELS[profile.hair_color] });
  if (profile.eye_color) appearance.push({ emoji: '👁️', label: 'Yeux', value: EYE_COLOR_LABELS[profile.eye_color] });
  if (profile.skin_tone) appearance.push({ emoji: '🎨', label: 'Teint', value: SKIN_TONE_LABELS[profile.skin_tone] });
  if (profile.body_type) appearance.push({ emoji: '💪', label: 'Corpulence', value: BODY_TYPE_LABELS[profile.body_type] });
  if (profile.height_cm) appearance.push({ emoji: '📏', label: 'Taille', value: `${profile.height_cm} cm` });

  const habits: { emoji: string; label: string; value: string }[] = [];
  if (profile.smoking) habits.push({ emoji: '🚬', label: 'Tabac', value: SMOKING_LABELS[profile.smoking] });
  if (profile.drinking) habits.push({ emoji: '🍷', label: 'Alcool', value: DRINKING_LABELS[profile.drinking] });

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 h-[95dvh] rounded-t-3xl bg-[#09090b] overflow-hidden"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full glass flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div ref={scrollRef} className="h-full overflow-y-auto pb-28">
          {/* Photo carousel */}
          <div className="relative">
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {photos.map((photo) => (
                <div key={photo.id} className="w-full flex-shrink-0 snap-center">
                  <div className="relative w-full aspect-[3/4]">
                    <Image
                      src={photo.url}
                      alt={profile.first_name}
                      fill
                      className="object-cover"
                      sizes="100vw"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Photo indicators */}
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {photos.map((photo, i) => (
                  <div
                    key={photo.id}
                    className="w-2 h-2 rounded-full bg-white/50"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Profile content */}
          <div className="px-5 pt-5 space-y-5">
            {/* Name + location */}
            <div>
              <h2 className="text-3xl font-bold text-white">
                {profile.first_name}, {age}
              </h2>
              {profile.location_city && (
                <div className="flex items-center gap-1.5 text-zinc-400 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.location_city}</span>
                </div>
              )}
            </div>

            {/* Compatibility */}
            {score > 0 && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-semibold ${getCompatibilityColor(score)}`}>
                <Heart className="w-4 h-4" fill="currentColor" />
                {score}% — {getCompatibilityLabel(score)}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <div className="glass rounded-2xl p-4">
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Appearance */}
            {appearance.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Apparence
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {appearance.map((attr) => (
                    <div
                      key={attr.label}
                      className="glass rounded-xl px-4 py-3 flex items-center gap-2.5"
                    >
                      <span className="text-lg">{attr.emoji}</span>
                      <div>
                        <p className="text-xs text-zinc-500">{attr.label}</p>
                        <p className="text-sm text-white font-medium">{attr.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Habits */}
            {habits.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Habitudes
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {habits.map((attr) => (
                    <div
                      key={attr.label}
                      className="glass rounded-xl px-4 py-3 flex items-center gap-2.5"
                    >
                      <span className="text-lg">{attr.emoji}</span>
                      <div>
                        <p className="text-xs text-zinc-500">{attr.label}</p>
                        <p className="text-sm text-white font-medium">{attr.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Looking for */}
            {profile.looking_for && (
              <div className="glass rounded-xl px-4 py-3 flex items-center gap-2.5">
                <span className="text-lg">💕</span>
                <div>
                  <p className="text-xs text-zinc-500">Recherche</p>
                  <p className="text-sm text-white font-medium">
                    {LOOKING_FOR_LABELS[profile.looking_for]}
                  </p>
                </div>
              </div>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  {"Centres d'intérêt"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {interests.map((pi) => (
                    <InterestBadge
                      key={pi.interest_id}
                      name={pi.interests.name}
                      emoji={pi.interests.emoji}
                      category={pi.interests.category}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky action buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent">
          <div className="flex items-center justify-center gap-5">
            <motion.button
              onClick={onDislike}
              className="w-16 h-16 rounded-full glass border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
              whileTap={{ scale: 0.85 }}
            >
              <X className="w-7 h-7" />
            </motion.button>

            <motion.button
              onClick={onLike}
              className="w-16 h-16 rounded-full gradient-accent flex items-center justify-center text-white shadow-lg shadow-pink-500/30"
              whileTap={{ scale: 0.85 }}
            >
              <Heart className="w-7 h-7" fill="currentColor" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
