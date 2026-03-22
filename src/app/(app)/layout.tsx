'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import SkeletonLoader from '@/components/SkeletonLoader';
import { supabase } from '@/lib/supabase';

const HIDE_NAV_PATHS = ['/profile/edit', '/onboarding', '/matches/'];

const SESSION_CACHE_KEY = 'love-app-session-ok';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const hasCachedSession = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_CACHE_KEY) === '1';
  const [ready, setReady] = useState(hasCachedSession);
  const [hasProfile, setHasProfile] = useState<boolean | null>(hasCachedSession ? true : null);

  const hideNav = HIDE_NAV_PATHS.some(p => pathname.includes(p)) || hasProfile === false;

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
        sessionStorage.removeItem(SESSION_CACHE_KEY);
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

      sessionStorage.setItem(SESSION_CACHE_KEY, '1');
      setReady(true);
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(SESSION_CACHE_KEY);
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-[#09090B] safe-top">
        <SkeletonLoader variant="discover" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#09090B] safe-top">
      <main className={hideNav ? '' : 'pb-20'}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
