'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Heart, User, Compass, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  { href: '/discover', icon: Compass, label: 'Découvrir' },
  { href: '/likes', icon: Heart, label: 'Likes', badge: true },
  { href: '/matches', icon: MessageCircle, label: 'Messages' },
  { href: '/profile', icon: User, label: 'Profil' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const fetchLikesCount = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const currentUserId = session.user.id;

      const { data: mySwipes } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', currentUserId);

      const swipedIds = mySwipes?.map(s => s.swiped_id) || [];

      const { data: likeSwipes } = await supabase
        .from('swipes')
        .select('swiper_id')
        .eq('swiped_id', currentUserId)
        .eq('action', 'like');

      const unseenLikes = (likeSwipes || [])
        .filter(s => !swipedIds.includes(s.swiper_id));

      setLikesCount(unseenLikes.length);
    };

    fetchLikesCount();
    const interval = setInterval(fetchLikesCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeIndex = NAV_ITEMS.findIndex(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-[#09090B]/95 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          {NAV_ITEMS.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="relative flex flex-col items-center gap-1 py-1 px-5 min-w-[52px] min-h-[44px]"
                whileTap={{ scale: 0.85 }}
              >
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 transition-colors duration-200 ${
                      isActive ? 'text-[#E11D48]' : 'text-[#52525B]'
                    }`}
                    fill={isActive ? 'currentColor' : 'none'}
                    strokeWidth={isActive ? 2 : 1.8}
                  />
                  {'badge' in item && item.badge && likesCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-[#E11D48] text-[10px] font-bold flex items-center justify-center text-white px-1 z-20 shadow-[0_0_8px_rgba(225,29,72,0.4)]">
                      {likesCount > 99 ? '99+' : likesCount}
                    </span>
                  )}
                </div>

                {/* Active dot indicator */}
                {isActive && (
                  <motion.div
                    className="w-1 h-1 rounded-full bg-[#E11D48]"
                    layoutId="nav-dot"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
