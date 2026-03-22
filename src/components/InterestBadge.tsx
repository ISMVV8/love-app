'use client';

import { motion } from 'framer-motion';
import { INTEREST_CATEGORIES } from '@/lib/constants';

interface InterestBadgeProps {
  name: string;
  emoji: string | null;
  category: string;
  selected?: boolean;
  onToggle?: () => void;
  size?: 'sm' | 'md';
}

export default function InterestBadge({ name, emoji, category, selected, onToggle, size = 'md' }: InterestBadgeProps) {
  const color = INTEREST_CATEGORIES[category] || '#a1a1aa';
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
          ? 'border-2 text-white'
          : isInteractive
            ? 'bg-white/10 border border-white/[0.15] text-white/80 hover:text-white'
            : 'bg-white/10 border border-white/[0.15] text-white/80'
      }`}
      style={selected ? { borderColor: color, backgroundColor: `${color}20`, color: 'white' } : undefined}
      whileTap={isInteractive ? { scale: 0.95 } : undefined}
    >
      {emoji && <span>{emoji}</span>}
      <span>{name}</span>
    </motion.button>
  );
}
