'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { timeAgo, calculateAge } from '@/lib/utils';
import type { MatchWithProfile } from '@/lib/types';

interface MatchCardProps {
  match: MatchWithProfile;
  onClick: () => void;
  isNew?: boolean;
  colorVariant?: 'pink' | 'violet';
}

export default function MatchCard({ match, onClick, isNew, colorVariant = 'pink' }: MatchCardProps) {
  const profile = match.other_profile;
  const primaryPhoto = profile.profile_photos.find(p => p.is_primary) || profile.profile_photos[0];
  const age = calculateAge(profile.birth_date);
  const borderColor = colorVariant === 'pink' ? '#ec4899' : '#8b5cf6';
  const bgColor = colorVariant === 'pink' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(139, 92, 246, 0.2)';

  return (
    <motion.button
      onClick={onClick}
      className="w-full rounded-2xl h-20 px-4 flex items-center gap-3.5 text-left glass-card"
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className="w-[52px] h-[52px] rounded-full overflow-hidden"
          style={{ background: bgColor, border: `2px solid ${borderColor}` }}
        >
          {primaryPhoto ? (
            <Image
              src={primaryPhoto.url}
              alt={profile.first_name}
              width={52}
              height={52}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/25">
              {profile.first_name.charAt(0)}
            </div>
          )}
        </div>
        {isNew && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-white truncate text-[15px]">{profile.first_name}, {age}</h3>
          {profile.is_verified && <VerifiedBadge size="sm" />}
        </div>
        {match.last_message ? (
          <p className={`text-[13px] truncate mt-0.5 ${(match.unread_count ?? 0) > 0 ? 'text-[#ec4899]' : 'text-white/40'}`}>
            {match.last_message.content}
          </p>
        ) : (
          <p className="text-[13px] text-[#ec4899] mt-0.5 flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            Envoie le premier message !
          </p>
        )}
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[11px] text-white/30">
          {match.last_message ? timeAgo(match.last_message.created_at) : timeAgo(match.matched_at)}
        </span>
        {match.unread_count !== undefined && match.unread_count > 0 && (
          <span className="min-w-[22px] h-[22px] rounded-full text-[11px] font-bold flex items-center justify-center text-white px-1" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
            {match.unread_count}
          </span>
        )}
      </div>
    </motion.button>
  );
}
