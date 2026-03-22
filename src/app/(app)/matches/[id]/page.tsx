'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, CheckCheck, Check, Camera, ImageIcon, Mic, X, Loader2, Play, Pause, MoreVertical, ShieldAlert, Ban } from 'lucide-react';
import { Button } from '@heroui/react/button';
import { Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalHeader, ModalHeading, ModalBody, ModalFooter } from '@heroui/react/modal';
import { useOverlayState } from '@heroui/react';
import VerifiedBadge from '@/components/VerifiedBadge';
import SkeletonLoader from '@/components/SkeletonLoader';
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
   Typing indicator
   ═══════════════════════════════════════ */
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#161618] border border-[#262628] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-zinc-400"
            animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Message bubble — WhatsApp style
   ═══════════════════════════════════════ */
function Bubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const [imgOpen, setImgOpen] = useState(false);

  const bubbleClass = isMine
    ? 'bg-[#E11D48] text-white rounded-2xl rounded-br-[4px]'
    : 'bg-[#161618] border border-[#262628] text-[#F4F4F5] rounded-2xl rounded-bl-[4px]';

  return (
    <>
      <motion.div
        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        layout
      >
        <div className={`max-w-[78%] ${message.type === 'image' ? 'p-1' : 'px-4 py-2.5'} ${bubbleClass}`}>
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
  const [showMenu, setShowMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const blockModalState = useOverlayState({ isOpen: showBlockConfirm, onOpenChange: setShowBlockConfirm });

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleBlockUser = async () => {
    if (!userId || !otherProfile) return;

    try {
      await supabase.from('blocks').insert({
        blocker_id: userId,
        blocked_id: otherProfile.id,
      });

      await supabase
        .from('matches')
        .update({ status: 'unmatched' })
        .eq('id', matchId);

      router.replace('/matches');
    } catch {
      // Error blocking user
    }
  };

  const handleReportUser = async () => {
    if (!userId || !otherProfile) return;

    try {
      await supabase.from('reports').insert({
        reporter_id: userId,
        reported_id: otherProfile.id,
        reason: 'inappropriate',
      });

      setShowMenu(false);
    } catch {
      // Error reporting
    }
  };

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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
      // Mic permission denied
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
        recorder.stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        setRecordingTime(0);

        if (cancel || chunksRef.current.length === 0 || !userId) {
          resolve();
          return;
        }

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
      stopRecording(false);
    }
  };

  const handleMicLeave = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    if (holdingMic && recording) {
      setHoldingMic(false);
      stopRecording(true);
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const photo = otherProfile?.profile_photos.find(p => p.is_primary) || otherProfile?.profile_photos[0];

  if (loading) {
    return <SkeletonLoader variant="conversation" />;
  }

  return (
    <div
      className="flex flex-col bg-[#0C0C0E] overflow-hidden"
      style={{ height: '100dvh', position: 'fixed', inset: 0, zIndex: 50 }}
    >
      {/* ═══ Header ═══ */}
      <header
        className="flex items-center gap-3 px-4 pb-3 border-b border-[#262628] bg-[#0C0C0E] shrink-0"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <Button
          isIconOnly
          variant="ghost"
          className="w-9 h-9 rounded-full bg-[#161618] border border-[#262628] shrink-0"
          onPress={() => router.push('/matches')}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Button>
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
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-white text-[15px] truncate">{otherProfile.first_name}</h2>
                {otherProfile.is_verified && <VerifiedBadge size="sm" />}
              </div>
              <p className="text-[11px] text-[#10B981]">En ligne</p>
            </div>
          </div>
        )}

        {/* Menu button */}
        <div className="relative">
          <Button
            isIconOnly
            variant="ghost"
            className="w-9 h-9 rounded-full bg-[#161618] border border-[#262628] shrink-0"
            onPress={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="w-5 h-5 text-white" />
          </Button>

          <AnimatePresence>
            {showMenu && (
              <>
                <motion.div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
                <motion.div
                  className="absolute right-0 top-12 z-50 w-48 rounded-xl bg-[#1C1C1E] border border-[#262628] overflow-hidden shadow-xl"
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    onClick={() => { setShowMenu(false); handleReportUser(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-[#262628] transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
                    Signaler
                  </button>
                  <div className="border-t border-[#262628]" />
                  <button
                    onClick={() => { setShowMenu(false); setShowBlockConfirm(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-[#262628] transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    Bloquer
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Block confirmation modal — HeroUI Modal */}
      <Modal state={blockModalState}>
        <ModalBackdrop className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <ModalContainer className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <ModalDialog className="rounded-2xl bg-[#1C1C1E] border border-[#262628] p-5 w-full max-w-sm">
            <ModalHeader>
              <ModalHeading className="text-lg font-bold text-white">
                Bloquer {otherProfile?.first_name} ?
              </ModalHeading>
            </ModalHeader>
            <ModalBody className="mt-2">
              <p className="text-sm text-zinc-400">
                Cette personne ne pourra plus te contacter et ne verra plus ton profil. Cette action supprimera aussi votre match.
              </p>
            </ModalBody>
            <ModalFooter className="flex gap-3 mt-5">
              <Button
                variant="outline"
                className="flex-1 py-3 rounded-xl border-[#262628] text-zinc-300 text-sm font-medium"
                onPress={() => setShowBlockConfirm(false)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold"
                onPress={handleBlockUser}
              >
                Bloquer
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </Modal>

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
        className="shrink-0 border-t border-[#262628] bg-[#0C0C0E] px-3 pt-2"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Hidden file inputs */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />

        {/* Recording mode */}
        <AnimatePresence>
          {recording && (
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              <motion.button
                onClick={() => stopRecording(true)}
                className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0"
                whileTap={{ scale: 0.85 }}
              >
                <X className="w-5 h-5 text-red-400" />
              </motion.button>

              <div className="flex-1 flex items-center gap-2 bg-[#161618] border border-[#262628] rounded-full px-4 py-2.5">
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
                      className="flex-1 rounded-full bg-[#E11D48]"
                      animate={{ height: [3, 6 + Math.random() * 18, 3] }}
                      transition={{ duration: 0.25 + Math.random() * 0.35, repeat: Infinity, delay: i * 0.04 }}
                    />
                  ))}
                </div>
              </div>

              <motion.button
                onClick={() => stopRecording(false)}
                className="w-10 h-10 rounded-full bg-[#E11D48] flex items-center justify-center shrink-0"
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
            {/* Camera button */}
            <Button
              isIconOnly
              variant="ghost"
              className="w-10 h-10 rounded-full bg-[#161618] border border-[#262628] shrink-0 disabled:opacity-30"
              isDisabled={uploadingImage || sending}
              onPress={() => cameraInputRef.current?.click()}
            >
              {uploadingImage ? (
                <Loader2 className="w-[18px] h-[18px] text-[#E11D48] animate-spin" />
              ) : (
                <Camera className="w-[18px] h-[18px] text-[#71717A]" />
              )}
            </Button>

            {/* Text input */}
            <div className="flex-1 flex items-center bg-[#161618] border border-[#262628] rounded-full overflow-hidden">
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
              <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingImage || sending}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mr-0.5 hover:bg-[#262628] transition-colors disabled:opacity-30"
              >
                <ImageIcon className="w-[18px] h-[18px] text-zinc-500" />
              </button>
            </div>

            {/* Send or Mic button */}
            {newMessage.trim() ? (
              <Button
                isIconOnly
                className="w-10 h-10 rounded-full bg-[#E11D48] shrink-0"
                isDisabled={sending}
                onPress={handleSend}
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
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
                    ? 'bg-[#E11D48] scale-125'
                    : 'bg-[#161618] border border-[#262628]'
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
