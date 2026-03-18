'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Edit3, LogOut, MapPin, Heart, Calendar, Shield } from 'lucide-react';
import InterestBadge from '@/components/InterestBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { calculateAge } from '@/lib/utils';
import { GENDER_LABELS, LOOKING_FOR_LABELS } from '@/lib/constants';
import type { Profile, ProfilePhoto, Interest } from '@/lib/types';

interface ProfileInterestJoined {
  interest_id: string;
  interests: Interest;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [interests, setInterests] = useState<ProfileInterestJoined[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profileRes, photosRes, interestsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('profile_photos').select('*').eq('profile_id', session.user.id).order('position'),
        supabase.from('profile_interests').select('interest_id, interests (*)').eq('profile_id', session.user.id),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (photosRes.data) setPhotos(photosRes.data);
      if (interestsRes.data) {
        setInterests(
          (interestsRes.data as unknown as ProfileInterestJoined[])
        );
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-[80dvh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-zinc-400 mb-4">Profil non trouvé</p>
        <button onClick={() => router.push('/profile/edit')} className="btn-gradient px-6 py-3 rounded-xl text-sm font-medium">
          Créer mon profil
        </button>
      </div>
    );
  }

  const currentPhoto = photos[photoIndex];
  const age = calculateAge(profile.birth_date);

  return (
    <div className="pb-4">
      {/* Hero photo */}
      <div className="relative w-full aspect-[3/4] max-h-[55dvh] overflow-hidden">
        {currentPhoto ? (
          <Image
            src={currentPhoto.url}
            alt={profile.first_name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-6xl font-bold text-zinc-600">
            {profile.first_name.charAt(0)}
          </div>
        )}

        {/* Photo indicators */}
        {photos.length > 1 && (
          <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setPhotoIndex(i)}
                className={`h-1 rounded-full flex-1 transition-colors ${
                  i === photoIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />

        {/* Floating buttons */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <motion.button
            onClick={() => router.push('/profile/edit')}
            className="w-11 h-11 rounded-full glass flex items-center justify-center"
            whileTap={{ scale: 0.9 }}
          >
            <Edit3 className="w-5 h-5" />
          </motion.button>
          <motion.button
            onClick={handleLogout}
            className="w-11 h-11 rounded-full glass flex items-center justify-center text-red-400"
            whileTap={{ scale: 0.9 }}
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Profile content */}
      <div className="px-5 -mt-8 relative z-10">
        <div className="flex items-end gap-3 mb-4">
          <h1 className="text-3xl font-bold">{profile.first_name}, {age}</h1>
          {profile.is_verified && (
            <Shield className="w-6 h-6 text-blue-400 mb-1" />
          )}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 mb-5">
          {profile.location_city && (
            <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
              <MapPin className="w-4 h-4" />
              {profile.location_city}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
            <Heart className="w-4 h-4" />
            {LOOKING_FOR_LABELS[profile.looking_for]}
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
            <Calendar className="w-4 h-4" />
            {GENDER_LABELS[profile.gender]}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="glass rounded-2xl p-4 mb-5">
            <p className="text-zinc-200 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">Mes intérêts</h2>
            <div className="flex flex-wrap gap-2">
              {interests.map((pi) => (
                <InterestBadge
                  key={pi.interest_id}
                  name={pi.interests.name}
                  emoji={pi.interests.emoji}
                  category={pi.interests.category}
                />
              ))}
            </div>
          </div>
        )}

        {/* Preferences card */}
        <div className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">Mes préférences</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-zinc-500">Distance</span>
              <p className="text-white font-medium">{profile.max_distance_km} km</p>
            </div>
            <div>
              <span className="text-zinc-500">Âge</span>
              <p className="text-white font-medium">{profile.age_min} - {profile.age_max} ans</p>
            </div>
            {profile.gender_preference && profile.gender_preference.length > 0 && (
              <div className="col-span-2">
                <span className="text-zinc-500">Genre préféré</span>
                <p className="text-white font-medium">
                  {profile.gender_preference.map(g => GENDER_LABELS[g]).join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
