'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center px-8 py-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Glow icon */}
      <div className="relative mb-6 animate-float">
        <div className="w-20 h-20 rounded-3xl gradient-accent opacity-15 blur-xl absolute inset-0 scale-125" />
        <div className="w-20 h-20 rounded-3xl glass-strong flex items-center justify-center relative animate-glow-pulse">
          <Icon className="w-10 h-10 text-pink-400" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">{description}</p>
      {action && (
        <motion.button
          onClick={action.onClick}
          className="mt-6 btn-gradient px-6 py-3 rounded-xl text-white text-sm font-medium"
          whileTap={{ scale: 0.97 }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
