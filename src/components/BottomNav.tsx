'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Heart, User, Compass, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  { href: '/discover', icon: Compass, label: 'Découvrir' },
  { href: '/likes', icon: Heart, label: 'Likes', badge: true },
  { href: '/matches', icon: MessageCircle, label: 'Matchs' },
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

      // Get IDs I've already swiped on
      const { data: mySwipes } = await supabase
        .from('swipes')
        .select('swiped_id')
        .eq('swiper_id', currentUserId);

      const swipedIds = mySwipes?.map(s => s.swiped_id) || [];

      // Count people who liked me that I haven't swiped on
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
                <div className="relative">
                  <Icon className="w-6 h-6 relative z-10" fill={isActive ? 'currentColor' : 'none'} />
                  {'badge' in item && item.badge && likesCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full gradient-accent text-[10px] font-bold flex items-center justify-center text-white px-1 z-20">
                      {likesCount > 99 ? '99+' : likesCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium relative z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
