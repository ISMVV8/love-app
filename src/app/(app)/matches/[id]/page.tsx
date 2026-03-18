'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import MessageBubble from '@/components/MessageBubble';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import type { Message, Profile, ProfilePhoto } from '@/lib/types';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<(Profile & { profile_photos: ProfilePhoto[] }) | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!match) { router.replace('/matches'); return; }

      const otherUserId = match.user_a === currentUserId ? match.user_b : match.user_a;

      const [profileRes, photosRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherUserId).single(),
        supabase.from('profile_photos').select('*').eq('profile_id', otherUserId).order('position'),
      ]);

      if (profileRes.data) {
        setOtherProfile({
          ...(profileRes.data as Profile),
          profile_photos: (photosRes.data || []) as ProfilePhoto[],
        });
      }

      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      setMessages((messagesData || []) as Message[]);
      setLoading(false);

      // Mark unread as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('match_id', matchId)
        .eq('sender_id', otherUserId)
        .is('read_at', null);
    };

    fetchData();
  }, [matchId, router]);

  // Scroll to bottom on initial load and when messages change
  useEffect(() => {
    if (!loading) {
      scrollToBottom(messages.length > 0);
    }
  }, [messages.length, loading, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    if (!matchId || !userId) return;

    const channel = supabase
      .channel(`messages-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const withoutOptimistic = prev.filter(m => !m.id.startsWith('optimistic-'));
            return [...withoutOptimistic, newMsg];
          });

          if (newMsg.sender_id !== userId) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId, userId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !userId || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      match_id: matchId,
      sender_id: userId,
      content,
      type: 'text',
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: userId,
        content,
        type: 'text' as const,
      });

      if (error) throw error;
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const primaryPhoto = otherProfile?.profile_photos.find(p => p.is_primary) || otherProfile?.profile_photos[0];

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[#09090b]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#09090b]" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="bg-[#09090b]/95 backdrop-blur-xl border-b border-white/5 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 flex items-center gap-3 shrink-0 z-10">
        <motion.button
          onClick={() => router.push('/matches')}
          className="w-10 h-10 rounded-full glass flex items-center justify-center shrink-0"
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        {otherProfile && (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0">
              {primaryPhoto ? (
                <Image
                  src={primaryPhoto.url}
                  alt={otherProfile.first_name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-500">
                  {otherProfile.first_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-white truncate">{otherProfile.first_name}</h2>
              <p className="text-xs text-green-400">En ligne</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages — scrollable middle */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain min-h-0">
        <div className="px-4 py-4 space-y-2 min-h-full flex flex-col justify-end">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-3">👋</p>
                <p className="text-zinc-400 text-sm">
                  Envoie le premier message à {otherProfile?.first_name} !
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.sender_id === userId}
            />
          ))}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input — sticky bottom */}
      <div className="bg-[#09090b]/95 backdrop-blur-xl border-t border-white/5 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shrink-0">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Écris un message..."
            maxLength={2000}
            className="flex-1 bg-white/5 border border-white/10 rounded-full py-3 px-5 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-pink-500/50 focus:border-transparent transition-all text-[16px]"
          />
          <motion.button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center shrink-0 disabled:opacity-40"
            whileTap={{ scale: 0.9 }}
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
