'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import VerifiedBadge from '@/components/VerifiedBadge';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/utils';
import type { MatchWithProfile, Profile, ProfilePhoto, Message, ChatRequest } from '@/lib/types';

interface ChatRequestWithProfile extends ChatRequest {
  sender_profile: Profile & { profile_photos: ProfilePhoto[] };
}

function getPhoto(match: MatchWithProfile): string {
  const photos = match.other_profile.profile_photos;
  const primary = photos.find((p) => p.is_primary);
  return primary?.url ?? photos[0]?.url ?? '/default-avatar.png';
}

function getProfilePhoto(profile: Profile & { profile_photos: ProfilePhoto[] }): string {
  const primary = profile.profile_photos.find((p) => p.is_primary);
  return primary?.url ?? profile.profile_photos[0]?.url ?? '/default-avatar.png';
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [chatRequests, setChatRequests] = useState<ChatRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchChatRequests = useCallback(async (currentUserId: string) => {
    const { data: requests } = await supabase
      .from('chat_requests')
      .select('*')
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!requests || requests.length === 0) {
      setChatRequests([]);
      return;
    }

    const enriched: ChatRequestWithProfile[] = [];
    for (const req of requests) {
      const [profileRes, photosRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', req.sender_id).single(),
        supabase.from('profile_photos').select('*').eq('profile_id', req.sender_id).order('position'),
      ]);

      if (profileRes.data) {
        enriched.push({
          ...req,
          sender_profile: {
            ...(profileRes.data as Profile),
            profile_photos: (photosRes.data || []) as ProfilePhoto[],
          },
        });
      }
    }

    setChatRequests(enriched);
  }, []);

  const fetchMatches = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const currentUserId = session.user.id;
    setUserId(currentUserId);

    await fetchChatRequests(currentUserId);

    const { data: blockedByMe } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', currentUserId);
    const { data: blockedMe } = await supabase
      .from('blocks')
      .select('blocker_id')
      .eq('blocked_id', currentUserId);

    const blockedIds = new Set([
      ...(blockedByMe || []).map(b => b.blocked_id),
      ...(blockedMe || []).map(b => b.blocker_id),
    ]);

    const { data: matchesA } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'active')
      .eq('user_a', currentUserId);

    const { data: matchesB } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'active')
      .eq('user_b', currentUserId);

    const allMatches = [...(matchesA || []), ...(matchesB || [])];

    if (allMatches.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const enriched: MatchWithProfile[] = [];

    for (const match of allMatches) {
      const otherUserId = match.user_a === currentUserId ? match.user_b : match.user_a;

      if (blockedIds.has(otherUserId)) continue;

      const [profileRes, photosRes, messagesRes, unreadRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherUserId).single(),
        supabase.from('profile_photos').select('*').eq('profile_id', otherUserId).order('position'),
        supabase.from('messages').select('*').eq('match_id', match.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('messages').select('id', { count: 'exact' }).eq('match_id', match.id).eq('sender_id', otherUserId).is('read_at', null),
      ]);

      if (profileRes.data) {
        enriched.push({
          ...match,
          other_profile: {
            ...(profileRes.data as Profile),
            profile_photos: (photosRes.data || []) as ProfilePhoto[],
          },
          last_message: (messagesRes.data?.[0] as Message | undefined) || null,
          unread_count: unreadRes.count || 0,
        });
      }
    }

    setMatches(enriched);
    setLoading(false);
  }, [fetchChatRequests]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchMatches]);

  const handleAcceptRequest = async (request: ChatRequestWithProfile) => {
    if (!userId) return;

    try {
      await supabase
        .from('chat_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      await supabase.from('swipes').upsert({
        swiper_id: userId,
        swiped_id: request.sender_id,
        action: 'like',
      }, { onConflict: 'swiper_id,swiped_id' });

      await supabase.from('swipes').upsert({
        swiper_id: request.sender_id,
        swiped_id: userId,
        action: 'like',
      }, { onConflict: 'swiper_id,swiped_id' });

      setChatRequests(prev => prev.filter(r => r.id !== request.id));
      await fetchMatches();
    } catch {
      // Error accepting request
    }
  };

  const handleRejectRequest = async (request: ChatRequestWithProfile) => {
    try {
      await supabase
        .from('chat_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      setChatRequests(prev => prev.filter(r => r.id !== request.id));
    } catch {
      // Error rejecting request
    }
  };

  const newMatches = useMemo(
    () =>
      matches
        .filter((m) => !m.last_message)
        .sort((a, b) => new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime()),
    [matches]
  );

  const conversations = useMemo(
    () =>
      matches
        .filter((m) => !!m.last_message)
        .sort((a, b) => {
          if ((a.unread_count ?? 0) > 0 && (b.unread_count ?? 0) === 0) return -1;
          if ((a.unread_count ?? 0) === 0 && (b.unread_count ?? 0) > 0) return 1;
          const timeA = a.last_message?.created_at || a.matched_at;
          const timeB = b.last_message?.created_at || b.matched_at;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        }),
    [matches]
  );

  if (loading) {
    return <SkeletonLoader variant="matches" />;
  }

  if (matches.length === 0 && chatRequests.length === 0) {
    return (
      <div className="px-4 pt-4">
        <EmptyState
          icon={Heart}
          title="Pas encore de matchs"
          description="Continue à découvrir des profils. Quand quelqu'un te like en retour, il apparaîtra ici !"
          action={{ label: 'Découvrir', onClick: () => router.push('/discover') }}
        />
      </div>
    );
  }

  const isRecent = (matchedAt: string) =>
    Date.now() - new Date(matchedAt).getTime() < 24 * 60 * 60 * 1000;

  return (
    <div className="pt-4 pb-24">
      {/* Chat Requests Section */}
      <AnimatePresence>
        {chatRequests.length > 0 && (
          <motion.section
            className="mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Demandes de message
              <span className="ml-auto w-5 h-5 rounded-full bg-[#E11D48] text-[10px] font-bold flex items-center justify-center text-white">
                {chatRequests.length}
              </span>
            </h2>

            <div className="flex flex-col px-4 gap-2">
              {chatRequests.map((request, i) => (
                <motion.div
                  key={request.id}
                  className="bg-[#161618] border border-[#262628] rounded-2xl p-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                      <Image
                        src={getProfilePhoto(request.sender_profile)}
                        alt={request.sender_profile.first_name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-sm">
                          {request.sender_profile.first_name}
                        </span>
                        {request.sender_profile.is_verified && <VerifiedBadge size="sm" />}
                      </div>
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                        {request.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <motion.button
                      onClick={() => handleRejectRequest(request)}
                      className="flex-1 py-2.5 rounded-xl bg-[#0C0C0E] border border-[#262628] text-zinc-300 text-sm font-medium flex items-center justify-center gap-1.5"
                      whileTap={{ scale: 0.97 }}
                    >
                      <X className="w-4 h-4" />
                      Refuser
                    </motion.button>
                    <motion.button
                      onClick={() => handleAcceptRequest(request)}
                      className="flex-1 py-2.5 rounded-xl bg-[#E11D48] text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                      whileTap={{ scale: 0.97 }}
                    >
                      <Check className="w-4 h-4" />
                      Accepter
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="border-t border-[#262628] my-3 mx-4" />
          </motion.section>
        )}
      </AnimatePresence>

      {/* New matches — circle avatars with accent border */}
      {newMatches.length > 0 && (
        <section className="mb-2">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-4">
            Nouveaux matchs
          </h2>

          <div
            className="overflow-x-auto flex gap-4 px-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            {newMatches.map((match, i) => {
              const recent = isRecent(match.matched_at);
              return (
                <motion.button
                  key={match.id}
                  className="flex flex-col items-center gap-1.5 snap-start shrink-0"
                  onClick={() => router.push(`/matches/${match.id}`)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  whileTap={{ scale: 0.92 }}
                >
                  {/* Simple border ring — accent for new, subtle for old */}
                  <div className={`p-[2.5px] rounded-full ${
                    recent
                      ? 'bg-[#E11D48]'
                      : 'bg-[#262628]'
                  }`}>
                    <div className="p-[2px] rounded-full bg-[#0C0C0E]">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-900">
                        <Image
                          src={getPhoto(match)}
                          alt={match.other_profile.first_name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-300 text-center truncate max-w-[64px]">
                    {match.other_profile.first_name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* Conversations section */}
      {conversations.length > 0 && (
        <section>
          <div className="border-t border-[#262628] my-2 mx-4" />
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-4">
            Messages
          </h2>

          <div className="flex flex-col px-4">
            {conversations.map((match, i) => (
              <motion.button
                key={match.id}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#161618] transition text-left w-full"
                onClick={() => router.push(`/matches/${match.id}`)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-13 h-13 rounded-full overflow-hidden bg-zinc-800 shrink-0" style={{ width: 52, height: 52 }}>
                  <Image
                    src={getPhoto(match)}
                    alt={match.other_profile.first_name}
                    width={52}
                    height={52}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold text-[15px] ${(match.unread_count ?? 0) > 0 ? 'text-white' : 'text-zinc-200'}`}>
                        {match.other_profile.first_name}
                      </span>
                      {match.other_profile.is_verified && <VerifiedBadge size="sm" />}
                    </div>
                    {match.last_message && (
                      <span className="text-[11px] text-zinc-500 ml-auto pl-2 shrink-0">
                        {timeAgo(match.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  {match.last_message && (
                    <p className={`text-sm truncate mt-0.5 ${(match.unread_count ?? 0) > 0 ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
                      {match.last_message.type === 'image' ? '📷 Photo' : match.last_message.type === 'audio' ? '🎤 Message vocal' : match.last_message.content}
                    </p>
                  )}
                </div>

                {(match.unread_count ?? 0) > 0 && (
                  <div className="w-5 h-5 rounded-full bg-[#E11D48] text-[10px] font-bold flex items-center justify-center text-white shrink-0">
                    {match.unread_count}
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
