'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';

// Pages where BottomNav should be hidden
const HIDE_NAV_PATHS = ['/profile/edit', '/onboarding'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const hideNav = HIDE_NAV_PATHS.some(p => pathname.includes(p)) || hasProfile === false;

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      setHasProfile(!!profile);

      // If no profile and not already on onboarding/edit page, redirect to onboarding
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
      <div className="min-h-dvh flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#09090b] safe-top">
      <main className={hideNav ? 'pb-8' : 'pb-24'}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
