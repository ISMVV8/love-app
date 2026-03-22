'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Edit3, LogOut, MapPin, Heart, Users, EyeOff, Eye, Shield, Ruler, Cigarette, Wine } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import InterestBadge from '@/components/InterestBadge';
import SkeletonLoader from '@/components/SkeletonLoader';
import { supabase } from '@/lib/supabase';
import { calculateAge } from '@/lib/utils';
import { GENDER_LABELS, LOOKING_FOR_LABELS, HAIR_COLOR_LABELS, EYE_COLOR_LABELS, BODY_TYPE_LABELS, SKIN_TONE_LABELS, SMOKING_LABELS, DRINKING_LABELS } from '@/lib/constants';
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
  const [invisibleToggling, setInvisibleToggling] = useState(false);

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

  const toggleInvisibleMode = async () => {
    if (!profile || invisibleToggling) return;
    setInvisibleToggling(true);
    const newValue = !profile.invisible_mode;
    const { error } = await supabase
      .from('profiles')
      .update({ invisible_mode: newValue })
      .eq('id', profile.id);
    if (!error) {
      setProfile({ ...profile, invisible_mode: newValue });
    }
    setInvisibleToggling(false);
  };

  if (loading) {
    return <SkeletonLoader variant="profile" />;
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <p className="text-white/50 mb-4">Profil non trouvé</p>
        <button onClick={() => router.push('/profile/edit')} className="px-6 py-3 rounded-full text-white text-sm font-medium" style={{ background: 'linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)' }}>
          Créer mon profil
        </button>
      </div>
    );
  }

  const primaryPhoto = photos.find(p => p.is_primary) || photos[0];
  const age = calculateAge(profile.birth_date);

  const aboutItems: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (profile.location_city) aboutItems.push({ icon: <MapPin className="w-4 h-4" />, label: 'Ville', value: profile.location_city });
  if (profile.height_cm) aboutItems.push({ icon: <Ruler className="w-4 h-4" />, label: 'Taille', value: `${profile.height_cm} cm` });
  if (profile.hair_color) aboutItems.push({ icon: <span className="text-sm">💇</span>, label: 'Cheveux', value: HAIR_COLOR_LABELS[profile.hair_color] });
  if (profile.eye_color) aboutItems.push({ icon: <span className="text-sm">👁️</span>, label: 'Yeux', value: EYE_COLOR_LABELS[profile.eye_color] });
  if (profile.body_type) aboutItems.push({ icon: <span className="text-sm">💪</span>, label: 'Corpulence', value: BODY_TYPE_LABELS[profile.body_type] });
  if (profile.skin_tone) aboutItems.push({ icon: <span className="text-sm">🎨</span>, label: 'Teint', value: SKIN_TONE_LABELS[profile.skin_tone] });
  if (profile.smoking) aboutItems.push({ icon: <Cigarette className="w-4 h-4" />, label: 'Tabac', value: SMOKING_LABELS[profile.smoking] });
  if (profile.drinking) aboutItems.push({ icon: <Wine className="w-4 h-4" />, label: 'Alcool', value: DRINKING_LABELS[profile.drinking] });

  return (
    <div className="pb-28">
      {/* Header photo */}
      <div className="relative w-full h-[200px] overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/40 to-transparent" />
      </div>

      {/* Avatar circle overlapping */}
      <div className="flex justify-center -mt-[50px] relative z-10 mb-3">
        <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-[#09090B] ring-2 ring-[#F9A8D4]/30 bg-[#141416]">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto.url}
              alt={profile.first_name}
              width={100}
              height={100}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white/25">
              {profile.first_name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Name + badge */}
      <div className="text-center mb-1 px-5">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold text-white">{profile.first_name}, {age}</h1>
          {profile.is_verified && <VerifiedBadge size="md" />}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-center text-white/50 text-sm px-8 mb-5 leading-relaxed">
          {profile.bio}
        </p>
      )}

      {/* Meta pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap px-5 mb-6">
        {profile.location_city && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px] text-white/70">
            <MapPin className="w-3 h-3" />
            {profile.location_city}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px] text-white/70">
          <Heart className="w-3 h-3" />
          {LOOKING_FOR_LABELS[profile.looking_for]}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px] text-white/70">
          <Users className="w-3 h-3" />
          {GENDER_LABELS[profile.gender]}
        </span>
      </div>

      <div className="px-5">
        {/* Interests */}
        {interests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[14px] font-semibold text-white/50 mb-3">
              Centres d&apos;intérêt
            </h2>
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

        {/* About section */}
        {aboutItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[14px] font-semibold text-white/50 mb-3">
              À propos
            </h2>
            <div className="bg-[#141416] border border-white/[0.04] rounded-2xl divide-y divide-white/[0.04]">
              {aboutItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-white/50">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-[12px] text-white/25">{item.label}</p>
                    <p className="text-sm text-white font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invisible mode toggle */}
        <div className="bg-[#141416] border border-white/[0.04] rounded-2xl p-4 mb-6">
          <h2 className="text-[14px] font-semibold text-white/50 mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Confidentialité
          </h2>
          <button
            onClick={toggleInvisibleMode}
            disabled={invisibleToggling}
            className="w-full flex items-center justify-between py-1"
          >
            <div className="flex items-center gap-3">
              {profile.invisible_mode ? (
                <div className="w-9 h-9 rounded-full bg-[#F9A8D4]/15 flex items-center justify-center">
                  <EyeOff className="w-4.5 h-4.5 text-[#F9A8D4]" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/[0.04] flex items-center justify-center">
                  <Eye className="w-4.5 h-4.5 text-white/50" />
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-white">Mode Invisible</p>
                <p className="text-[12px] text-white/25 mt-0.5">
                  Seules les personnes que tu likes peuvent voir ton profil
                </p>
              </div>
            </div>
            <div className={`w-[52px] h-[32px] rounded-full relative transition-colors duration-200 shrink-0 ${profile.invisible_mode ? 'bg-[#EC4899]' : 'bg-white/20'}`} style={profile.invisible_mode ? { background: 'linear-gradient(135deg, #F9A8D4 0%, #EC4899 100%)' } : undefined}>
              <div className="absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white shadow-md transition-[left] duration-200" style={{ left: profile.invisible_mode ? 23 : 3 }} />
            </div>
          </button>
        </div>

        {/* Action buttons */}
        <button
          onClick={() => router.push('/profile/edit')}
          className="w-full py-3.5 rounded-full text-white font-semibold text-sm mb-3 active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #F9A8D4 0%, #F472B6 50%, #EC4899 100%)' }}
        >
          <Edit3 className="w-4 h-4" />
          Modifier le profil
        </button>

        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-full text-white/30 text-sm font-medium active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
