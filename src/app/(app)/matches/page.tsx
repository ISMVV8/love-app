'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import MatchCard from '@/components/MatchCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import type { MatchWithProfile, Profile, ProfilePhoto, Message } from '@/lib/types';

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

    // Sort: unread first, then by last message time
    enriched.sort((a, b) => {
      if ((a.unread_count ?? 0) > 0 && (b.unread_count ?? 0) === 0) return -1;
      if ((a.unread_count ?? 0) === 0 && (b.unread_count ?? 0) > 0) return 1;
      const timeA = a.last_message?.created_at || a.matched_at;
      const timeB = b.last_message?.created_at || b.matched_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

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

  if (loading) {
    return (
      <div className="min-h-[80dvh] flex items-center justify-center">
        <LoadingSpinner text="Chargement des matchs..." />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Heart className="w-6 h-6 text-pink-400" fill="currentColor" />
        Matchs
        {matches.length > 0 && (
          <span className="text-sm font-normal text-zinc-400">({matches.length})</span>
        )}
      </h1>

      {matches.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Pas encore de matchs"
          description="Continue à découvrir des profils. Quand quelqu'un te like en retour, il apparaîtra ici !"
          action={{ label: 'Découvrir', onClick: () => router.push('/discover') }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match) => {
            const isNew = !match.last_message && (Date.now() - new Date(match.matched_at).getTime()) < 24 * 60 * 60 * 1000;
            return (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => router.push(`/matches/${match.id}`)}
                isNew={isNew}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
