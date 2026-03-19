'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import SkeletonLoader from '@/components/SkeletonLoader';
import { supabase } from '@/lib/supabase';

// Pages where BottomNav should be hidden
const HIDE_NAV_PATHS = ['/profile/edit', '/onboarding', '/matches/'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const hideNav = HIDE_NAV_PATHS.some(p => pathname.includes(p)) || hasProfile === false;

  // Anti-screenshot: hide photos when app loses focus
  useEffect(() => {
    const handleVisibility = () => {
      const photos = document.querySelectorAll('.photo-protected') as NodeListOf<HTMLElement>;
      if (document.hidden) {
        photos.forEach(el => { el.style.visibility = 'hidden'; });
      } else {
        photos.forEach(el => { el.style.visibility = 'visible'; });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      setHasProfile(!!profile);

      if (!profile && !pathname.includes('/onboarding') && !pathname.includes('/profile/edit')) {
        router.replace('/onboarding');
      }

      setReady(true);
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-[#0C0C0E] safe-top">
        <SkeletonLoader variant="discover" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0C0C0E] safe-top">
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          className={hideNav ? '' : 'pb-24'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      {!hideNav && <BottomNav />}
    </div>
  );
}
