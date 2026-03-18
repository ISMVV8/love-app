'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/utils';
import type { MatchWithProfile, Profile, ProfilePhoto, Message } from '@/lib/types';

function getPhoto(match: MatchWithProfile): string {
  const photos = match.other_profile.profile_photos;
  const primary = photos.find((p) => p.is_primary);
  return primary?.url ?? photos[0]?.url ?? '/default-avatar.png';
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const currentUserId = session.user.id;
    setUserId(currentUserId);

    // Fetch matches where I'm user_a
    const { data: matchesA } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'active')
      .eq('user_a', currentUserId);

    // Fetch matches where I'm user_b
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
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Realtime subscription for new matches
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

  // Split matches into new (no messages) and conversations (has messages)
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
    return (
      <div className="min-h-[80dvh] flex items-center justify-center">
        <LoadingSpinner text="Chargement des matchs..." />
      </div>
    );
  }

  if (matches.length === 0) {
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
      {/* New matches section */}
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
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  whileTap={{ scale: 0.92 }}
                >
                  {recent ? (
                    <div className="gradient-accent p-[2px] rounded-full">
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
                  ) : (
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-900">
                      <Image
                        src={getPhoto(match)}
                        alt={match.other_profile.first_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
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
          <div className="border-t border-white/5 my-2 mx-4" />
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-4">
            Messages
          </h2>

          <div className="flex flex-col px-4">
            {conversations.map((match, i) => (
              <motion.button
                key={match.id}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition text-left w-full"
                onClick={() => router.push(`/matches/${match.id}`)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                  <Image
                    src={getPhoto(match)}
                    alt={match.other_profile.first_name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">
                      {match.other_profile.first_name}
                    </span>
                    {match.last_message && (
                      <span className="text-xs text-zinc-500 ml-auto pl-2 shrink-0">
                        {timeAgo(match.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  {match.last_message && (
                    <p className="text-sm text-zinc-400 truncate">
                      {match.last_message.content}
                    </p>
                  )}
                </div>

                {/* Unread badge */}
                {(match.unread_count ?? 0) > 0 && (
                  <div className="w-5 h-5 rounded-full bg-pink-500 text-[10px] font-bold flex items-center justify-center text-white shrink-0">
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
