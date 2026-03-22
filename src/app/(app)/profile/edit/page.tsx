'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProfileForm from '@/components/ProfileForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import type { Profile, ProfilePhoto } from '@/lib/types';

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [interestIds, setInterestIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profileRes, photosRes, interestsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('profile_photos').select('*').eq('profile_id', session.user.id).order('position'),
        supabase.from('profile_interests').select('interest_id').eq('profile_id', session.user.id),
      ]);

      setProfile(profileRes.data);
      if (photosRes.data) setPhotos(photosRes.data);
      if (interestsRes.data) setInterestIds(interestsRes.data.map(i => i.interest_id));
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LoadingSpinner text="Chargement du profil..." />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="px-4 mb-6 flex items-center gap-3">
        <motion.button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#141416] border border-white/[0.06] flex items-center justify-center"
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <h1 className="text-xl font-bold">
          {profile ? 'Modifier mon profil' : 'Créer mon profil'}
        </h1>
      </div>

      <ProfileForm
        existingProfile={profile}
        existingPhotos={photos}
        existingInterestIds={interestIds}
      />
    </div>
  );
}
