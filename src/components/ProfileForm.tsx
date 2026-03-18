'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Save, Plus, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import InterestBadge from '@/components/InterestBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { GENDER_LABELS, LOOKING_FOR_LABELS, MAX_BIO_LENGTH, MIN_AGE, MAX_AGE } from '@/lib/constants';
import type { Profile, Interest, ProfilePhoto, Gender, LookingFor } from '@/lib/types';

interface ProfileFormProps {
  existingProfile?: Profile | null;
  existingPhotos?: ProfilePhoto[];
  existingInterestIds?: string[];
}

export default function ProfileForm({ existingProfile, existingPhotos = [], existingInterestIds = [] }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(existingProfile?.first_name || '');
  const [birthDate, setBirthDate] = useState(existingProfile?.birth_date || '');
  const [gender, setGender] = useState<Gender | ''>(existingProfile?.gender || '');
  const [bio, setBio] = useState(existingProfile?.bio || '');
  const [lookingFor, setLookingFor] = useState<LookingFor>(existingProfile?.looking_for || 'not_sure');
  const [locationCity, setLocationCity] = useState(existingProfile?.location_city || '');
  const [maxDistance, setMaxDistance] = useState(existingProfile?.max_distance_km || 50);
  const [ageMin, setAgeMin] = useState(existingProfile?.age_min || 18);
  const [ageMax, setAgeMax] = useState(existingProfile?.age_max || 35);
  const [genderPreference, setGenderPreference] = useState<Gender[]>(existingProfile?.gender_preference || []);

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
        // Validate file
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
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw new Error(`Erreur upload: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        newUrls.push(urlData.publicUrl);
      }

      setPhotoUrls(prev => [...prev, ...newUrls]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'upload";
      setError(message);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = async (index: number) => {
    const url = photoUrls[index];
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));

    // Try to delete from storage if it's a Supabase URL
    if (url.includes('supabase.co/storage')) {
      try {
        const path = url.split('/photos/')[1];
        if (path) {
          await supabase.storage.from('photos').remove([decodeURIComponent(path)]);
        }
      } catch {
        // Non-critical — photo removed from UI regardless
      }
    }
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 6 ? [...prev, id] : prev
    );
  };

  const toggleGenderPref = (g: Gender) => {
    setGenderPreference(prev =>
      prev.includes(g) ? prev.filter(p => p !== g) : [...prev, g]
    );
  };

  const handleSave = async () => {
    setError(null);

    if (!firstName.trim()) { setError('Le prénom est requis'); return; }
    if (!birthDate) { setError('La date de naissance est requise'); return; }
    if (!gender) { setError('Le genre est requis'); return; }
    if (photoUrls.length === 0) { setError('Ajoute au moins une photo'); return; }

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
        age_min: ageMin,
        age_max: ageMax,
        gender_preference: genderPreference.length > 0 ? genderPreference : null,
      };

      if (existingProfile) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', userId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert(profileData);
        if (insertErr) throw insertErr;
      }

      // Photos: delete all then re-insert
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

      // Interests: delete all then re-insert
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

  return (
    <div className="max-w-lg mx-auto px-4 pb-32">
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

      {/* Photos */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-pink-400" />
          Photos ({photoUrls.length}/6)
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {photoUrls.map((url, i) => (
            <motion.div
              key={`photo-${i}`}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-800 group"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              layout
            >
              <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 33vw, 150px" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              {i === 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full gradient-accent text-[10px] font-semibold">
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
              className="aspect-[3/4] rounded-2xl glass flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
              whileTap={{ scale: 0.95 }}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                  <span className="text-xs text-zinc-400">Upload...</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full glass flex items-center justify-center">
                    <Plus className="w-6 h-6 text-pink-400" />
                  </div>
                  <span className="text-xs text-zinc-400">Ajouter</span>
                </>
              )}
            </motion.button>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-2">JPG, PNG ou WebP · 5MB max par photo</p>
      </section>

      {/* Basic Info */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Informations</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Prénom</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={50}
              className="w-full glass rounded-xl py-3 px-4 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-pink-500/50"
              placeholder="Ton prénom"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Date de naissance</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full glass rounded-xl py-3 px-4 text-white focus:ring-2 focus:ring-pink-500/50 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Genre</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(GENDER_LABELS) as [Gender, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    gender === value
                      ? 'gradient-accent text-white'
                      : 'glass text-zinc-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Bio ({bio.length}/{MAX_BIO_LENGTH})</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={MAX_BIO_LENGTH}
              rows={3}
              className="w-full glass rounded-xl py-3 px-4 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-pink-500/50 resize-none"
              placeholder="Parle de toi en quelques mots..."
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Ville</label>
            <input
              type="text"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              className="w-full glass rounded-xl py-3 px-4 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-pink-500/50"
              placeholder="Bruxelles"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">Je recherche</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(LOOKING_FOR_LABELS) as [LookingFor, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLookingFor(value)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    lookingFor === value
                      ? 'gradient-accent text-white'
                      : 'glass text-zinc-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interests */}
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

      {/* Preferences */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Préférences</h2>
        <div className="flex flex-col gap-6">
          <div>
            <label className="text-sm text-zinc-400 mb-2 flex justify-between">
              <span>Distance max</span>
              <span className="text-white font-medium">{maxDistance} km</span>
            </label>
            <input
              type="range"
              min={1}
              max={500}
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full accent-pink-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Âge min</label>
              <input
                type="number"
                min={MIN_AGE}
                max={MAX_AGE}
                value={ageMin}
                onChange={(e) => setAgeMin(Number(e.target.value))}
                className="w-full glass rounded-xl py-3 px-4 text-white text-center focus:ring-2 focus:ring-pink-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">Âge max</label>
              <input
                type="number"
                min={MIN_AGE}
                max={MAX_AGE}
                value={ageMax}
                onChange={(e) => setAgeMax(Number(e.target.value))}
                className="w-full glass rounded-xl py-3 px-4 text-white text-center focus:ring-2 focus:ring-pink-500/50"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Genre préféré</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(GENDER_LABELS) as [Gender, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleGenderPref(value)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    genderPreference.includes(value)
                      ? 'gradient-accent text-white'
                      : 'glass text-zinc-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40 safe-bottom">
        <div className="max-w-lg mx-auto">
          <motion.button
            onClick={handleSave}
            disabled={saving || uploading}
            className="btn-gradient w-full py-4 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50"
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
