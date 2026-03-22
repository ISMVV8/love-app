'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Save, Plus, X, Loader2, User, Ruler, Cigarette, Wine, Eye, Palette, Dumbbell } from 'lucide-react';
import Image from 'next/image';
import InterestBadge from '@/components/InterestBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import {
  GENDER_LABELS, LOOKING_FOR_LABELS, HAIR_COLOR_LABELS, EYE_COLOR_LABELS,
  BODY_TYPE_LABELS, SKIN_TONE_LABELS, SMOKING_LABELS, DRINKING_LABELS,
  MAX_BIO_LENGTH, MIN_AGE, MAX_AGE,
} from '@/lib/constants';
import type {
  Profile, Interest, ProfilePhoto, Gender, LookingFor,
  HairColor, EyeColor, BodyType, SkinTone, SmokingHabit, DrinkingHabit,
} from '@/lib/types';

interface ProfileFormProps {
  existingProfile?: Profile | null;
  existingPhotos?: ProfilePhoto[];
  existingInterestIds?: string[];
}

// Reusable chip selector
function ChipSelector<T extends string>({
  options,
  value,
  onChange,
  multi = false,
  multiValue,
  onMultiChange,
}: {
  options: Record<string, string>;
  value?: T | '';
  onChange?: (v: T) => void;
  multi?: boolean;
  multiValue?: T[];
  onMultiChange?: (v: T[]) => void;
}) {
  const entries = Object.entries(options) as [T, string][];
  const cols = entries.length <= 3 ? 'grid-cols-3' : entries.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  if (multi && multiValue && onMultiChange) {
    return (
      <div className={`grid ${cols} gap-2`}>
        {entries.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              onMultiChange(
                multiValue.includes(k)
                  ? multiValue.filter(v => v !== k)
                  : [...multiValue, k]
              );
            }}
            className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
              multiValue.includes(k)
                ? 'bg-[#E11D48] text-white'
                : 'bg-[#141416] border border-[white/[0.06]] text-zinc-300 active:scale-95'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${cols} gap-2`}>
      {entries.map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange?.(k)}
          className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
            value === k
              ? 'bg-[#E11D48] text-white'
              : 'bg-[#141416] border border-[white/[0.06]] text-zinc-300 active:scale-95'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <Icon className="w-5 h-5 text-[#52525B]" />
      {title}
    </h2>
  );
}

export default function ProfileForm({ existingProfile, existingPhotos = [], existingInterestIds = [] }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic info
  const [firstName, setFirstName] = useState(existingProfile?.first_name || '');
  const [birthDate, setBirthDate] = useState(existingProfile?.birth_date || '');
  const [gender, setGender] = useState<Gender | ''>(existingProfile?.gender || '');
  const [bio, setBio] = useState(existingProfile?.bio || '');
  const [lookingFor, setLookingFor] = useState<LookingFor>(existingProfile?.looking_for || 'not_sure');
  const [locationCity, setLocationCity] = useState(existingProfile?.location_city || '');

  // Physical attributes
  const [hairColor, setHairColor] = useState<HairColor | ''>(existingProfile?.hair_color || '');
  const [eyeColor, setEyeColor] = useState<EyeColor | ''>(existingProfile?.eye_color || '');
  const [bodyType, setBodyType] = useState<BodyType | ''>(existingProfile?.body_type || '');
  const [skinTone, setSkinTone] = useState<SkinTone | ''>(existingProfile?.skin_tone || '');
  const [heightCm, setHeightCm] = useState<number | ''>(existingProfile?.height_cm || '');
  const [smoking, setSmoking] = useState<SmokingHabit | ''>(existingProfile?.smoking || '');
  const [drinking, setDrinking] = useState<DrinkingHabit | ''>(existingProfile?.drinking || '');

  // Preferences
  const [maxDistance, setMaxDistance] = useState(existingProfile?.max_distance_km || 50);
  const [ageMin, setAgeMin] = useState(Math.max(existingProfile?.age_min || 18, 18));
  const [ageMax, setAgeMax] = useState(Math.max(existingProfile?.age_max || 35, 18));
  const [genderPreference, setGenderPreference] = useState<Gender[]>(existingProfile?.gender_preference || []);
  const [prefHairColor, setPrefHairColor] = useState<HairColor[]>(existingProfile?.pref_hair_color || []);
  const [prefEyeColor, setPrefEyeColor] = useState<EyeColor[]>(existingProfile?.pref_eye_color || []);
  const [prefBodyType, setPrefBodyType] = useState<BodyType[]>(existingProfile?.pref_body_type || []);
  const [prefSkinTone, setPrefSkinTone] = useState<SkinTone[]>(existingProfile?.pref_skin_tone || []);
  const [prefHeightMin, setPrefHeightMin] = useState<number | ''>(existingProfile?.pref_height_min || '');
  const [prefHeightMax, setPrefHeightMax] = useState<number | ''>(existingProfile?.pref_height_max || '');
  const [prefSmoking, setPrefSmoking] = useState<SmokingHabit[]>(existingProfile?.pref_smoking || []);
  const [prefDrinking, setPrefDrinking] = useState<DrinkingHabit[]>(existingProfile?.pref_drinking || []);

  // Photos & interests
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    existingPhotos.sort((a, b) => a.position - b.position).map(p => p.url)
  );
  const [selectedInterests, setSelectedInterests] = useState<string[]>(existingInterestIds);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);

  useEffect(() => {
    const fetchInterests = async () => {
      setLoading(true);
      const { data } = await supabase.from('interests').select('*').order('category');
      if (data) setAllInterests(data);
      setLoading(false);
    };
    fetchInterests();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Non authentifié'); return; }

    setUploading(true);
    setError(null);

    try {
      const remainingSlots = 6 - photoUrls.length;
      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const newUrls: string[] = [];

      for (const file of filesToUpload) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error(`Format non supporté: ${file.name}. Utilise JPG, PNG ou WebP.`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} dépasse 5MB.`);
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error(`Erreur upload: ${uploadError.message}`);

        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
        newUrls.push(urlData.publicUrl);
      }

      setPhotoUrls(prev => [...prev, ...newUrls]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'upload";
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = async (index: number) => {
    const url = photoUrls[index];
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));

    if (url.includes('supabase.co/storage')) {
      try {
        const path = url.split('/photos/')[1];
        if (path) await supabase.storage.from('photos').remove([decodeURIComponent(path)]);
      } catch { /* non-critical */ }
    }
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 6 ? [...prev, id] : prev
    );
  };

  const handleSave = async () => {
    setError(null);

    if (!firstName.trim()) { setError('Le prénom est requis'); return; }
    if (!birthDate) { setError('La date de naissance est requise'); return; }
    if (!gender) { setError('Le genre est requis'); return; }
    if (photoUrls.length === 0) { setError('Ajoute au moins une photo'); return; }

    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    if (age < 18) { setError('Tu dois avoir au moins 18 ans'); return; }

    const safeAgeMin = Math.max(ageMin || 18, 18);
    const safeAgeMax = Math.max(ageMax || 18, 18);

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Non authentifié'); setSaving(false); return; }

      const userId = session.user.id;
      const profileData = {
        id: userId,
        first_name: firstName.trim(),
        birth_date: birthDate,
        gender: gender as Gender,
        bio: bio.trim() || null,
        looking_for: lookingFor,
        location_city: locationCity.trim() || null,
        location_lat: 50.8503 + (Math.random() - 0.5) * 0.1,
        location_lng: 4.3517 + (Math.random() - 0.5) * 0.1,
        max_distance_km: maxDistance,
        age_min: safeAgeMin,
        age_max: safeAgeMax,
        gender_preference: genderPreference.length > 0 ? genderPreference : null,
        hair_color: hairColor || null,
        eye_color: eyeColor || null,
        body_type: bodyType || null,
        skin_tone: skinTone || null,
        height_cm: heightCm || null,
        smoking: smoking || null,
        drinking: drinking || null,
        pref_hair_color: prefHairColor.length > 0 ? prefHairColor : null,
        pref_eye_color: prefEyeColor.length > 0 ? prefEyeColor : null,
        pref_body_type: prefBodyType.length > 0 ? prefBodyType : null,
        pref_skin_tone: prefSkinTone.length > 0 ? prefSkinTone : null,
        pref_height_min: prefHeightMin || null,
        pref_height_max: prefHeightMax || null,
        pref_smoking: prefSmoking.length > 0 ? prefSmoking : null,
        pref_drinking: prefDrinking.length > 0 ? prefDrinking : null,
      };

      if (existingProfile) {
        const { error: updateErr } = await supabase.from('profiles').update(profileData).eq('id', userId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from('profiles').insert(profileData);
        if (insertErr) throw insertErr;
      }

      // Photos
      await supabase.from('profile_photos').delete().eq('profile_id', userId);
      if (photoUrls.length > 0) {
        const photoInserts = photoUrls.map((url, i) => ({
          profile_id: userId,
          url,
          position: i,
          is_primary: i === 0,
        }));
        const { error: photoErr } = await supabase.from('profile_photos').insert(photoInserts);
        if (photoErr) throw photoErr;
      }

      // Interests
      await supabase.from('profile_interests').delete().eq('profile_id', userId);
      if (selectedInterests.length > 0) {
        const interestInserts = selectedInterests.map(interestId => ({
          profile_id: userId,
          interest_id: interestId,
        }));
        const { error: intErr } = await supabase.from('profile_interests').insert(interestInserts);
        if (intErr) throw intErr;
      }

      router.replace('/discover');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LoadingSpinner text="Chargement..." />
      </div>
    );
  }

  const interestsByCategory = allInterests.reduce<Record<string, Interest[]>>((acc, interest) => {
    if (!acc[interest.category]) acc[interest.category] = [];
    acc[interest.category].push(interest);
    return acc;
  }, {});

  const maxBirthDate = new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="max-w-lg mx-auto px-4 pb-40">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== PHOTOS ========== */}
      <section className="mb-8">
        <SectionTitle icon={Camera} title={`Photos (${photoUrls.length}/6)`} />
        <div className="grid grid-cols-3 gap-3">
          {photoUrls.map((url, i) => (
            <motion.div
              key={`photo-${i}`}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-800"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              layout
            >
              <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 33vw, 150px" />
              <button type="button" onClick={() => removePhoto(i)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
              {i === 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-[#E11D48] text-[10px] font-semibold text-white">
                  Principale
                </div>
              )}
            </motion.div>
          ))}
          {photoUrls.length < 6 && (
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-[3/4] rounded-2xl bg-[#141416] border border-[white/[0.06]] flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
              whileTap={{ scale: 0.95 }}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-6 h-6 text-[#E11D48] animate-spin" />
                  <span className="text-xs text-zinc-400">Upload...</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#1A1A1E] border border-[#2A2A2C] flex items-center justify-center">
                    <Plus className="w-6 h-6 text-[#52525B]" />
                  </div>
                  <span className="text-xs text-zinc-400">Ajouter</span>
                </>
              )}
            </motion.button>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-2">JPG, PNG ou WebP · 5MB max</p>
      </section>

      {/* ========== INFOS DE BASE ========== */}
      <section className="mb-8">
        <SectionTitle icon={User} title="Informations" />
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={50}
              className="w-full bg-[#141416] border border-[white/[0.06]] rounded-xl py-3 px-4 text-white placeholder:text-zinc-500 focus:border-[#E11D48] transition-colors"
              placeholder="Ton prénom"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Date de naissance (18+ uniquement)</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={maxBirthDate}
              className="w-full bg-[#141416] border border-[white/[0.06]] rounded-xl py-3 px-4 text-white focus:border-[#E11D48] transition-colors [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Genre</label>
            <ChipSelector options={GENDER_LABELS} value={gender} onChange={(v) => setGender(v as Gender)} />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Bio ({bio.length}/{MAX_BIO_LENGTH})</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO_LENGTH}
              rows={3}
              className="w-full bg-[#141416] border border-[white/[0.06]] rounded-xl py-3 px-4 text-white placeholder:text-zinc-500 focus:border-[#E11D48] transition-colors resize-none"
              placeholder="Parle de toi en quelques mots..."
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Ville</label>
            <input
              type="text"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              className="w-full bg-[#141416] border border-[white/[0.06]] rounded-xl py-3 px-4 text-white placeholder:text-zinc-500 focus:border-[#E11D48] transition-colors"
              placeholder="Bruxelles"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Je recherche</label>
            <ChipSelector options={LOOKING_FOR_LABELS} value={lookingFor} onChange={(v) => setLookingFor(v as LookingFor)} />
          </div>
        </div>
      </section>

      {/* ========== APPARENCE ========== */}
      <section className="mb-8">
        <SectionTitle icon={Palette} title="Apparence" />
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Couleur de cheveux</label>
            <ChipSelector options={HAIR_COLOR_LABELS} value={hairColor} onChange={(v) => setHairColor(v as HairColor)} />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Couleur des yeux</label>
            <ChipSelector options={EYE_COLOR_LABELS} value={eyeColor} onChange={(v) => setEyeColor(v as EyeColor)} />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Couleur de peau</label>
            <ChipSelector options={SKIN_TONE_LABELS} value={skinTone} onChange={(v) => setSkinTone(v as SkinTone)} />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Corpulence</label>
            <ChipSelector options={BODY_TYPE_LABELS} value={bodyType} onChange={(v) => setBodyType(v as BodyType)} />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block flex items-center gap-2">
              <Ruler className="w-4 h-4" /> Taille (cm)
            </label>
            <input
              type="number"
              min={100}
              max={250}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : '')}
              placeholder="175"
              className="w-full bg-[#141416] border border-[white/[0.06]] rounded-xl py-3 px-4 text-white text-center placeholder:text-zinc-500 focus:border-[#E11D48] transition-colors"
            />
          </div>
        </div>
      </section>

      {/* ========== HABITUDES ========== */}
      <section className="mb-8">
        <SectionTitle icon={Cigarette} title="Habitudes" />
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-sm text-zinc-400 mb-2 flex items-center gap-2">
              <Cigarette className="w-4 h-4" /> Tabac
            </label>
            <ChipSelector options={SMOKING_LABELS} value={smoking} onChange={(v) => setSmoking(v as SmokingHabit)} />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-2 flex items-center gap-2">
              <Wine className="w-4 h-4" /> Alcool
            </label>
            <ChipSelector options={DRINKING_LABELS} value={drinking} onChange={(v) => setDrinking(v as DrinkingHabit)} />
          </div>
        </div>
      </section>

      {/* ========== INTÉRÊTS ========== */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-1">Intérêts ({selectedInterests.length}/6)</h2>
        <p className="text-sm text-zinc-400 mb-4">Choisis jusqu&apos;à 6 intérêts</p>
        {Object.entries(interestsByCategory).map(([category, interests]) => (
          <div key={category} className="mb-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{category}</p>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <InterestBadge
                  key={interest.id}
                  name={interest.name}
                  emoji={interest.emoji}
                  category={interest.category}
                  selected={selectedInterests.includes(interest.id)}
                  onToggle={() => toggleInterest(interest.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ========== PRÉFÉRENCES ========== */}
      <section className="mb-8">
        <SectionTitle icon={Eye} title="Mes préférences" />
        <p className="text-sm text-zinc-400 mb-5 -mt-2">Ce que tu recherches chez l&apos;autre (optionnel)</p>

        <div className="flex flex-col gap-6">
          {/* Distance */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 flex justify-between">
              <span>Distance max</span>
              <span className="text-white font-medium">{maxDistance} km</span>
            </label>
            <input type="range" min={1} max={500} value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))} className="w-full accent-[#E11D48]" />
          </div>

          {/* Age — forced 18+ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Âge min</label>
              <input
                type="number"
                min={MIN_AGE}
                max={MAX_AGE}
                value={ageMin}
                onChange={(e) => setAgeMin(Math.max(Number(e.target.value), MIN_AGE))}
                className="w-full bg-[#141416] border border-[white/[0.06]] rounded-xl py-3 px-4 text-white text-center focus:border-[#E11D48] transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Âge max</label>
              <input
                type="number"
                min={MIN_AGE}
                max={MAX_AGE}
                value={ageMax}
                onChange={(e) => setAgeMax(Math.max(Number(e.target.value), MIN_AGE))}
                className="w-full bg-[#141416] border border-[white/[0.06]] rounded-xl py-3 px-4 text-white text-center focus:border-[#E11D48] transition-colors"
              />
            </div>
          </div>

          {/* Genre */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Genre préféré</label>
            <ChipSelector options={GENDER_LABELS} multi multiValue={genderPreference} onMultiChange={(v) => setGenderPreference(v as Gender[])} />
          </div>

          {/* Cheveux */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Couleur de cheveux préférée</label>
            <ChipSelector options={HAIR_COLOR_LABELS} multi multiValue={prefHairColor} onMultiChange={(v) => setPrefHairColor(v as HairColor[])} />
          </div>

          {/* Yeux */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Couleur des yeux préférée</label>
            <ChipSelector options={EYE_COLOR_LABELS} multi multiValue={prefEyeColor} onMultiChange={(v) => setPrefEyeColor(v as EyeColor[])} />
          </div>

          {/* Peau */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Teint préféré</label>
            <ChipSelector options={SKIN_TONE_LABELS} multi multiValue={prefSkinTone} onMultiChange={(v) => setPrefSkinTone(v as SkinTone[])} />
          </div>

          {/* Corpulence */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block flex items-center gap-2">
              <Dumbbell className="w-4 h-4" /> Corpulence préférée
            </label>
            <ChipSelector options={BODY_TYPE_LABELS} multi multiValue={prefBodyType} onMultiChange={(v) => setPrefBodyType(v as BodyType[])} />
          </div>

          {/* Taille */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Taille min (cm)</label>
              <input
                type="number"
                min={100}
                max={250}
                value={prefHeightMin}
                onChange={(e) => setPrefHeightMin(e.target.value ? Number(e.target.value) : '')}
                placeholder="150"
                className="w-full bg-[#141416] border border-[white/[0.06]] rounded-xl py-3 px-4 text-white text-center placeholder:text-zinc-500 focus:border-[#E11D48] transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Taille max (cm)</label>
              <input
                type="number"
                min={100}
                max={250}
                value={prefHeightMax}
                onChange={(e) => setPrefHeightMax(e.target.value ? Number(e.target.value) : '')}
                placeholder="200"
                className="w-full bg-[#141416] border border-[white/[0.06]] rounded-xl py-3 px-4 text-white text-center placeholder:text-zinc-500 focus:border-[#E11D48] transition-colors"
              />
            </div>
          </div>

          {/* Tabac */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Tabac accepté</label>
            <ChipSelector options={SMOKING_LABELS} multi multiValue={prefSmoking} onMultiChange={(v) => setPrefSmoking(v as SmokingHabit[])} />
          </div>

          {/* Alcool */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Alcool accepté</label>
            <ChipSelector options={DRINKING_LABELS} multi multiValue={prefDrinking} onMultiChange={(v) => setPrefDrinking(v as DrinkingHabit[])} />
          </div>
        </div>
      </section>

      {/* ========== SAVE BUTTON ========== */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-[#09090B] via-[#09090B]/95 to-transparent pt-8">
        <div className="max-w-lg mx-auto">
          <motion.button
            onClick={handleSave}
            disabled={saving || uploading}
            className="btn-primary w-full py-4 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50"
            whileTap={{ scale: 0.97 }}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Sauvegarder
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
