'use client';

import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import type { Message } from '@/lib/types';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: MessageBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isMine
            ? 'text-white rounded-br-[4px]'
            : 'bg-[#141416] border border-white/[0.04] text-white rounded-bl-[4px]'
        }`}
        style={isMine ? { background: 'linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)' } : undefined}
      >
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
          {message.content}
        </p>
        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isMine ? 'text-white/50' : 'text-white/20'}`}>
            {time}
          </span>
          {isMine && (
            message.read_at
              ? <CheckCheck className="w-3.5 h-3.5 text-white/50" />
              : <Check className="w-3.5 h-3.5 text-white/30" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
