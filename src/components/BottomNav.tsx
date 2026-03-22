'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Heart, User, Compass, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge, BadgeAnchor, BadgeLabel } from '@heroui/react/badge';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  { href: '/discover', icon: Compass },
  { href: '/likes', icon: Heart, badge: true },
  { href: '/matches', icon: MessageCircle },
  { href: '/profile', icon: User },
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

  const renderIcon = (item: typeof NAV_ITEMS[number], isActive: boolean) => {
    const Icon = item.icon;
    const iconElement = (
      <Icon
        className={`w-7 h-7 relative z-10 transition-all duration-200 ${
          isActive ? 'text-[#E11D48]' : 'text-[#71717A]'
        }`}
        fill={isActive ? 'currentColor' : 'none'}
        strokeWidth={isActive ? 2 : 1.8}
      />
    );

    if ('badge' in item && item.badge && likesCount > 0) {
      return (
        <Badge color="danger" size="sm" placement="top-right">
          <BadgeAnchor>{iconElement}</BadgeAnchor>
          <BadgeLabel>{likesCount > 99 ? '99+' : likesCount}</BadgeLabel>
        </Badge>
      );
    }

    return iconElement;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-[#0C0C0E]/98 backdrop-blur-xl border-t border-[#262628]">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          {NAV_ITEMS.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <motion.button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`relative flex flex-col items-center gap-1.5 py-1.5 px-5 min-w-[52px] min-h-[44px] transition-colors ${
                  isActive ? 'text-[#E11D48]' : 'text-[#71717A]'
                }`}
                whileTap={{ scale: 0.85 }}
              >
                <div className="relative">
                  {renderIcon(item, isActive)}
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
