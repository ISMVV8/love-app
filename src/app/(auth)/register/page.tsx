'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
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
          <h1 className="text-[32px] font-bold text-[#fafafa] tracking-tight leading-tight">Créer un compte</h1>
          <p className="text-[#71717a] text-base mt-2">Rejoins la communauté</p>
        </div>

        {error && (
          <motion.div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm password */}
          <div className="flex items-center gap-3 h-14 rounded-[14px] glass-card px-4">
            <Lock className="w-5 h-5 text-[#71717a] shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="flex-1 bg-transparent text-[#fafafa] text-[15px] placeholder:text-[#4a4a50] outline-none"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#71717a] hover:text-[#a1a1aa] transition-colors shrink-0">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl text-white font-bold text-lg mt-2 btn-primary disabled:opacity-50"
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <motion.div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mx-auto" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
            ) : "S'inscrire"}
          </motion.button>
        </form>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom link */}
        <p className="text-center text-[#71717a] text-sm pb-10">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-[#ec4899] font-semibold hover:opacity-80 transition-opacity">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
