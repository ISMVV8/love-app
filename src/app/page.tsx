'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Sparkles, MessageCircleHeart, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

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
    <div className="min-h-dvh bg-[#09090B] flex flex-col items-center justify-center px-6 safe-top safe-bottom overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-[-20%] left-[20%] w-[400px] h-[400px] rounded-full bg-[#E11D48]/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-[#E11D48]/3 blur-[100px]" />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-sm"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Logo */}
        <motion.div
          className="w-20 h-20 rounded-3xl bg-[#E11D48] flex items-center justify-center mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <Heart className="w-10 h-10 text-white" fill="white" />
        </motion.div>

        <h1 className="text-4xl font-extrabold mb-3 tracking-tight">
          <span className="text-[#E11D48]">Love</span> <span className="text-[#FAFAFA]">App</span>
        </h1>
        <p className="text-[#A1A1AA] text-lg mb-12 leading-relaxed">
          Trouve la personne qui te correspond vraiment.
        </p>

        {/* Features */}
        <div className="flex flex-col gap-3 w-full mb-12">
          {[
            { icon: Sparkles, text: 'Compatibilité intelligente' },
            { icon: Heart, text: 'Matchs basés sur tes intérêts' },
            { icon: MessageCircleHeart, text: 'Messagerie en temps réel' },
          ].map((feature, i) => (
            <motion.div
              key={feature.text}
              className="bg-[#141416] border border-white/[0.06] rounded-2xl px-5 py-4 flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-xl bg-[rgba(225,29,72,0.12)] flex items-center justify-center shrink-0">
                <feature.icon className="w-5 h-5 text-[#E11D48]" />
              </div>
              <span className="text-sm font-medium text-[#FAFAFA]">{feature.text}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          onClick={() => router.push('/register')}
          className="btn-primary w-full py-4 rounded-full text-white font-semibold text-base flex items-center justify-center gap-2"
          whileTap={{ scale: 0.97 }}
        >
          Commencer
          <ArrowRight className="w-5 h-5" />
        </motion.button>

        <button
          onClick={() => router.push('/login')}
          className="mt-4 text-[#A1A1AA] text-sm hover:text-white transition-colors"
        >
          J&apos;ai déjà un compte
        </button>

        <button
          onClick={() => router.push('/login?demo=1')}
          className="mt-2 text-[#52525B] text-xs hover:text-[#A1A1AA] transition-colors"
        >
          Essayer en mode démo →
        </button>
      </motion.div>
    </div>
  );
}
