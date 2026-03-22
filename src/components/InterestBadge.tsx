'use client';

import { motion } from 'framer-motion';

interface InterestBadgeProps {
  name: string;
  emoji: string | null;
  category: string;
  selected?: boolean;
  onToggle?: () => void;
  size?: 'sm' | 'md';
}

export default function InterestBadge({ name, emoji, selected, onToggle, size = 'md' }: InterestBadgeProps) {
  const isInteractive = onToggle !== undefined;

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1 text-[12px] gap-1'
    : 'px-3.5 py-2 text-sm gap-1.5';

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={!isInteractive}
      className={`inline-flex items-center rounded-full font-medium transition-all ${sizeClasses} ${
        selected
          ? 'bg-[#F9A8D4] text-[#09090B] border-2 border-[#F9A8D4]'
          : isInteractive
            ? 'bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white'
            : 'bg-white/[0.06] border border-white/[0.08] text-white/70'
      }`}
      whileTap={isInteractive ? { scale: 0.95 } : undefined}
    >
      {emoji && <span>{emoji}</span>}
      <span>{name}</span>
    </motion.button>
  );
}
