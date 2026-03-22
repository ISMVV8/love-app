'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { timeAgo } from '@/lib/utils';
import type { MatchWithProfile } from '@/lib/types';

interface MatchCardProps {
  match: MatchWithProfile;
  onClick: () => void;
  isNew?: boolean;
}

export default function MatchCard({ match, onClick, isNew }: MatchCardProps) {
  const profile = match.other_profile;
  const primaryPhoto = profile.profile_photos.find(p => p.is_primary) || profile.profile_photos[0];

  return (
    <motion.button
      onClick={onClick}
      className="w-full bg-[#141416] border border-white/[0.04] rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-[#1A1A1E] transition-colors"
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-[#141416] ring-1 ring-white/[0.08]">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto.url}
              alt={profile.first_name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white/25">
              {profile.first_name.charAt(0)}
            </div>
          )}
        </div>
        {isNew && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F9A8D4]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white truncate">{profile.first_name}</h3>
          {profile.is_verified && <VerifiedBadge size="sm" />}
          {match.unread_count !== undefined && match.unread_count > 0 && (
            <span className="shrink-0 w-5 h-5 rounded-full bg-[#F9A8D4] text-[10px] font-bold flex items-center justify-center text-[#09090B]">
              {match.unread_count}
            </span>
          )}
        </div>
        {match.last_message ? (
          <p className="text-sm text-white/50 truncate mt-0.5">
            {match.last_message.content}
          </p>
        ) : (
          <p className="text-sm text-[#F9A8D4]/80 mt-0.5 flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            Envoie le premier message !
          </p>
        )}
      </div>

      {/* Time */}
      <div className="text-xs text-white/25 shrink-0">
        {match.last_message ? timeAgo(match.last_message.created_at) : timeAgo(match.matched_at)}
      </div>
    </motion.button>
  );
}
