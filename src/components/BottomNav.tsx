'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Heart, User, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/discover', icon: Compass, label: 'Découvrir' },
  { href: '/matches', icon: Heart, label: 'Matchs' },
  { href: '/profile', icon: User, label: 'Profil' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Background that extends to the very bottom of the screen (behind home indicator) */}
      <div className="bg-[#09090b]/95 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <motion.button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`relative flex flex-col items-center gap-1 py-2 px-5 rounded-2xl transition-colors min-w-[64px] min-h-[44px] ${
                  isActive ? 'text-white' : 'text-zinc-500'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl gradient-accent opacity-15"
                    layoutId="nav-indicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className="w-6 h-6 relative z-10" fill={isActive ? 'currentColor' : 'none'} />
                <span className="text-[10px] font-medium relative z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
