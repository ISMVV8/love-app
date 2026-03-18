'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, CheckCheck, Check, Camera, ImageIcon, Mic, X, Loader2, Play, Pause } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import type { Message, Profile, ProfilePhoto } from '@/lib/types';

/* ═══════════════════════════════════════
   Audio player for voice messages
   ═══════════════════════════════════════ */
function AudioPlayer({ src, isMine }: { src: string; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play(); }
    setPlaying(!playing);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMine ? 'bg-white/20' : 'bg-white/10'}`}>
        {playing ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-white/50 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className={`text-[10px] ${isMine ? 'text-white/40' : 'text-zinc-500'}`}>
          {playing ? fmt(currentTime) : fmt(duration)}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Message bubble
   ═══════════════════════════════════════ */
function Bubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const [imgOpen, setImgOpen] = useState(false);

  const bubbleClass = isMine
    ? 'gradient-accent text-white rounded-br-sm'
    : 'bg-white/[0.07] text-zinc-100 rounded-bl-sm';

  return (
    <>
      <motion.div
        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        layout
      >
        <div className={`max-w-[78%] rounded-2xl ${message.type === 'image' ? 'p-1' : 'px-4 py-2.5'} ${bubbleClass}`}>
          {/* Text */}
          {message.type === 'text' && (
            <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
              {message.content}
            </p>
          )}

          {/* Image */}
          {message.type === 'image' && (
            <button onClick={() => setImgOpen(true)} className="block">
              <div className="relative w-[220px] max-w-full aspect-[3/4] rounded-xl overflow-hidden">
                <Image
                  src={message.content}
                  alt="Photo"
                  fill
                  className="object-cover"
                  sizes="220px"
                />
              </div>
            </button>
          )}

          {/* Audio */}
          {message.type === 'audio' && (
            <AudioPlayer src={message.content} isMine={isMine} />
          )}

          <div className={`flex items-center gap-1 mt-0.5 ${message.type === 'image' ? 'px-2 pb-1' : ''} ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] ${isMine ? 'text-white/50' : 'text-zinc-500'}`}>{time}</span>
            {isMine && (
              message.read_at
                ? <CheckCheck className="w-3 h-3 text-white/50" />
                : <Check className="w-3 h-3 text-white/30" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Fullscreen image viewer */}
      <AnimatePresence>
        {imgOpen && message.type === 'image' && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setImgOpen(false)}
          >
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center z-10" style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
              <X className="w-5 h-5 text-white" />
            </button>
            <Image
              src={message.content}
              alt="Photo"
              fill
              className="object-contain p-4"
              sizes="100vw"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════
   Main conversation page
   ═══════════════════════════════════════ */
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

  // Image — two inputs: camera and gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [holdingMic, setHoldingMic] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (!data) return false;

    const msgs = data as Message[];
    const lastId = msgs.length > 0 ? msgs[msgs.length - 1].id : null;

    if (lastId === lastMessageIdRef.current) return false;

    lastMessageIdRef.current = lastId;
    setMessages(msgs);
    return true;
  }, [matchId]);

  // Initial load
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

      const [profileRes, photosRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', otherId).single(),
        supabase.from('profile_photos').select('*').eq('profile_id', otherId).order('position'),
      ]);

      if (profileRes.data) {
        setOtherProfile({
          ...(profileRes.data as Profile),
          profile_photos: (photosRes.data || []) as ProfilePhoto[],
        });
      }

      await fetchMessages();
      setLoading(false);

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('match_id', matchId)
        .eq('sender_id', otherId)
        .is('read_at', null);
    };

    fetchData();
  }, [matchId, router, fetchMessages]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [messages.length, loading, scrollToBottom]);

  // Polling every 2s
  useEffect(() => {
    if (!matchId || loading) return;

    const poll = async () => {
      const hasNew = await fetchMessages();
      if (hasNew && userId && otherProfile?.id) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('match_id', matchId)
          .eq('sender_id', otherProfile.id)
          .is('read_at', null);
      }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [matchId, loading, fetchMessages, userId, otherProfile?.id]);

  // ── Send text ──
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !userId || sending) return;

    setNewMessage('');
    setSending(true);

    try {
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: userId,
        content: text,
        type: 'text' as const,
      });
      if (error) throw error;
      await fetchMessages();
    } catch {
      setNewMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Send image (shared handler for camera + gallery) ──
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return;

    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `messages/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);

      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: userId,
        content: urlData.publicUrl,
        type: 'image' as const,
      });
      if (error) throw error;

      await fetchMessages();
    } catch (err) {
      console.error('Image send failed:', err);
    } finally {
      setUploadingImage(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  // ── Voice recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Find a supported MIME type — Safari uses mp4, Chrome uses webm
      let mimeType = '';
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', ''];
      for (const candidate of candidates) {
        if (candidate === '' || MediaRecorder.isTypeSupported(candidate)) {
          mimeType = candidate;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch {
      // Mic permission denied — silently fail
    }
  };

  const stopRecording = async (cancel = false) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        // Stop all tracks
        recorder.stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        setRecordingTime(0);

        if (cancel || chunksRef.current.length === 0 || !userId) {
          resolve();
          return;
        }

        // Upload voice
        setSending(true);
        try {
          const mime = recorder.mimeType || 'audio/webm';
          const ext = mime.includes('mp4') ? 'm4a' : mime.includes('aac') ? 'aac' : 'webm';
          const blob = new Blob(chunksRef.current, { type: mime });
          const fileName = `messages/${userId}/${Date.now()}-voice.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, blob, { cacheControl: '3600', upsert: false, contentType: mime });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);

          const { error } = await supabase.from('messages').insert({
            match_id: matchId,
            sender_id: userId,
            content: urlData.publicUrl,
            type: 'audio' as const,
          });
          if (error) throw error;

          await fetchMessages();
        } catch (err) {
          console.error('Voice send failed:', err);
        } finally {
          setSending(false);
        }

        resolve();
      };

      recorder.stop();
    });
  };

  // Long-press handlers for mic button
  const handleMicDown = () => {
    longPressRef.current = setTimeout(() => {
      setHoldingMic(true);
      startRecording();
    }, 200);
  };

  const handleMicUp = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    if (holdingMic && recording) {
      setHoldingMic(false);
      stopRecording(false); // Send on release
    }
  };

  const handleMicLeave = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    if (holdingMic && recording) {
      setHoldingMic(false);
      stopRecording(true); // Cancel if finger slides away
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
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
      style={{ height: '100dvh', position: 'fixed', inset: 0, zIndex: 50 }}
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
                <Image src={photo.url} alt={otherProfile.first_name} width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-500">{otherProfile.first_name.charAt(0)}</div>
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
                <p className="text-zinc-500 text-sm">Envoie le premier message à {otherProfile?.first_name} !</p>
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
        {/* Hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />

        {/* Recording mode — fullwidth overlay */}
        <AnimatePresence>
          {recording && (
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              {/* Cancel */}
              <motion.button
                onClick={() => stopRecording(true)}
                className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0"
                whileTap={{ scale: 0.85 }}
              >
                <X className="w-5 h-5 text-red-400" />
              </motion.button>

              {/* Waveform */}
              <div className="flex-1 flex items-center gap-2 bg-white/[0.03] rounded-full px-4 py-2.5">
                <motion.div
                  className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-white text-sm font-mono w-10">{fmtTime(recordingTime)}</span>
                <div className="flex-1 flex items-center gap-[2px] h-6">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-full"
                      style={{ background: `linear-gradient(to top, #ec4899, #8b5cf6)` }}
                      animate={{ height: [3, 6 + Math.random() * 18, 3] }}
                      transition={{ duration: 0.25 + Math.random() * 0.35, repeat: Infinity, delay: i * 0.04 }}
                    />
                  ))}
                </div>
              </div>

              {/* Send vocal */}
              <motion.button
                onClick={() => stopRecording(false)}
                className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/20"
                whileTap={{ scale: 0.85 }}
              >
                <Send className="w-4 h-4 text-white" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Normal mode */}
        {!recording && (
          <div className="flex items-center gap-1.5">
            {/* Camera — opens native camera (Snap style) */}
            <motion.button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadingImage || sending}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center shrink-0 disabled:opacity-30"
              whileTap={{ scale: 0.85 }}
            >
              {uploadingImage ? (
                <Loader2 className="w-[18px] h-[18px] text-pink-400 animate-spin" />
              ) : (
                <Camera className="w-[18px] h-[18px] text-pink-400" />
              )}
            </motion.button>

            {/* Text input */}
            <div className="flex-1 flex items-center bg-white/[0.04] border border-white/[0.08] rounded-full overflow-hidden">
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
                className="flex-1 bg-transparent py-2.5 pl-4 pr-1 text-white placeholder:text-zinc-600 text-[16px] leading-normal outline-none"
              />
              {/* Gallery — inside the input, right side */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingImage || sending}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mr-0.5 hover:bg-white/5 transition-colors disabled:opacity-30"
              >
                <ImageIcon className="w-[18px] h-[18px] text-zinc-500" />
              </button>
            </div>

            {/* Right button: Send (if text) or Mic (if empty, long-press to record) */}
            {newMessage.trim() ? (
              <motion.button
                onClick={handleSend}
                disabled={sending}
                className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center shrink-0 disabled:opacity-30 shadow-lg shadow-pink-500/20"
                whileTap={{ scale: 0.85 }}
              >
                <Send className="w-4 h-4 text-white" />
              </motion.button>
            ) : (
              <motion.button
                onTouchStart={handleMicDown}
                onTouchEnd={handleMicUp}
                onTouchCancel={handleMicLeave}
                onMouseDown={handleMicDown}
                onMouseUp={handleMicUp}
                onMouseLeave={handleMicLeave}
                disabled={sending}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-30 transition-all select-none ${
                  holdingMic
                    ? 'gradient-accent scale-125 shadow-lg shadow-pink-500/30'
                    : 'bg-white/[0.04] border border-white/[0.08]'
                }`}
                whileTap={{ scale: holdingMic ? 1.25 : 0.9 }}
              >
                <Mic className={`w-[18px] h-[18px] ${holdingMic ? 'text-white' : 'text-zinc-500'}`} />
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
