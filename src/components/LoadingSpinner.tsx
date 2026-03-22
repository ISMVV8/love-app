'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      >
        <Heart className={`${sizes[size]} text-[#E11D48]`} />
      </motion.div>
      {text && <p className="text-[#A1A1AA] text-sm">{text}</p>}
    </div>
  );
}
