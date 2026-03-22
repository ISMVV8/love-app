'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
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
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'sofia@demo.app',
        password: 'Demo2026!',
      });
      if (authError) {
        setError('Erreur de connexion démo');
        return;
      }
      router.replace('/discover');
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : authError.message);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Erreur de connexion');
        return;
      }

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
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0C0C0E] flex flex-col px-6 safe-top safe-bottom relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-[-20%] right-[-20%] w-[400px] h-[400px] rounded-full bg-[#E11D48]/5 blur-[120px]" />

      <motion.div
        className="relative z-10 flex flex-col flex-1 justify-center max-w-sm mx-auto w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          onClick={() => router.back()}
          className="absolute top-12 left-0 p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#E11D48] flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bon retour</h1>
            <p className="text-zinc-400 text-sm">Connecte-toi à ton compte</p>
          </div>
        </div>

        {error && (
          <motion.div
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 z-10" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#161618] border border-[#262628] rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-500 input-focus-accent transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 z-10" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#161618] border border-[#262628] rounded-xl py-4 pl-12 pr-12 text-white placeholder:text-zinc-500 input-focus-accent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors z-10"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 rounded-xl text-white font-semibold text-base mt-2 disabled:opacity-50"
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              'Se connecter'
            )}
          </motion.button>
        </form>

        {/* Separator */}
        <div className="flex items-center gap-3 mt-8">
          <div className="flex-1 h-px bg-[#262628]" />
          <span className="text-xs text-zinc-500">ou</span>
          <div className="flex-1 h-px bg-[#262628]" />
        </div>

        {/* Demo mode button */}
        <motion.button
          onClick={handleDemo}
          disabled={demoLoading}
          className="w-full mt-4 py-3.5 rounded-xl border border-[#262628] bg-[#161618] text-zinc-300 font-medium text-sm hover:bg-[#1C1C1E] hover:border-[#363638] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          whileTap={{ scale: 0.97 }}
        >
          {demoLoading ? (
            <motion.div
              className="w-4 h-4 border-2 border-zinc-500/30 border-t-zinc-300 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Essayer en mode démo
            </>
          )}
        </motion.button>

        <p className="text-center text-zinc-400 text-sm mt-6">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-[#E11D48] font-medium hover:text-[#BE123C] transition-colors">
            S&apos;inscrire
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
