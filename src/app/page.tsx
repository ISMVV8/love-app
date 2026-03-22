'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

const GRID_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop',
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          router.replace('/discover');
        } else {
          router.replace('/profile/edit');
        }
      } else {
        setChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#09090B]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Heart className="w-8 h-8 text-[#E11D48]" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#09090B] flex flex-col relative overflow-hidden">
      {/* Photo grid background — 3 columns, 2 rows */}
      <div className="relative w-full pt-4 px-3">
        <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
          {GRID_PHOTOS.map((url, i) => (
            <motion.div
              key={i}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="33vw"
                priority={i < 3}
              />
            </motion.div>
          ))}
        </div>

        {/* Gradient fade from photos to content */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090B] to-transparent" />
      </div>

      {/* Content section */}
      <motion.div
        className="flex flex-col items-center text-center px-8 pb-12 -mt-8 relative z-10 flex-1 justify-end"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {/* Heart logo */}
        <div className="mb-6">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M24 42C24 42 6 32 6 18C6 12 10 7 16 7C19.5 7 22.5 9 24 12C25.5 9 28.5 7 32 7C38 7 42 12 42 18C42 32 24 42 24 42Z"
              stroke="#F9A8D4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M16 28C16 28 8 22 8 16C8 12 11 9 15 9C17 9 19 10 20 12"
              stroke="#F9A8D4"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Tagline */}
        <h1 className="text-[28px] font-bold text-white mb-3 leading-tight tracking-tight">
          Inclusive, fiable, sûre.
        </h1>
        <p className="text-[#A1A1AA] text-[15px] leading-relaxed mb-10 max-w-[280px]">
          Élargis ton cercle et connecte-toi avec des personnes qui te correspondent.
        </p>

        {/* CTA — gradient pink button */}
        <button
          onClick={() => router.push('/register')}
          className="w-full max-w-[320px] py-4 rounded-full font-semibold text-[16px] text-white mb-5 active:scale-[0.97] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)',
          }}
        >
          Suivant
        </button>

        {/* Login link */}
        <p className="text-[#A1A1AA] text-[14px] mb-1">
          Tu as déjà un compte ?
        </p>
        <button
          onClick={() => router.push('/login')}
          className="text-white font-semibold text-[15px] hover:text-[#F9A8D4] transition-colors"
        >
          Connexion
        </button>

        {/* Demo link */}
        <button
          onClick={() => router.push('/login?demo=1')}
          className="mt-4 text-[#52525B] text-[12px] hover:text-[#A1A1AA] transition-colors"
        >
          Essayer en mode démo →
        </button>
      </motion.div>
    </div>
  );
}
