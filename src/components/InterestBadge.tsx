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
  const isInteractive = onToggle !== undefined;
  const color = INTEREST_CATEGORIES[category] || '#ec4899';

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1 text-[12px] gap-1'
    : 'px-3 py-1.5 text-[13px] gap-1.5';

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={!isInteractive}
      className={`inline-flex items-center rounded-xl font-medium transition-all ${sizeClasses} ${
        selected
          ? 'text-white border-2'
          : isInteractive
            ? 'text-white/80 hover:text-white border'
            : 'text-white/80 border'
      }`}
      style={
        selected
          ? { background: color, borderColor: color }
          : { background: `${color}22`, borderColor: `${color}44` }
      }
      whileTap={isInteractive ? { scale: 0.95 } : undefined}
    >
      {emoji && <span>{emoji}</span>}
      <span>{name}</span>
    </motion.button>
  );
}
