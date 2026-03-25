'use client';

import { usePathname, useRouter } from 'next/navigation';
import { User, Compass, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/discover', icon: Compass, label: 'DISCOVER' },
  { href: '/matches', icon: Heart, label: 'MATCHS' },
  { href: '/profile', icon: User, label: 'PROFIL' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeIndex = NAV_ITEMS.findIndex(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-[21px] pt-3 pb-[21px]">
      <div
        className="flex items-center rounded-[36px] h-[62px] p-1"
        style={{
          background: 'rgba(26, 26, 30, 0.93)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {NAV_ITEMS.map((item, index) => {
          const isActive = index === activeIndex;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-full rounded-[26px] transition-colors ${
                isActive ? '' : ''
              }`}
              style={
                isActive
                  ? { background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }
                  : undefined
              }
              whileTap={{ scale: 0.9 }}
            >
              <Icon
                className={`w-[18px] h-[18px] ${
                  isActive ? 'text-white' : 'text-[#a1a1aa]'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] tracking-[0.5px] ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-[#a1a1aa] font-medium'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
