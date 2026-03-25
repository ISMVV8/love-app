'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Pencil, LogOut, MapPin, Heart, Compass, Ruler, User } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import InterestBadge from '@/components/InterestBadge';
import SkeletonLoader from '@/components/SkeletonLoader';
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
        setInterests(interestsRes.data as unknown as ProfileInterestJoined[]);
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
    return <SkeletonLoader variant="profile" />;
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-white/50 mb-4">Profil non trouvé</p>
        <button onClick={() => router.push('/profile/edit')} className="px-6 py-3 rounded-full text-white text-sm font-medium btn-primary">
          Créer mon profil
        </button>
      </div>
    );
  }

  const primaryPhoto = photos.find(p => p.is_primary) || photos[0];
  const age = calculateAge(profile.birth_date);

  return (
    <div className="pb-28">
      {/* Hero photo */}
      <div className="relative w-full h-[180px] mx-auto px-5 pt-0">
        <div className="relative w-full h-full rounded-3xl overflow-hidden">
          {primaryPhoto ? (
            <div className="photo-protected-wrapper w-full h-full">
              <Image
                src={primaryPhoto.url}
                alt={profile.first_name}
                fill
                className="object-cover photo-protected"
                priority
                sizes="100vw"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-[#141416] flex items-center justify-center text-6xl font-bold text-white/25">
              {profile.first_name.charAt(0)}
            </div>
          )}
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-[120px]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.67) 0%, transparent 100%)' }} />

          {/* Photo dots */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {photos.slice(0, 4).map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/25'}`} />
              ))}
            </div>
          )}

          {/* Edit button */}
          <button
            onClick={() => router.push('/profile/edit')}
            className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' }}
          >
            <Pencil className="w-[18px] h-[18px] text-white" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-3">
        {/* Name + badge */}
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-[26px] font-bold text-[#fafafa]">{profile.first_name}, {age}</h1>
          {profile.is_verified && (
            <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Location */}
        {profile.location_city && (
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span className="text-[14px] text-[#a1a1aa]">{profile.location_city}</span>
          </div>
        )}

        {/* Looking for */}
        <div className="flex items-center gap-1.5 mb-4">
          <Heart className="w-3.5 h-3.5 text-[#ec4899]" />
          <span className="text-[14px] text-[#ec4899]">{LOOKING_FOR_LABELS[profile.looking_for]}</span>
        </div>

        {/* Bio card */}
        {profile.bio && (
          <div className="rounded-2xl p-3.5 mb-3 glass-card">
            <p className="text-[14px] font-semibold text-[#a1a1aa] mb-1.5">À propos</p>
            <p className="text-[13px] text-[#fafafa] leading-[1.4]">{profile.bio}</p>
          </div>
        )}

        {/* Interests card */}
        {interests.length > 0 && (
          <div className="rounded-2xl p-3.5 mb-3 glass-card">
            <p className="text-[14px] font-semibold text-[#a1a1aa] mb-2">Centres d&apos;intérêt</p>
            <div className="flex flex-wrap gap-2">
              {interests.map((pi) => (
                <InterestBadge
                  key={pi.interest_id}
                  name={pi.interests.name}
                  emoji={pi.interests.emoji}
                  category={pi.interests.category}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Preferences card */}
        <div className="rounded-2xl p-3.5 mb-4 glass-card">
          <p className="text-[14px] font-semibold text-[#a1a1aa] mb-2">Préférences</p>

          {/* Distance */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#a1a1aa]" />
              <span className="text-[14px] text-[#a1a1aa]">Distance max</span>
            </div>
            <span className="text-[14px] font-medium text-[#ec4899]">{profile.max_distance_km || 25} km</span>
          </div>

          <div className="h-px bg-white/10" />

          {/* Age */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#a1a1aa]" />
              <span className="text-[14px] text-[#a1a1aa]">Âge</span>
            </div>
            <span className="text-[14px] font-medium text-[#ec4899]">{profile.age_min} - {profile.age_max} ans</span>
          </div>

          <div className="h-px bg-white/10" />

          {/* Gender */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#a1a1aa]" />
              <span className="text-[14px] text-[#a1a1aa]">Genre</span>
            </div>
            <span className="text-[14px] font-medium text-[#ec4899]">{GENDER_LABELS[profile.gender]}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => router.push('/profile/edit')}
            className="flex-1 h-[42px] rounded-[14px] text-white font-semibold text-[15px] flex items-center justify-center gap-2 btn-primary active:scale-[0.97] transition-transform"
          >
            <Pencil className="w-[18px] h-[18px]" />
            Modifier le profil
          </button>
          <button
            onClick={handleLogout}
            className="w-[42px] h-[42px] rounded-[14px] flex items-center justify-center active:scale-[0.97] transition-transform"
            style={{ background: 'rgba(239, 68, 68, 0.13)', border: '1px solid rgba(239, 68, 68, 0.27)' }}
          >
            <LogOut className="w-5 h-5 text-[#ef4444]" />
          </button>
        </div>
      </div>
    </div>
  );
}
