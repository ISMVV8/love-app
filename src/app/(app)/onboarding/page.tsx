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

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState('');
  const [hairColor, setHairColor] = useState<HairColor | null>(null);
  const [eyeColor, setEyeColor] = useState<EyeColor | null>(null);
  const [skinTone, setSkinTone] = useState<SkinTone | null>(null);
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [smoking, setSmoking] = useState<SmokingHabit | null>(null);
  const [drinking, setDrinking] = useState<DrinkingHabit | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<LookingFor | null>(null);
  const [genderPreference, setGenderPreference] = useState<Gender[]>([]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [maxDistance, setMaxDistance] = useState(50);

  useEffect(() => {
    const fetchInterests = async () => {
      const { data } = await supabase.from('interests').select('*').order('category').order('name');
      if (data) setInterests(data as Interest[]);
    };
    fetchInterests();
  }, []);

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

  const canContinue = useCallback((): boolean => {
    switch (step) {
      case 1: return true;
      case 2: return firstName.trim().length > 0;
      case 3: return birthDate !== '' && isAtLeast18(birthDate);
      case 4: return gender !== null;
      case 5: return photoUrls.length >= 2;
      case 6: return true;
      case 7: return true;
      case 8: return true;
      case 9: return true;
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

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  };

  const toggleGenderPref = (g: Gender) => {
    setGenderPreference((prev) => {
      if (prev.includes(g)) return prev.filter((x) => x !== g);
      return [...prev, g];
    });
  };

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

  const interestsByCategory = interests.reduce<Record<string, Interest[]>>((acc, interest) => {
    if (!acc[interest.category]) acc[interest.category] = [];
    acc[interest.category].push(interest);
    return acc;
  }, {});

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
          className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
            value === key
              ? 'bg-[#E11D48] text-white'
              : 'border border-white/[0.06] bg-[#141416] text-[#A1A1AA] hover:bg-[#1A1A1E]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

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
          className={`rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
            values.includes(key as T)
              ? 'bg-[#E11D48] text-white'
              : 'border border-white/[0.06] bg-[#141416] text-[#A1A1AA] hover:bg-[#1A1A1E]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const renderStep = () => {
    switch (step) {
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
            <h1 className="mb-2 text-4xl font-bold text-[#E11D48]">
              C&apos;est parti !
            </h1>
            <p className="text-[#A1A1AA]">Crée ton profil en quelques étapes</p>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Comment tu t&apos;appelles ?</h1>
            <p className="mb-6 text-sm text-[#A1A1AA]">Ton prénom sera visible sur ton profil</p>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ton prénom"
              autoFocus
              maxLength={50}
              className="w-full rounded-xl border border-white/[0.06] bg-[#141416] px-4 py-3.5 text-lg text-white placeholder-[#52525B] outline-none transition-colors focus:border-[#E11D48]"
            />
          </div>
        );

      case 3:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Quelle est ta date de naissance ?</h1>
            <p className="mb-6 text-sm text-[#A1A1AA]">Tu dois avoir au moins 18 ans</p>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              className="w-full rounded-xl border border-white/[0.06] bg-[#141416] px-4 py-3.5 text-white outline-none transition-colors focus:border-[#E11D48] [color-scheme:dark]"
            />
            {birthDate && !isAtLeast18(birthDate) && (
              <p className="mt-2 text-sm text-red-400">Tu dois avoir au moins 18 ans</p>
            )}
          </div>
        );

      case 4:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Quel est ton genre ?</h1>
            <p className="mb-6 text-sm text-[#A1A1AA]">Sélectionne une option</p>
            <ChipSelector<Gender>
              options={GENDER_LABELS}
              value={gender}
              onChange={setGender}
            />
          </div>
        );

      case 5:
        return (
          <div className="flex flex-1 flex-col">
            <h1 className="mb-2 text-2xl font-bold text-white">Tes photos</h1>
            <p className="mb-6 text-sm text-[#A1A1AA]">
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
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-[#E11D48] px-2 py-0.5 text-[10px] font-semibold text-white">
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
                  className="flex aspect-[3/4] items-center justify-center rounded-2xl border-2 border-dashed border-white/[0.1] text-[#52525B] transition-colors hover:border-[#E11D48]/30 hover:text-[#A1A1AA]"
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
              <p className="mt-3 text-center text-xs text-[#52525B]">
                {photoUrls.length === 0 ? 'Ajoute au moins 2 photos' : `Encore ${2 - photoUrls.length} photo requise`}
              </p>
            )}
          </div>
        );

      case 6:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Parle de toi</h1>
            <p className="mb-6 text-sm text-[#A1A1AA]">Optionnel, mais ça aide à briser la glace</p>
            <div className="relative">
              <textarea
                value={bio}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_BIO_LENGTH) setBio(e.target.value);
                }}
                placeholder="Décris-toi en quelques mots..."
                rows={5}
                className="w-full resize-none rounded-xl border border-white/[0.06] bg-[#141416] px-4 py-3.5 text-white placeholder-[#52525B] outline-none transition-colors focus:border-[#E11D48]"
              />
              <span className="absolute bottom-3 right-3 text-xs text-[#52525B]">
                {bio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>
          </div>
        );

      case 7: {
        const hairOptions: { key: HairColor; label: string; color: string }[] = [
          { key: 'black', label: 'Noir', color: '#1C1C1E' },
          { key: 'brown', label: 'Brun', color: '#6B3A2A' },
          { key: 'blonde', label: 'Blond', color: '#D4A843' },
          { key: 'red', label: 'Roux', color: '#A0422A' },
          { key: 'gray', label: 'Gris', color: '#8E8E93' },
          { key: 'white', label: 'Blanc', color: '#D1D1D6' },
          { key: 'other', label: 'Autre', color: '#E11D48' },
        ];

        const eyeOptions: { key: EyeColor; label: string; color: string }[] = [
          { key: 'brown', label: 'Marron', color: '#6B3A2A' },
          { key: 'blue', label: 'Bleu', color: '#3B82F6' },
          { key: 'green', label: 'Vert', color: '#22C55E' },
          { key: 'hazel', label: 'Noisette', color: '#A0845B' },
          { key: 'gray', label: 'Gris', color: '#71717A' },
          { key: 'other', label: 'Autre', color: '#E11D48' },
        ];

        const skinOptions: { key: SkinTone; label: string; color: string }[] = [
          { key: 'very_light', label: 'Très clair', color: '#F5E0CC' },
          { key: 'light', label: 'Clair', color: '#E8C4A0' },
          { key: 'medium', label: 'Médium', color: '#C8956C' },
          { key: 'olive', label: 'Olive', color: '#B07D56' },
          { key: 'brown', label: 'Mat', color: '#8B5E3C' },
          { key: 'dark', label: 'Foncé', color: '#5C3A24' },
        ];

        const bodyOptions: { key: BodyType; label: string; widths: [number, number, number] }[] = [
          { key: 'slim', label: 'Mince', widths: [14, 10, 12] },
          { key: 'average', label: 'Moyen', widths: [18, 14, 16] },
          { key: 'athletic', label: 'Athlétique', widths: [20, 14, 18] },
          { key: 'curvy', label: 'Rond·e', widths: [22, 16, 22] },
          { key: 'other', label: 'Autre', widths: [16, 12, 14] },
        ];

        const ColorCircle = ({ color, selected, onClick, label, size = 44 }: {
          color: string; selected: boolean; onClick: () => void; label: string; size?: number;
        }) => (
          <motion.button
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-1.5"
            whileTap={{ scale: 0.9 }}
          >
            <div
              className={`rounded-full transition-all duration-200 ${
                selected ? 'ring-[3px] ring-[#E11D48] ring-offset-2 ring-offset-[#09090B]' : ''
              }`}
              style={{
                width: size,
                height: size,
                background: color,
              }}
            />
            <span className={`text-[11px] font-medium ${selected ? 'text-white' : 'text-[#52525B]'}`}>
              {label}
            </span>
          </motion.button>
        );

        return (
          <div className="flex flex-1 flex-col overflow-y-auto -mx-2 px-2 pb-4">
            <h1 className="mb-1 text-2xl font-bold text-white">Ton apparence</h1>
            <p className="mb-6 text-sm text-[#A1A1AA]">Optionnel — aide-nous à te connaître</p>

            <div className="mb-7">
              <p className="mb-3 text-[13px] font-semibold text-[#A1A1AA] tracking-wide uppercase">Cheveux</p>
              <div className="flex flex-wrap gap-4 justify-start">
                {hairOptions.map((opt) => (
                  <ColorCircle
                    key={opt.key}
                    color={opt.color}
                    selected={hairColor === opt.key}
                    onClick={() => setHairColor(hairColor === opt.key ? null : opt.key)}
                    label={opt.label}
                  />
                ))}
              </div>
            </div>

            <div className="mb-7">
              <p className="mb-3 text-[13px] font-semibold text-[#A1A1AA] tracking-wide uppercase">Yeux</p>
              <div className="flex flex-wrap gap-4 justify-start">
                {eyeOptions.map((opt) => (
                  <ColorCircle
                    key={opt.key}
                    color={opt.color}
                    selected={eyeColor === opt.key}
                    onClick={() => setEyeColor(eyeColor === opt.key ? null : opt.key)}
                    label={opt.label}
                  />
                ))}
              </div>
            </div>

            <div className="mb-7">
              <p className="mb-3 text-[13px] font-semibold text-[#A1A1AA] tracking-wide uppercase">Teint</p>
              <div className="flex gap-2">
                {skinOptions.map((opt) => (
                  <motion.button
                    key={opt.key}
                    type="button"
                    onClick={() => setSkinTone(skinTone === opt.key ? null : opt.key)}
                    className="flex-1 flex flex-col items-center gap-2"
                    whileTap={{ scale: 0.92 }}
                  >
                    <div
                      className={`w-full aspect-[1/1.3] rounded-xl transition-all duration-200 ${
                        skinTone === opt.key
                          ? 'ring-[3px] ring-[#E11D48] ring-offset-2 ring-offset-[#09090B] scale-105'
                          : 'hover:scale-[1.02]'
                      }`}
                      style={{ backgroundColor: opt.color }}
                    />
                    <span className={`text-[10px] font-medium ${
                      skinTone === opt.key ? 'text-white' : 'text-[#52525B]'
                    }`}>
                      {opt.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <p className="mb-3 text-[13px] font-semibold text-[#A1A1AA] tracking-wide uppercase">Silhouette</p>
              <div className="flex gap-2">
                {bodyOptions.map((opt) => (
                  <motion.button
                    key={opt.key}
                    type="button"
                    onClick={() => setBodyType(bodyType === opt.key ? null : opt.key)}
                    className={`flex-1 flex flex-col items-center gap-2 rounded-2xl py-4 transition-all duration-200 ${
                      bodyType === opt.key
                        ? 'bg-[#1A1A1E] ring-[2px] ring-[#E11D48]'
                        : 'bg-[#141416] hover:bg-[#1A1A1E]'
                    }`}
                    whileTap={{ scale: 0.92 }}
                  >
                    <svg width="28" height="48" viewBox="0 0 28 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="14" cy="6" r="5" fill={bodyType === opt.key ? '#E11D48' : '#52525b'} />
                      <rect x={14 - opt.widths[0] / 2} y="13" width={opt.widths[0]} height="3" rx="1.5"
                        fill={bodyType === opt.key ? '#E11D48' : '#52525b'} />
                      <rect x={14 - opt.widths[1] / 2} y="16" width={opt.widths[1]} height="14" rx="2"
                        fill={bodyType === opt.key ? '#E11D48' : '#3f3f46'} opacity={bodyType === opt.key ? 0.7 : 1} />
                      <rect x={14 - opt.widths[2] / 2} y="30" width={opt.widths[2]} height="4" rx="2"
                        fill={bodyType === opt.key ? '#E11D48' : '#3f3f46'} opacity={bodyType === opt.key ? 0.7 : 1} />
                      <rect x="9" y="34" width="3.5" height="12" rx="1.5"
                        fill={bodyType === opt.key ? '#E11D48' : '#27272a'} opacity={bodyType === opt.key ? 0.5 : 1} />
                      <rect x="15.5" y="34" width="3.5" height="12" rx="1.5"
                        fill={bodyType === opt.key ? '#E11D48' : '#27272a'} opacity={bodyType === opt.key ? 0.5 : 1} />
                    </svg>
                    <span className={`text-[11px] font-medium ${
                      bodyType === opt.key ? 'text-white' : 'text-[#52525B]'
                    }`}>
                      {opt.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[13px] font-semibold text-[#A1A1AA] tracking-wide uppercase">Taille</p>
              <div className="rounded-2xl bg-[#141416] border border-white/[0.06] p-5">
                <div className="text-center mb-4">
                  <motion.p
                    className="text-4xl font-bold text-white"
                    key={heightCm}
                    initial={{ y: -5, opacity: 0.5 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.1 }}
                  >
                    {heightCm ? (
                      <>
                        {heightCm}
                        <span className="text-lg font-normal text-[#52525B] ml-1">cm</span>
                      </>
                    ) : (
                      <span className="text-[#52525B]">—</span>
                    )}
                  </motion.p>
                </div>
                <input
                  type="range"
                  value={heightCm ?? 170}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  min={140}
                  max={210}
                  step={1}
                  className="w-full accent-[#E11D48] h-1.5"
                />
                <div className="flex justify-between mt-2 text-[11px] text-[#52525B]">
                  <span>140</span>
                  <span>175</span>
                  <span>210</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 8:
        return (
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-2 text-2xl font-bold text-white">Tes habitudes</h1>
            <p className="mb-6 text-sm text-[#A1A1AA]">Optionnel</p>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#A1A1AA]">Tabac</label>
                <ChipSelector<SmokingHabit>
                  options={SMOKING_LABELS}
                  value={smoking}
                  onChange={setSmoking}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A1A1AA]">Alcool</label>
                <ChipSelector<DrinkingHabit>
                  options={DRINKING_LABELS}
                  value={drinking}
                  onChange={setDrinking}
                />
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <h1 className="mb-2 text-2xl font-bold text-white">Tes passions</h1>
            <p className="mb-6 text-sm text-[#A1A1AA]">
              {"Choisis jusqu'à 6 centres d'intérêt"} ({selectedInterests.length}/6)
            </p>

            <div className="space-y-5">
              {Object.entries(interestsByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#52525B]">
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

      case 10:
        return (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <h1 className="mb-2 text-2xl font-bold text-white">Qu&apos;est-ce que tu recherches ?</h1>
            <p className="mb-6 text-sm text-[#A1A1AA]">Dis-nous ce que tu cherches</p>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#A1A1AA]">Type de relation</label>
                <ChipSelector<LookingFor>
                  options={LOOKING_FOR_LABELS}
                  value={lookingFor}
                  onChange={setLookingFor}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A1A1AA]">Genre recherché</label>
                <MultiChipSelector<Gender>
                  options={GENDER_LABELS}
                  values={genderPreference}
                  onToggle={toggleGenderPref}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A1A1AA]">{"Tranche d'âge"}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={ageMin}
                    onChange={(e) => setAgeMin(Math.max(18, Math.min(Number(e.target.value), ageMax)))}
                    min={18}
                    max={99}
                    className="w-20 rounded-xl border border-white/[0.06] bg-[#141416] px-3 py-2.5 text-center text-white outline-none focus:border-[#E11D48]"
                  />
                  <span className="text-[#52525B]">à</span>
                  <input
                    type="number"
                    value={ageMax}
                    onChange={(e) => setAgeMax(Math.max(ageMin, Math.min(Number(e.target.value), 99)))}
                    min={18}
                    max={99}
                    className="w-20 rounded-xl border border-white/[0.06] bg-[#141416] px-3 py-2.5 text-center text-white outline-none focus:border-[#E11D48]"
                  />
                  <span className="text-sm text-[#52525B]">ans</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#A1A1AA]">
                  Distance max : {maxDistance} km
                </label>
                <input
                  type="range"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  min={1}
                  max={500}
                  className="w-full accent-[#E11D48]"
                />
                <div className="mt-1 flex justify-between text-xs text-[#52525B]">
                  <span>1 km</span>
                  <span>500 km</span>
                </div>
              </div>
            </div>
          </div>
        );

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
            <p className="mb-8 text-lg text-[#A1A1AA]">{firstName}, ton profil est complet</p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-full bg-[#E11D48] py-4 text-base font-semibold text-white transition-opacity disabled:opacity-40"
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
    <div className="flex min-h-dvh flex-col bg-[#09090B]">
      {/* Progress bar */}
      <div className="px-4 pt-4">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-[#E11D48]"
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
            className="flex items-center gap-1 text-sm text-[#A1A1AA] transition-colors hover:text-white"
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

        {step < TOTAL_STEPS && (
          <motion.button
            type="button"
            onClick={goNext}
            disabled={!canContinue()}
            className="mt-4 w-full shrink-0 rounded-full bg-[#E11D48] py-4 text-base font-semibold text-white transition-opacity disabled:opacity-40"
            whileTap={{ scale: 0.98 }}
          >
            Continuer
          </motion.button>
        )}
      </div>
    </div>
  );
}
