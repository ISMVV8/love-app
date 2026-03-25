'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async () => {
    setError(null);
    setDemoLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: 'sofia@demo.app', password: 'Demo2026!' });
      if (authError) { setError('Erreur de connexion démo'); return; }
      router.replace('/discover');
    } catch { setError('Une erreur est survenue'); } finally { setDemoLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : authError.message); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Erreur de connexion'); return; }
      const { data: profile } = await supabase.from('profiles').select('id').eq('id', session.user.id).single();
      if (profile) { router.replace('/discover'); } else { router.replace('/profile/edit'); }
    } catch { setError('Une erreur est survenue'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh bg-[#09090B] flex flex-col px-6 safe-top safe-bottom">
      <motion.div
        className="flex flex-col flex-1 max-w-sm mx-auto w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Top bar */}
        <div className="pt-[60px] mb-6">
          <button onClick={() => router.back()} className="text-[#fafafa] hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[32px] font-bold text-[#fafafa] tracking-tight leading-tight">Connexion</h1>
          <p className="text-[#71717a] text-base mt-2">Bon retour parmi nous</p>
        </div>

        {error && (
          <motion.div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email field */}
          <div className="flex items-center gap-3 h-14 rounded-[14px] glass-card px-4">
            <Mail className="w-5 h-5 text-[#71717a] shrink-0" />
            <input
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-transparent text-[#fafafa] text-[15px] placeholder:text-[#4a4a50] outline-none"
            />
          </div>

          {/* Password field */}
          <div className="flex items-center gap-3 h-14 rounded-[14px] glass-card px-4">
            <Lock className="w-5 h-5 text-[#71717a] shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="flex-1 bg-transparent text-[#fafafa] text-[15px] placeholder:text-[#4a4a50] outline-none"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#71717a] hover:text-[#a1a1aa] transition-colors shrink-0">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl text-white font-bold text-lg mt-2 btn-primary disabled:opacity-50"
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
            ) : 'Se connecter'}
          </motion.button>
        </form>

        {/* Demo button */}
        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[12px] text-white/25">ou</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <motion.button
          onClick={handleDemo}
          disabled={demoLoading}
          className="w-full mt-4 h-12 rounded-full border border-white/[0.1] bg-white/[0.04] text-white/50 font-medium text-sm hover:bg-white/[0.06] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          whileTap={{ scale: 0.97 }}
        >
          {demoLoading ? (
            <motion.div className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Essayer en mode démo
            </>
          )}
        </motion.button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom link */}
        <p className="text-center text-[#71717a] text-sm pb-10">
          Pas de compte ?{' '}
          <Link href="/register" className="text-[#ec4899] font-semibold hover:opacity-80 transition-opacity">
            S&apos;inscrire
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
