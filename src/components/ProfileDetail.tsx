'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MapPin, MessageCircle, Send } from 'lucide-react';
import { Button } from '@heroui/react/button';
import { Card, CardContent } from '@heroui/react/card';
import VerifiedBadge from '@/components/VerifiedBadge';
import InterestBadge from '@/components/InterestBadge';
import { calculateAge, getCompatibilityColor, getCompatibilityLabel } from '@/lib/utils';
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
        const { data: recentRequests } = await supabase
          .from('chat_requests')
          .select('id')
          .eq('sender_id', session.user.id)
          .gt('created_at', oneDayAgo);

        if (recentRequests && recentRequests.length > 0) {
          setChatLimitReached(true);
        }

        const { data: existingRequest } = await supabase
          .from('chat_requests')
          .select('id')
          .eq('sender_id', session.user.id)
          .eq('receiver_id', profile.id)
          .limit(1);

        if (existingRequest && existingRequest.length > 0) {
          setChatSent(true);
        }
      }
    };
    checkUser();
  }, [profile.id]);

  const sendChatRequest = async () => {
    if (!userId || !chatMessage.trim() || chatSending) return;

    setChatSending(true);
    try {
      const { error } = await supabase.from('chat_requests').insert({
        sender_id: userId,
        receiver_id: profile.id,
        message: chatMessage.trim(),
        status: 'pending',
      });

      if (!error) {
        setChatSent(true);
        setShowChatModal(false);
        setChatMessage('');
      }
    } catch {
      // Error sending chat request
    } finally {
      setChatSending(false);
    }
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
        className="fixed bottom-0 left-0 right-0 z-50 h-[95dvh] rounded-t-3xl bg-[#0C0C0E] overflow-hidden"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Close button */}
        <Button
          isIconOnly
          variant="ghost"
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-[#161618] border border-[#262628] text-white"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Scrollable content */}
        <div ref={scrollRef} className="h-full overflow-y-auto pb-28">
          {/* Photo carousel */}
          <div className="relative">
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {photos.map((photo) => (
                <div key={photo.id} className="w-full flex-shrink-0 snap-center">
                  <div className="relative w-full aspect-[3/4]">
                    <div className="photo-protected-wrapper w-full h-full">
                      <Image
                        src={photo.url}
                        alt={profile.first_name}
                        fill
                        className="object-cover photo-protected"
                        sizes="100vw"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Photo indicators */}
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {photos.map((photo) => (
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
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-white">
                  {profile.first_name}, {age}
                </h2>
                {profile.is_verified && <VerifiedBadge size="md" />}
              </div>
              {profile.location_city && (
                <div className="flex items-center gap-1.5 text-zinc-400 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.location_city}</span>
                </div>
              )}
            </div>

            {/* Compatibility */}
            {score > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(225,29,72,0.1)] text-sm font-semibold text-[#E11D48]">
                <Heart className="w-4 h-4" fill="currentColor" />
                {score}% — {getCompatibilityLabel(score)}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <Card className="bg-[#161618] border border-[#262628] rounded-2xl shadow-none">
                <CardContent>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line p-4">
                    {profile.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Appearance */}
            {appearance.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Apparence
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {appearance.map((attr) => (
                    <Card
                      key={attr.label}
                      className="bg-[#161618] border border-[#262628] rounded-xl shadow-none"
                    >
                      <CardContent>
                        <div className="px-4 py-3 flex items-center gap-2.5">
                          <span className="text-lg">{attr.emoji}</span>
                          <div>
                            <p className="text-xs text-zinc-500">{attr.label}</p>
                            <p className="text-sm text-white font-medium">{attr.value}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
                    <Card
                      key={attr.label}
                      className="bg-[#161618] border border-[#262628] rounded-xl shadow-none"
                    >
                      <CardContent>
                        <div className="px-4 py-3 flex items-center gap-2.5">
                          <span className="text-lg">{attr.emoji}</span>
                          <div>
                            <p className="text-xs text-zinc-500">{attr.label}</p>
                            <p className="text-sm text-white font-medium">{attr.value}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Looking for */}
            {profile.looking_for && (
              <Card className="bg-[#161618] border border-[#262628] rounded-xl shadow-none">
                <CardContent>
                  <div className="px-4 py-3 flex items-center gap-2.5">
                    <span className="text-lg">💕</span>
                    <div>
                      <p className="text-xs text-zinc-500">Recherche</p>
                      <p className="text-sm text-white font-medium">
                        {LOOKING_FOR_LABELS[profile.looking_for]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
        <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-[#0C0C0E] via-[#0C0C0E] to-transparent">
          <div className="flex items-center justify-center gap-4">
            <Button
              isIconOnly
              className="w-14 h-14 rounded-full bg-[#161618] border border-[#262628] text-red-400 hover:bg-red-500/10"
              onClick={onDislike}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Instant Chat button */}
            <Button
              isIconOnly
              isDisabled={chatSent || chatLimitReached}
              className={`w-14 h-14 rounded-full bg-[#161618] border ${
                chatSent
                  ? 'border-emerald-500/30 text-emerald-400'
                  : chatLimitReached
                    ? 'border-[#262628] text-zinc-500 opacity-40'
                    : 'border-[#262628] text-[#A1A1AA] hover:bg-[#1C1C1E]'
              }`}
              onClick={() => setShowChatModal(true)}
            >
              <MessageCircle className="w-6 h-6" fill={chatSent ? 'currentColor' : 'none'} />
            </Button>

            <Button
              isIconOnly
              className="w-14 h-14 rounded-full bg-[#E11D48] text-white"
              onClick={onLike}
            >
              <Heart className="w-6 h-6" fill="currentColor" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Instant Chat Modal */}
      <AnimatePresence>
        {showChatModal && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChatModal(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl bg-[#161618] p-5 pb-8"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="w-12 h-1 bg-[#262628] rounded-full mx-auto mb-5" />
              <h3 className="text-lg font-bold text-white mb-1">
                Envoyer un message à {profile.first_name}
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                1 message gratuit par jour, avant même le match !
              </p>
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Écris ton message..."
                maxLength={500}
                rows={3}
                className="w-full bg-[#0C0C0E] border border-[#262628] rounded-xl p-3 text-white placeholder:text-zinc-600 text-sm resize-none outline-none focus:border-[#E11D48] transition-colors"
              />
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  fullWidth
                  className="py-3 rounded-xl bg-[#0C0C0E] border-[#262628] text-zinc-300 text-sm font-medium"
                  onClick={() => setShowChatModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  fullWidth
                  isDisabled={!chatMessage.trim() || chatSending}
                  className="py-3 rounded-xl bg-[#E11D48] text-white text-sm font-semibold flex items-center justify-center gap-2"
                  onClick={sendChatRequest}
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
