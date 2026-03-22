'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return; }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        if (authError.message.includes('already registered')) { setError('Un compte existe déjà avec cet email'); }
        else { setError(authError.message); }
        return;
      }
      router.replace('/profile/edit');
    } catch { setError('Une erreur est survenue'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-dvh bg-[#09090B] flex flex-col px-6 safe-top safe-bottom relative overflow-hidden">
      <div className="absolute bottom-[-20%] left-[-20%] w-[400px] h-[400px] rounded-full bg-[#E11D48]/5 blur-[120px]" />

      <motion.div
        className="relative z-10 flex flex-col flex-1 justify-center max-w-sm mx-auto w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button onClick={() => router.back()} className="absolute top-12 left-0 p-2 -ml-2 text-[#A1A1AA] hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#E11D48] flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#FAFAFA]">Créer un compte</h1>
            <p className="text-[#A1A1AA] text-sm">Rejoins la communauté</p>
          </div>
        </div>

        {error && (
          <motion.div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#52525B] z-10" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-[#141416] border border-white/[0.06] rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-[#52525B] input-focus-accent transition-all" />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#52525B] z-10" />
            <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe (min. 6 caractères)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-[#141416] border border-white/[0.06] rounded-xl py-4 pl-12 pr-12 text-white placeholder:text-[#52525B] input-focus-accent transition-all" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#52525B] hover:text-[#A1A1AA] transition-colors z-10">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#52525B] z-10" />
            <input type={showPassword ? 'text' : 'password'} placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="w-full bg-[#141416] border border-white/[0.06] rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-[#52525B] input-focus-accent transition-all" />
          </div>

          <motion.button type="submit" disabled={loading} className="btn-primary w-full h-14 rounded-full text-white font-semibold text-base mt-2 disabled:opacity-50" whileTap={{ scale: 0.97 }}>
            {loading ? (
              <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
            ) : "S'inscrire"}
          </motion.button>
        </form>

        <p className="text-center text-[#A1A1AA] text-sm mt-8">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-[#E11D48] font-medium hover:text-[#BE123C] transition-colors">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
