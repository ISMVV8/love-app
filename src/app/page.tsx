'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const FEATURES = [
  { icon: Heart, title: 'Matching', desc: 'Trouve ton âme sœur', color: '#ec4899' },
  { icon: MessageCircle, title: 'Messages', desc: 'Discute en temps réel', color: '#8b5cf6' },
  { icon: Shield, title: 'Sécurité', desc: 'Profils vérifiés', color: '#ec4899' },
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
          <Heart className="w-8 h-8 text-[#ec4899]" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#09090B] flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      {/* Logo + Title */}
      <motion.div
        className="flex flex-col items-center gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Heart
          className="w-[72px] h-[72px]"
          strokeWidth={1.5}
          style={{
            stroke: 'url(#heartGrad)',
            fill: 'none',
          }}
        />
        <svg width="0" height="0">
          <defs>
            <linearGradient id="heartGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <h1 className="text-5xl font-extrabold tracking-tight gradient-text">
          Love
        </h1>
        <p className="text-[#a1a1aa] text-lg">
          Trouve ta personne
        </p>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        className="flex gap-3 w-full max-w-sm mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            className="flex-1 flex flex-col items-center justify-center gap-2.5 rounded-2xl p-4 glass-card"
            style={{ minHeight: 130 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
          >
            <f.icon className="w-7 h-7" style={{ color: f.color }} />
            <span className="text-[13px] font-semibold text-[#fafafa]">{f.title}</span>
            <span className="text-[10px] text-[#71717a] text-center">{f.desc}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.button
        onClick={() => router.push('/register')}
        className="w-full max-w-sm h-14 rounded-2xl font-bold text-lg text-white btn-primary active:scale-[0.97] transition-transform"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        Commencer
      </motion.button>

      {/* Login link */}
      <motion.div
        className="flex items-center gap-1 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <span className="text-[#71717a] text-sm">Déjà un compte ?</span>
        <button
          onClick={() => router.push('/login')}
          className="text-[#ec4899] font-semibold text-sm hover:opacity-80 transition-opacity"
        >
          Se connecter
        </button>
      </motion.div>
    </div>
  );
}
