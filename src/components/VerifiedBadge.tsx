'use client';

import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md';
}

export default function VerifiedBadge({ size = 'sm' }: VerifiedBadgeProps) {
  const dim = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const iconDim = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center justify-center ${dim} rounded-full shrink-0`}
      style={{ backgroundColor: '#3B82F6' }}
      title="Profil vérifié"
    >
      <Check className={`${iconDim} text-white`} strokeWidth={3} />
    </span>
  );
}
