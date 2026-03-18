'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, CheckCheck, Check } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import type { Message, Profile, ProfilePhoto } from '@/lib/types';

function Bubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      layout
    >
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
          isMine
            ? 'gradient-accent text-white rounded-br-sm'
            : 'bg-white/[0.07] text-zinc-100 rounded-bl-sm'
        }`}
      >
        <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
          {message.content}
        </p>
        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isMine ? 'text-white/50' : 'text-zinc-500'}`}>
            {time}
          </span>
          {isMine && (
            message.read_at
              ? <CheckCheck className="w-3 h-3 text-white/50" />
              : <Check className="w-3 h-3 text-white/30" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<(Profile & { profile_photos: ProfilePhoto[] }) | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const uid = session.user.id;
      setUserId(uid);

      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!match) { router.replace('/matches'); return; }

      const otherId = match.user_a === uid ? match.user_b : match.user_a;
      setOtherUserId(otherId);

      const [profileRes, photosRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherId).single(),
        supabase.from('profile_photos').select('*').eq('profile_id', otherId).order('position'),
        supabase.from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true }),
      ]);

      if (profileRes.data) {
        setOtherProfile({
          ...(profileRes.data as Profile),
          profile_photos: (photosRes.data || []) as ProfilePhoto[],
        });
      }

      setMessages((messagesRes.data || []) as Message[]);
      setLoading(false);

      // Mark unread as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('match_id', matchId)
        .eq('sender_id', otherId)
        .is('read_at', null);
    };

    fetchData();
  }, [matchId, router]);

  // Scroll when messages load or change
  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [messages.length, loading, scrollToBottom]);

  // Realtime — listen for new + updated messages
  useEffect(() => {
    if (!matchId || !userId) return;

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => {
          // Already have this message (or optimistic version)?
          if (prev.some(m => m.id === msg.id)) return prev;
          // Replace optimistic
          const cleaned = prev.filter(m => !m.id.startsWith('opt-'));
          return [...cleaned, msg];
        });
        // Auto-read if from other
        if (msg.sender_id !== userId) {
          supabase.from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id)
            .then();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId, userId]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !userId || sending) return;

    setNewMessage('');
    setSending(true);

    // Optimistic
    const optMsg: Message = {
      id: `opt-${Date.now()}`,
      match_id: matchId,
      sender_id: userId,
      content: text,
      type: 'text',
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optMsg]);

    try {
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: userId,
        content: text,
        type: 'text' as const,
      });
      if (error) throw error;

      // Demo: auto-reply from the other person after 2-5s
      if (otherUserId) {
        const delay = 2000 + Math.random() * 3000;
        setTimeout(() => {
          fetch('/api/simulate-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ match_id: matchId, sender_id: otherUserId }),
          }).catch(() => { /* silent — demo feature */ });
        }, delay);
      }
    } catch {
      // Rollback
      setMessages(prev => prev.filter(m => m.id !== optMsg.id));
      setNewMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const photo = otherProfile?.profile_photos.find(p => p.is_primary) || otherProfile?.profile_photos[0];

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[#09090b]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-[#09090b] overflow-hidden"
      style={{
        height: '100dvh',
        position: 'fixed',
        inset: 0,
        zIndex: 50,
      }}
    >
      {/* ═══ Header ═══ */}
      <header
        className="flex items-center gap-3 px-4 pb-3 border-b border-white/5 bg-[#09090b] shrink-0"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={() => router.push('/matches')}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {otherProfile && (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0">
              {photo ? (
                <Image
                  src={photo.url}
                  alt={otherProfile.first_name}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-500">
                  {otherProfile.first_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-white text-[15px] truncate">{otherProfile.first_name}</h2>
              <p className="text-[11px] text-emerald-400">En ligne</p>
            </div>
          </div>
        )}
      </header>

      {/* ═══ Messages ═══ */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-y-contain">
        <div className="px-3 py-3 flex flex-col gap-1.5" style={{ minHeight: '100%', justifyContent: 'flex-end' }}>
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-4xl mb-2">👋</p>
                <p className="text-zinc-500 text-sm">
                  Envoie le premier message à {otherProfile?.first_name} !
                </p>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <Bubble key={msg.id} message={msg} isMine={msg.sender_id === userId} />
            ))}
          </AnimatePresence>

          <div ref={bottomRef} className="h-px shrink-0" />
        </div>
      </div>

      {/* ═══ Input bar ═══ */}
      <div
        className="shrink-0 border-t border-white/5 bg-[#09090b] px-3 pt-2"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message..."
            maxLength={2000}
            autoComplete="off"
            className="flex-1 bg-white/5 border border-white/10 rounded-full py-2.5 px-4 text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-pink-500/40 focus:border-pink-500/30 transition-all text-[16px] leading-normal"
          />
          <motion.button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center shrink-0 disabled:opacity-30"
            whileTap={{ scale: 0.85 }}
          >
            <Send className="w-4.5 h-4.5 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
