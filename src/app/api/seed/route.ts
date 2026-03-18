import { createClient } from '@supabase/supabase-js';
import { SEED_PROFILES } from '@/lib/seed-profiles';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check for ?reset=true to delete existing seed data first
  const url = new URL(request.url);
  const reset = url.searchParams.get('reset') === 'true';

  try {
    if (reset) {
      // Delete all seed users (emails ending in @demo.app)
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 100 });
      if (users?.users) {
        for (const user of users.users) {
          if (user.email?.endsWith('@demo.app')) {
            await supabase.auth.admin.deleteUser(user.id);
          }
        }
      }
    }

    // Get interests for name → id mapping
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
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: seed.email,
        password: seed.password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already been registered')) continue;
        errors.push(`Auth: ${seed.first_name} — ${authError.message}`);
        continue;
      }

      if (!authData.user) {
        errors.push(`No user for ${seed.first_name}`);
        continue;
      }

      const userId = authData.user.id;

      // Profile with all physical attributes
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
        hair_color: seed.hair_color,
        eye_color: seed.eye_color,
        body_type: seed.body_type,
        skin_tone: seed.skin_tone,
        height_cm: seed.height_cm,
        smoking: seed.smoking,
        drinking: seed.drinking,
      });

      if (profileError) {
        errors.push(`Profile: ${seed.first_name} — ${profileError.message}`);
        continue;
      }

      // Photos
      const photoInserts = seed.photos.map((url, i) => ({
        profile_id: userId,
        url,
        position: i,
        is_primary: i === 0,
      }));
      const { error: photosError } = await supabase.from('profile_photos').insert(photoInserts);
      if (photosError) errors.push(`Photos: ${seed.first_name} — ${photosError.message}`);

      // Interests
      const interestInserts = seed.interests
        .map(name => {
          const interestId = interestMap.get(name);
          return interestId ? { profile_id: userId, interest_id: interestId } : null;
        })
        .filter((item): item is { profile_id: string; interest_id: string } => item !== null);

      if (interestInserts.length > 0) {
        const { error: intError } = await supabase.from('profile_interests').insert(interestInserts);
        if (intError) errors.push(`Interests: ${seed.first_name} — ${intError.message}`);
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
