'use client';

import { motion } from 'framer-motion';
import { Chip } from '@heroui/react/chip';
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

  const chipSize = size === 'sm' ? 'sm' : 'md';

  // Display-only mode: use HeroUI Chip
  if (!isInteractive) {
    return (
      <Chip
        variant="secondary"
        size={chipSize}
        className={`bg-[#161618] border-[#262628] text-zinc-300 ${
          size === 'sm' ? 'px-2.5 py-1 text-xs gap-1' : 'px-3.5 py-2 text-sm gap-1.5'
        }`}
      >
        {emoji && <span>{emoji}</span>}
        <span>{name}</span>
      </Chip>
    );
  }

  // Interactive mode: keep motion.button for tap animation and toggle behavior
  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1 text-xs gap-1'
    : 'px-3.5 py-2 text-sm gap-1.5';

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center rounded-full font-medium transition-all ${sizeClasses} ${
        selected
          ? 'border-2 text-white'
          : 'bg-[#161618] border border-[#262628] text-zinc-300 hover:text-white'
      }`}
      style={selected ? { borderColor: color, backgroundColor: `${color}20`, color: 'white' } : undefined}
      whileTap={{ scale: 0.95 }}
    >
      {emoji && <span>{emoji}</span>}
      <span>{name}</span>
    </motion.button>
  );
}
