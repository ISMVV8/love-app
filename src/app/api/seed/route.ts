import { createClient } from '@supabase/supabase-js';
import { SEED_PROFILES } from '@/lib/seed-profiles';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY in environment variables' },
      { status: 500 }
    );
  }

  // Use service role key to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get all interests for name → id mapping
    const { data: interests, error: interestsError } = await supabase
      .from('interests')
      .select('*');

    if (interestsError || !interests) {
      return NextResponse.json(
        { error: 'Failed to fetch interests', details: interestsError?.message },
        { status: 500 }
      );
    }

    const interestMap = new Map(interests.map(i => [i.name, i.id]));

    let created = 0;
    const errors: string[] = [];

    for (const seed of SEED_PROFILES) {
      // Create a fake auth user
      const email = `${seed.first_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@seed.love-app.local`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: 'SeedPassword123!',
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          // Skip existing seed users
          continue;
        }
        errors.push(`Auth error for ${seed.first_name}: ${authError.message}`);
        continue;
      }

      if (!authData.user) {
        errors.push(`No user created for ${seed.first_name}`);
        continue;
      }

      const userId = authData.user.id;

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        first_name: seed.first_name,
        birth_date: seed.birth_date,
        gender: seed.gender,
        bio: seed.bio,
        looking_for: seed.looking_for,
        location_city: seed.location_city,
        location_lat: seed.location_lat,
        location_lng: seed.location_lng,
        max_distance_km: 50,
        age_min: 18,
        age_max: 35,
        gender_preference: null,
      });

      if (profileError) {
        errors.push(`Profile error for ${seed.first_name}: ${profileError.message}`);
        continue;
      }

      // Create photos
      const photoInserts = seed.photos.map((url, i) => ({
        profile_id: userId,
        url,
        position: i,
        is_primary: i === 0,
      }));

      const { error: photosError } = await supabase.from('profile_photos').insert(photoInserts);
      if (photosError) {
        errors.push(`Photos error for ${seed.first_name}: ${photosError.message}`);
      }

      // Create interest links
      const interestInserts = seed.interests
        .map(name => {
          const interestId = interestMap.get(name);
          if (!interestId) return null;
          return { profile_id: userId, interest_id: interestId };
        })
        .filter((item): item is { profile_id: string; interest_id: string } => item !== null);

      if (interestInserts.length > 0) {
        const { error: interestsInsertError } = await supabase.from('profile_interests').insert(interestInserts);
        if (interestsInsertError) {
          errors.push(`Interests error for ${seed.first_name}: ${interestsInsertError.message}`);
        }
      }

      created++;
    }

    return NextResponse.json({
      success: true,
      created,
      total: SEED_PROFILES.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
