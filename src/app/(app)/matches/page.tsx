'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Check, X } from 'lucide-react';
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

function isRecentlyActive(lastActiveAt: string): boolean {
  return Date.now() - new Date(lastActiveAt).getTime() < 30 * 60 * 1000;
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
      {/* Header */}
      <h1 className="text-2xl font-bold text-[#FAFAFA] px-4 mb-5">Messages</h1>

      {/* Chat Requests */}
      {chatRequests.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#52525B] mb-3 px-4 flex items-center gap-2">
            Demandes
            <span className="min-w-[20px] h-5 rounded-full bg-[#E11D48] text-[10px] font-bold flex items-center justify-center text-white px-1.5">
              {chatRequests.length}
            </span>
          </h2>

          <div className="flex flex-col px-4 gap-2">
            {chatRequests.map((request) => (
              <div
                key={request.id}
                className="bg-[#1A1A1E] border border-white/[0.06] rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[#141416] shrink-0">
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
                    <p className="text-sm text-[#A1A1AA] mt-1 line-clamp-2">
                      {request.message}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleRejectRequest(request)}
                    className="flex-1 py-2.5 rounded-xl bg-[#09090B] border border-white/[0.06] text-[#A1A1AA] text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
                  >
                    <X className="w-4 h-4" />
                    Refuser
                  </button>
                  <button
                    onClick={() => handleAcceptRequest(request)}
                    className="flex-1 py-2.5 rounded-xl bg-[#E11D48] text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
                  >
                    <Check className="w-4 h-4" />
                    Accepter
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.06] my-4 mx-4" />
        </section>
      )}

      {/* New matches — circular avatars with accent ring */}
      {newMatches.length > 0 && (
        <section className="mb-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#52525B] mb-3 px-4">
            Nouveaux matchs
          </h2>

          <div className="overflow-x-auto flex gap-4 px-4 scrollbar-hide">
            {newMatches.map((match) => {
              const recent = isRecent(match.matched_at);
              const active = isRecentlyActive(match.other_profile.last_active_at);
              return (
                <button
                  key={match.id}
                  className="flex flex-col items-center gap-1.5 shrink-0 active:scale-[0.92] transition-transform"
                  onClick={() => router.push(`/matches/${match.id}`)}
                >
                  <div className="relative">
                    {/* Ring */}
                    <div className={`p-[2.5px] rounded-full ${
                      recent ? 'bg-[#E11D48]' : 'bg-white/[0.1]'
                    }`}>
                      <div className="p-[2px] rounded-full bg-[#09090B]">
                        <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-[#141416]">
                          <Image
                            src={getPhoto(match)}
                            alt={match.other_profile.first_name}
                            width={72}
                            height={72}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Online dot */}
                    {active && (
                      <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#22C55E] border-2 border-[#09090B]" />
                    )}
                    {/* NEW badge */}
                    {recent && (
                      <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#E11D48] text-[9px] font-bold text-white">
                        NEW
                      </div>
                    )}
                  </div>
                  <span className="text-[12px] text-[#A1A1AA] text-center truncate max-w-[72px]">
                    {match.other_profile.first_name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Conversations */}
      {conversations.length > 0 && (
        <section>
          {(newMatches.length > 0 || chatRequests.length > 0) && (
            <div className="border-t border-white/[0.06] my-3 mx-4" />
          )}
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#52525B] mb-2 px-4">
            Conversations
          </h2>

          <div className="flex flex-col">
            {conversations.map((match) => {
              const active = isRecentlyActive(match.other_profile.last_active_at);
              return (
                <button
                  key={match.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#141416] transition text-left w-full active:bg-[#141416]"
                  onClick={() => router.push(`/matches/${match.id}`)}
                >
                  {/* Avatar with online dot */}
                  <div className="relative shrink-0">
                    <div className="w-[52px] h-[52px] rounded-full overflow-hidden bg-[#141416]">
                      <Image
                        src={getPhoto(match)}
                        alt={match.other_profile.first_name}
                        width={52}
                        height={52}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {active && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#22C55E] border-2 border-[#09090B]" />
                    )}
                  </div>

                  {/* Name + last message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold text-[15px] ${(match.unread_count ?? 0) > 0 ? 'text-white' : 'text-[#FAFAFA]'}`}>
                          {match.other_profile.first_name}
                        </span>
                        {match.other_profile.is_verified && <VerifiedBadge size="sm" />}
                      </div>
                      {match.last_message && (
                        <span className="text-[11px] text-[#52525B] ml-auto pl-2 shrink-0">
                          {timeAgo(match.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {match.last_message && (
                      <p className={`text-sm truncate mt-0.5 ${(match.unread_count ?? 0) > 0 ? 'text-[#FAFAFA] font-medium' : 'text-[#52525B]'}`}>
                        {match.last_message.type === 'image' ? '📷 Photo' : match.last_message.type === 'audio' ? '🎤 Message vocal' : match.last_message.content}
                      </p>
                    )}
                  </div>

                  {/* Unread badge */}
                  {(match.unread_count ?? 0) > 0 && (
                    <div className="w-5 h-5 rounded-full bg-[#E11D48] text-[10px] font-bold flex items-center justify-center text-white shrink-0">
                      {match.unread_count}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
