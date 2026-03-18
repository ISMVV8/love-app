'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InterestBadge from '@/components/InterestBadge';
import {
  GENDER_LABELS,
  LOOKING_FOR_LABELS,
  HAIR_COLOR_LABELS,
  EYE_COLOR_LABELS,
  BODY_TYPE_LABELS,
  SKIN_TONE_LABELS,
  SMOKING_LABELS,
  DRINKING_LABELS,
  MAX_BIO_LENGTH,
} from '@/lib/constants';
import type {
  Gender,
  LookingFor,
  HairColor,
  EyeColor,
  BodyType,
  SkinTone,
  SmokingHabit,
  DrinkingHabit,
  Interest,
} from '@/lib/types';

const TOTAL_STEPS = 11;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction * 300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction * -300,
    opacity: 0,
  }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigation
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 2: First name
  const [firstName, setFirstName] = useState('');

  // Step 3: Birth date
  const [birthDate, setBirthDate] = useState('');

  // Step 4: Gender
  const [gender, setGender] = useState<Gender | null>(null);

  // Step 5: Photos
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Step 6: Bio
  const [bio, setBio] = useState('');

  // Step 7: Appearance
  const [hairColor, setHairColor] = useState<HairColor | null>(null);
  const [eyeColor, setEyeColor] = useState<EyeColor | null>(null);
  const [skinTone, setSkinTone] = useState<SkinTone | null>(null);
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);

  // Step 8: Habits
  const [smoking, setSmoking] = useState<SmokingHabit | null>(null);
  const [drinking, setDrinking] = useState<DrinkingHabit | null>(null);

  // Step 9: Interests
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Step 10: Preferences
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(null);
  const [genderPreference, setGenderPreference] = useState<Gender[]>([]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [maxDistance, setMaxDistance] = useState(50);

  // Fetch interests
  useEffect(() => {
    const fetchInterests = async () => {
      const { data } = await supabase.from('interests').select('*').order('category').order('name');
      if (data) setInterests(data as Interest[]);
    };
    fetchInterests();
  }, []);

  // Age validation
  const isAtLeast18 = useCallback((dateStr: string): boolean => {
    if (!dateStr) return false;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18;
  }, []);

  // Step validation
  const canContinue = useCallback((): boolean => {
    switch (step) {
      case 1: return true;
      case 2: return firstName.trim().length > 0;
      case 3: return birthDate !== '' && isAtLeast18(birthDate);
      case 4: return gender !== null;
      case 5: return photoUrls.length >= 2;
      case 6: return true; // Bio is optional
      case 7: return true; // Appearance is optional
      case 8: return true; // Habits are optional
      case 9: return true; // Interests are optional
      case 10: return lookingFor !== null;
      case 11: return true;
      default: return false;
    }
  }, [step, firstName, birthDate, gender, photoUrls.length, lookingFor, isAtLeast18]);

  const goNext = () => {
    if (step < TOTAL_STEPS && canContinue()) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  // Photo upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUploading(true);
    try {
      const remainingSlots = 6 - photoUrls.length;
      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const newUrls: string[] = [];
      for (const file of filesToUpload) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
        if (file.size > 5 * 1024 * 1024) continue;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('photos').upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (error) continue;
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
        newUrls.push(urlData.publicUrl);
      }
      setPhotoUrls((prev) => [...prev, ...newUrls]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle interest
  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  };

  // Toggle gender preference
  const toggleGenderPref = (g: Gender) => {
    setGenderPreference((prev) => {
      if (prev.includes(g)) return prev.filter((x) => x !== g);
      return [...prev, g];
    });
  };

  // Submit
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      await supabase.from('profiles').insert({
        id: userId,
        first_name: firstName.trim(),
        birth_date: birthDate,
        gender: gender!,
        bio: bio.trim() || null,
        looking_for: lookingFor!,
        location_city: null,
        location_lat: 50.8503 + (Math.random() - 0.5) * 0.1,
        location_lng: 4.3517 + (Math.random() - 0.5) * 0.1,
        max_distance_km: maxDistance,
        age_min: Math.max(ageMin, 18),
        age_max: Math.max(ageMax, 18),
        gender_preference: genderPreference.length > 0 ? genderPreference : null,
        hair_color: hairColor || null,
        eye_color: eyeColor || null,
        body_type: bodyType || null,
        skin_tone: skinTone || null,
        height_cm: heightCm || null,
        smoking: smoking || null,
        drinking: drinking || null,
        pref_hair_color: null,
        pref_eye_color: null,
        pref_body_type: null,
        pref_skin_tone: null,
        pref_height_min: null,
        pref_height_max: null,
        pref_smoking: null,
        pref_drinking: null,
      });

      await supabase.from('profile_photos').insert(
        photoUrls.map((url, i) => ({
          profile_id: userId,
          url,
          position: i,
          is_primary: i === 0,
        }))
      );

      if (selectedInterests.length > 0) {
        await supabase.from('profile_interests').insert(
          selectedInterests.map((id) => ({
            profile_id: userId,
            interest_id: id,
          }))
        );
      }

      router.replace('/discover');
    } catch {
      setSubmitting(false);
    }
  };

  // Group interests by category
  const interestsByCategory = interests.reduce<Record<string, Interest[]>>((acc, interest) => {
    if (!acc[interest.category]) acc[interest.category] = [];
    acc[interest.category].push(interest);
    return acc;
  }, {});

  // Chip selector helper
  const ChipSelector = <T extends string>({
    options,
    value,
    onChange,
  }: {
    options: Record<string, string>;
    value: T | null;
    onChange: (val: T) => void;
  }) => (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key as T)}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
            value === key
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // Multi-chip selector helper
  const MultiChipSelector = <T extends string>({
    options,
    values,
    onToggle,
  }: {
    options: Record<string, string>;
    values: T[];
    onToggle: (val: T) => void;
  }) => (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key as T)}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
            values.includes(key as T)
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      // Step 1: Welcome
      case 1:
        return (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.div
              className="mb-6 text-7xl"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              ❤️
            </motion.div>
            <h1 className="mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-4xl font-bold text-transparent">
              C&apos;est parti !
            </h1>
            <p className="text-zinc-400">Crée ton profil en quelques étapes</p>
          </div>
        );

      // Step 2: First name
      case 2:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Comment tu t&apos;appelles ?</h1>
            <p className="mb-6 text-sm text-zinc-400">Ton prénom sera visible sur ton profil</p>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ton prénom"
              autoFocus
              maxLength={50}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white placeholder-zinc-500 outline-none transition-colors focus:border-pink-500/50"
            />
          </div>
        );

      // Step 3: Birth date
      case 3:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Quelle est ta date de naissance ?</h1>
            <p className="mb-6 text-sm text-zinc-400">Tu dois avoir au moins 18 ans</p>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-pink-500/50 [color-scheme:dark]"
            />
            {birthDate && !isAtLeast18(birthDate) && (
              <p className="mt-2 text-sm text-red-400">Tu dois avoir au moins 18 ans</p>
            )}
          </div>
        );

      // Step 4: Gender
      case 4:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Quel est ton genre ?</h1>
            <p className="mb-6 text-sm text-zinc-400">Sélectionne une option</p>
            <ChipSelector<Gender>
              options={GENDER_LABELS}
              value={gender}
              onChange={setGender}
            />
          </div>
        );

      // Step 5: Photos
      case 5:
        return (
          <div className="flex flex-1 flex-col">
            <h1 className="mb-2 text-2xl font-bold text-white">Tes photos</h1>
            <p className="mb-6 text-sm text-zinc-400">
              Ajoute au moins 2 photos (max 6). Formats : JPG, PNG, WebP. Max 5 Mo.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="grid grid-cols-3 gap-3">
              {photoUrls.map((url, i) => (
                <div key={url} className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                  <Image
                    src={url}
                    alt={`Photo ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 200px"
                  />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Principale
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photoUrls.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-[3/4] items-center justify-center rounded-2xl border-2 border-dashed border-white/10 text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-400"
                >
                  {uploading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Plus size={24} />
                  )}
                </button>
              )}
            </div>
            {photoUrls.length < 2 && (
              <p className="mt-3 text-center text-xs text-zinc-500">
                {photoUrls.length === 0 ? 'Ajoute au moins 2 photos' : `Encore ${2 - photoUrls.length} photo requise`}
              </p>
            )}
          </div>
        );

      // Step 6: Bio
      case 6:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Parle de toi</h1>
            <p className="mb-6 text-sm text-zinc-400">Optionnel, mais ça aide à briser la glace</p>
            <div className="relative">
              <textarea
                value={bio}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_BIO_LENGTH) setBio(e.target.value);
                }}
                placeholder="Décris-toi en quelques mots..."
                rows={5}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 outline-none transition-colors focus:border-pink-500/50"
              />
              <span className="absolute bottom-3 right-3 text-xs text-zinc-500">
                {bio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>
          </div>
        );

      // Step 7: Appearance
      case 7:
        return (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <h1 className="mb-2 text-2xl font-bold text-white">Ton apparence</h1>
            <p className="mb-6 text-sm text-zinc-400">Toutes ces infos sont optionnelles</p>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Cheveux</label>
                <ChipSelector<HairColor>
                  options={HAIR_COLOR_LABELS}
                  value={hairColor}
                  onChange={setHairColor}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Yeux</label>
                <ChipSelector<EyeColor>
                  options={EYE_COLOR_LABELS}
                  value={eyeColor}
                  onChange={setEyeColor}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Teint</label>
                <ChipSelector<SkinTone>
                  options={SKIN_TONE_LABELS}
                  value={skinTone}
                  onChange={setSkinTone}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Silhouette</label>
                <ChipSelector<BodyType>
                  options={BODY_TYPE_LABELS}
                  value={bodyType}
                  onChange={setBodyType}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Taille (cm)</label>
                <input
                  type="number"
                  value={heightCm ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : Math.min(250, Math.max(100, Number(e.target.value)));
                    setHeightCm(v);
                  }}
                  min={100}
                  max={250}
                  placeholder="Ex : 175"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 outline-none transition-colors focus:border-pink-500/50"
                />
              </div>
            </div>
          </div>
        );

      // Step 8: Habits
      case 8:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Tes habitudes</h1>
            <p className="mb-6 text-sm text-zinc-400">Optionnel</p>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Tabac</label>
                <ChipSelector<SmokingHabit>
                  options={SMOKING_LABELS}
                  value={smoking}
                  onChange={setSmoking}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Alcool</label>
                <ChipSelector<DrinkingHabit>
                  options={DRINKING_LABELS}
                  value={drinking}
                  onChange={setDrinking}
                />
              </div>
            </div>
          </div>
        );

      // Step 9: Interests
      case 9:
        return (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <h1 className="mb-2 text-2xl font-bold text-white">Tes passions</h1>
            <p className="mb-6 text-sm text-zinc-400">
              {"Choisis jusqu'à 6 centres d'intérêt"} ({selectedInterests.length}/6)
            </p>

            <div className="space-y-5">
              {Object.entries(interestsByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((interest) => (
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
            </div>
          </div>
        );

      // Step 10: Preferences
      case 10:
        return (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <h1 className="mb-2 text-2xl font-bold text-white">Qu&apos;est-ce que tu recherches ?</h1>
            <p className="mb-6 text-sm text-zinc-400">Dis-nous ce que tu cherches</p>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Type de relation</label>
                <ChipSelector<LookingFor>
                  options={LOOKING_FOR_LABELS}
                  value={lookingFor}
                  onChange={setLookingFor}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Genre recherché</label>
                <MultiChipSelector<Gender>
                  options={GENDER_LABELS}
                  values={genderPreference}
                  onToggle={toggleGenderPref}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">{"Tranche d'âge"}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={ageMin}
                    onChange={(e) => setAgeMin(Math.max(18, Math.min(Number(e.target.value), ageMax)))}
                    min={18}
                    max={99}
                    className="w-20 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center text-white outline-none focus:border-pink-500/50"
                  />
                  <span className="text-zinc-500">a</span>
                  <input
                    type="number"
                    value={ageMax}
                    onChange={(e) => setAgeMax(Math.max(ageMin, Math.min(Number(e.target.value), 99)))}
                    min={18}
                    max={99}
                    className="w-20 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center text-white outline-none focus:border-pink-500/50"
                  />
                  <span className="text-sm text-zinc-500">ans</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Distance max : {maxDistance} km
                </label>
                <input
                  type="range"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  min={1}
                  max={500}
                  className="w-full accent-pink-500"
                />
                <div className="mt-1 flex justify-between text-xs text-zinc-500">
                  <span>1 km</span>
                  <span>500 km</span>
                </div>
              </div>
            </div>
          </div>
        );

      // Step 11: Summary
      case 11:
        return (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            {photoUrls[0] && (
              <div className="relative mb-6 h-48 w-36 overflow-hidden rounded-2xl">
                <Image
                  src={photoUrls[0]}
                  alt={firstName}
                  fill
                  className="object-cover"
                  sizes="144px"
                />
              </div>
            )}
            <h1 className="mb-2 text-2xl font-bold text-white">{"Prêt·e !"}</h1>
            <p className="mb-8 text-lg text-zinc-300">{firstName}, ton profil est complet</p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-4 text-base font-semibold text-white transition-opacity disabled:opacity-40"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                'Commence à swiper'
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#09090b]">
      {/* Progress bar */}
      <div className="px-4 pt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center px-4 py-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={18} />
            <span>Retour</span>
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Content */}
      <div className="relative flex flex-1 flex-col overflow-hidden px-6 pb-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex flex-1 flex-col"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Continue button (hidden on step 11 since it has its own CTA) */}
        {step < TOTAL_STEPS && (
          <motion.button
            type="button"
            onClick={goNext}
            disabled={!canContinue()}
            className="mt-4 w-full shrink-0 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-4 text-base font-semibold text-white transition-opacity disabled:opacity-40"
            whileTap={{ scale: 0.98 }}
          >
            Continuer
          </motion.button>
        )}
      </div>
    </div>
  );
}
