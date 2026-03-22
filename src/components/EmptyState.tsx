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
      <div className="relative mb-6 animate-float">
        <div className="w-20 h-20 rounded-2xl bg-[#141416] border border-white/[0.04] flex items-center justify-center">
          <Icon className="w-10 h-10 text-white/20" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/40 text-sm max-w-xs leading-relaxed">{description}</p>
      {action && (
        <motion.button
          onClick={action.onClick}
          className="mt-6 px-6 py-3 rounded-full text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)' }}
          whileTap={{ scale: 0.97 }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
