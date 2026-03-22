'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MapPin, MessageCircle, Send } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import InterestBadge from '@/components/InterestBadge';
import { calculateAge, getCompatibilityLabel } from '@/lib/utils';
import {
  LOOKING_FOR_LABELS,
  HAIR_COLOR_LABELS,
  EYE_COLOR_LABELS,
  BODY_TYPE_LABELS,
  SKIN_TONE_LABELS,
  SMOKING_LABELS,
  DRINKING_LABELS,
} from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { DiscoverProfile } from '@/lib/types';

interface ProfileDetailProps {
  profile: DiscoverProfile;
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
}

export default function ProfileDetail({ profile, onClose, onLike, onDislike }: ProfileDetailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatSent, setChatSent] = useState(false);
  const [chatLimitReached, setChatLimitReached] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentRequests } = await supabase.from('chat_requests').select('id').eq('sender_id', session.user.id).gt('created_at', oneDayAgo);
        if (recentRequests && recentRequests.length > 0) setChatLimitReached(true);
        const { data: existingRequest } = await supabase.from('chat_requests').select('id').eq('sender_id', session.user.id).eq('receiver_id', profile.id).limit(1);
        if (existingRequest && existingRequest.length > 0) setChatSent(true);
      }
    };
    checkUser();
  }, [profile.id]);

  const sendChatRequest = async () => {
    if (!userId || !chatMessage.trim() || chatSending) return;
    setChatSending(true);
    try {
      const { error } = await supabase.from('chat_requests').insert({ sender_id: userId, receiver_id: profile.id, message: chatMessage.trim(), status: 'pending' });
      if (!error) { setChatSent(true); setShowChatModal(false); setChatMessage(''); }
    } catch { /* Error */ } finally { setChatSending(false); }
  };

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
      <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />

      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-[#09090B] overflow-hidden"
        style={{ height: '80dvh' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-50 w-9 h-9 rounded-full bg-[#141416] border border-white/[0.06] flex items-center justify-center text-white">
          <X className="w-4 h-4" />
        </button>

        <div ref={scrollRef} className="h-full overflow-y-auto pb-28">
          {/* Photo carousel */}
          <div className="relative">
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {photos.map((photo) => (
                <div key={photo.id} className="w-full flex-shrink-0 snap-center">
                  <div className="relative w-full aspect-[3/4]">
                    <div className="photo-protected-wrapper w-full h-full">
                      <Image src={photo.url} alt={profile.first_name} fill className="object-cover photo-protected" sizes="100vw" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {photos.map((photo) => (
                  <div key={photo.id} className="w-2 h-2 rounded-full bg-white/50" />
                ))}
              </div>
            )}
          </div>

          <div className="px-5 pt-5 space-y-5">
            {/* Name */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-[28px] font-bold text-white">{profile.first_name}</h2>
                <span className="text-[28px] font-light text-white/90">{age}</span>
                {profile.is_verified && <VerifiedBadge size="md" />}
              </div>
              {profile.location_city && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 mt-2">
                  <MapPin className="w-3 h-3 text-white/70" />
                  <span className="text-[12px] text-white/80">{profile.location_city}</span>
                </div>
              )}
            </div>

            {/* Compatibility */}
            {score > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(225,29,72,0.12)] text-sm font-semibold text-[#E11D48]">
                <Heart className="w-4 h-4" fill="currentColor" />
                {score}% — {getCompatibilityLabel(score)}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4">
                <p className="text-sm text-[#A1A1AA] leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {/* Appearance */}
            {appearance.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52525B] mb-3">Apparence</h3>
                <div className="grid grid-cols-2 gap-2">
                  {appearance.map((attr) => (
                    <div key={attr.label} className="bg-[#141416] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-2.5">
                      <span className="text-lg">{attr.emoji}</span>
                      <div>
                        <p className="text-[12px] text-[#52525B]">{attr.label}</p>
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
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52525B] mb-3">Habitudes</h3>
                <div className="grid grid-cols-2 gap-2">
                  {habits.map((attr) => (
                    <div key={attr.label} className="bg-[#141416] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-2.5">
                      <span className="text-lg">{attr.emoji}</span>
                      <div>
                        <p className="text-[12px] text-[#52525B]">{attr.label}</p>
                        <p className="text-sm text-white font-medium">{attr.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Looking for */}
            {profile.looking_for && (
              <div className="bg-[#141416] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-2.5">
                <span className="text-lg">💕</span>
                <div>
                  <p className="text-[12px] text-[#52525B]">Recherche</p>
                  <p className="text-sm text-white font-medium">{LOOKING_FOR_LABELS[profile.looking_for]}</p>
                </div>
              </div>
            )}

            {/* Interests */}
            {interests.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52525B] mb-3">{"Centres d'intérêt"}</h3>
                <div className="flex flex-wrap gap-2">
                  {interests.map((pi) => (
                    <InterestBadge key={pi.interest_id} name={pi.interests.name} emoji={pi.interests.emoji} category={pi.interests.category} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky action buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-[#09090B] via-[#09090B] to-transparent">
          <div className="flex items-center justify-center gap-4">
            <motion.button onClick={onDislike} className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} whileTap={{ scale: 0.85 }}>
              <X className="w-6 h-6" />
            </motion.button>

            <motion.button
              onClick={() => setShowChatModal(true)}
              disabled={chatSent || chatLimitReached}
              className={`w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${chatSent ? 'bg-emerald-500/20 text-emerald-400' : chatLimitReached ? 'bg-white/5 text-[#52525B] opacity-40' : 'bg-white/10 text-[#A1A1AA]'}`}
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
              whileTap={!chatSent && !chatLimitReached ? { scale: 0.85 } : undefined}
            >
              <MessageCircle className="w-6 h-6" fill={chatSent ? 'currentColor' : 'none'} />
            </motion.button>

            <motion.button onClick={onLike} className="w-14 h-14 rounded-full bg-[rgba(225,29,72,0.2)] backdrop-blur-md flex items-center justify-center text-[#E11D48]" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} whileTap={{ scale: 0.85 }}>
              <Heart className="w-6 h-6" fill="currentColor" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Chat Request Modal */}
      <AnimatePresence>
        {showChatModal && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowChatModal(false)} />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl bg-[#141416] p-5 pb-8"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5" />
              <h3 className="text-lg font-bold text-white mb-1">
                Envoyer un message à {profile.first_name}
              </h3>
              <p className="text-[12px] text-[#52525B] mb-4">
                1 message gratuit par jour, avant même le match !
              </p>
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Écris ton message..."
                maxLength={500}
                rows={3}
                className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-white placeholder:text-[#52525B] text-sm resize-none outline-none focus:border-[#E11D48] transition-colors"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowChatModal(false)} className="flex-1 py-3 rounded-xl bg-[#09090B] border border-white/[0.06] text-[#A1A1AA] text-sm font-medium">
                  Annuler
                </button>
                <motion.button
                  onClick={sendChatRequest}
                  disabled={!chatMessage.trim() || chatSending}
                  className="flex-1 py-3 rounded-xl bg-[#E11D48] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                  whileTap={{ scale: 0.97 }}
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
