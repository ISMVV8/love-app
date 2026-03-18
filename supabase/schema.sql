-- ============================================================
-- LOVE APP — Database Schema
-- Clean, normalized, production-ready
-- ============================================================

-- Enums
CREATE TYPE gender AS ENUM ('male', 'female', 'non_binary', 'other');
CREATE TYPE looking_for AS ENUM ('relationship', 'casual', 'friendship', 'not_sure');
CREATE TYPE swipe_action AS ENUM ('like', 'dislike', 'super_like');
CREATE TYPE match_status AS ENUM ('active', 'unmatched');
CREATE TYPE message_type AS ENUM ('text', 'image', 'gif');
CREATE TYPE report_reason AS ENUM ('inappropriate', 'fake_profile', 'harassment', 'spam', 'other');

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 50),
  birth_date DATE NOT NULL CHECK (birth_date <= CURRENT_DATE - INTERVAL '18 years'),
  gender gender NOT NULL,
  bio TEXT CHECK (char_length(bio) <= 500),
  looking_for looking_for NOT NULL DEFAULT 'not_sure',
  location_city TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  max_distance_km INTEGER NOT NULL DEFAULT 50 CHECK (max_distance_km BETWEEN 1 AND 500),
  age_min INTEGER NOT NULL DEFAULT 18 CHECK (age_min >= 18),
  age_max INTEGER NOT NULL DEFAULT 99 CHECK (age_max <= 99),
  gender_preference gender[],
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILE PHOTOS (up to 6 per user)
-- ============================================================
CREATE TABLE profile_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 5),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, position)
);

-- ============================================================
-- INTERESTS (predefined list)
-- ============================================================
CREATE TABLE interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 30),
  emoji TEXT,
  category TEXT NOT NULL
);

-- ============================================================
-- PROFILE INTERESTS (many-to-many)
-- ============================================================
CREATE TABLE profile_interests (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, interest_id)
);

-- ============================================================
-- SWIPES
-- ============================================================
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action swipe_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (swiper_id, swiped_id),
  CHECK (swiper_id != swiped_id)
);

-- ============================================================
-- MATCHES (created when both users like each other)
-- ============================================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status match_status NOT NULL DEFAULT 'active',
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  type message_type NOT NULL DEFAULT 'text',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason report_reason NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reporter_id != reported_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_location ON profiles(location_lat, location_lng);
CREATE INDEX idx_profiles_active ON profiles(is_active, last_active_at DESC);
CREATE INDEX idx_profiles_birth_date ON profiles(birth_date);

CREATE INDEX idx_photos_profile ON profile_photos(profile_id);
CREATE INDEX idx_photos_primary ON profile_photos(profile_id) WHERE is_primary = TRUE;

CREATE INDEX idx_interests_category ON interests(category);
CREATE INDEX idx_profile_interests_profile ON profile_interests(profile_id);
CREATE INDEX idx_profile_interests_interest ON profile_interests(interest_id);

CREATE INDEX idx_swipes_swiper ON swipes(swiper_id, created_at DESC);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX idx_swipes_pair ON swipes(swiped_id, swiper_id) WHERE action = 'like';

CREATE INDEX idx_matches_user_a ON matches(user_a) WHERE status = 'active';
CREATE INDEX idx_matches_user_b ON matches(user_b) WHERE status = 'active';

CREATE INDEX idx_messages_match ON messages(match_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(match_id, sender_id) WHERE read_at IS NULL;

CREATE INDEX idx_reports_reported ON reports(reported_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Calculate age from birth_date
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(birth_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate distance between two points (Haversine)
CREATE OR REPLACE FUNCTION distance_km(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  r DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlng DOUBLE PRECISION;
  a DOUBLE PRECISION;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlng := RADIANS(lng2 - lng1);
  a := SIN(dlat/2)^2 + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlng/2)^2;
  RETURN r * 2 * ASIN(SQRT(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Compatibility score (0-100)
CREATE OR REPLACE FUNCTION compatibility_score(user_a UUID, user_b UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  shared_interests INTEGER;
  total_interests INTEGER;
  distance DOUBLE PRECISION;
  prof_a profiles%ROWTYPE;
  prof_b profiles%ROWTYPE;
BEGIN
  SELECT * INTO prof_a FROM profiles WHERE id = user_a;
  SELECT * INTO prof_b FROM profiles WHERE id = user_b;
  
  IF prof_a IS NULL OR prof_b IS NULL THEN RETURN 0; END IF;

  -- Shared interests (40 points max)
  SELECT COUNT(*) INTO shared_interests
  FROM profile_interests a
  JOIN profile_interests b ON a.interest_id = b.interest_id
  WHERE a.profile_id = user_a AND b.profile_id = user_b;
  
  SELECT GREATEST(
    (SELECT COUNT(*) FROM profile_interests WHERE profile_id = user_a),
    (SELECT COUNT(*) FROM profile_interests WHERE profile_id = user_b),
    1
  ) INTO total_interests;
  
  score := score + LEAST(40, (shared_interests::FLOAT / total_interests * 40)::INTEGER);

  -- Looking for match (30 points)
  IF prof_a.looking_for = prof_b.looking_for THEN
    score := score + 30;
  ELSIF prof_a.looking_for = 'not_sure' OR prof_b.looking_for = 'not_sure' THEN
    score := score + 15;
  END IF;

  -- Distance proximity (30 points max)
  IF prof_a.location_lat IS NOT NULL AND prof_b.location_lat IS NOT NULL THEN
    distance := distance_km(prof_a.location_lat, prof_a.location_lng, prof_b.location_lat, prof_b.location_lng);
    IF distance < 5 THEN score := score + 30;
    ELSIF distance < 15 THEN score := score + 25;
    ELSIF distance < 30 THEN score := score + 20;
    ELSIF distance < 50 THEN score := score + 10;
    END IF;
  ELSE
    score := score + 15;
  END IF;

  RETURN score;
END;
$$ LANGUAGE plpgsql STABLE;

-- Auto-create match when mutual like
CREATE OR REPLACE FUNCTION check_mutual_like()
RETURNS TRIGGER AS $$
DECLARE
  other_swipe swipes%ROWTYPE;
  a_id UUID;
  b_id UUID;
BEGIN
  IF NEW.action != 'like' AND NEW.action != 'super_like' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO other_swipe FROM swipes
  WHERE swiper_id = NEW.swiped_id
    AND swiped_id = NEW.swiper_id
    AND action IN ('like', 'super_like');

  IF FOUND THEN
    IF NEW.swiper_id < NEW.swiped_id THEN
      a_id := NEW.swiper_id;
      b_id := NEW.swiped_id;
    ELSE
      a_id := NEW.swiped_id;
      b_id := NEW.swiper_id;
    END IF;

    INSERT INTO matches (user_a, user_b)
    VALUES (a_id, b_id)
    ON CONFLICT (user_a, user_b) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_swipe_check_match
  AFTER INSERT ON swipes
  FOR EACH ROW
  EXECUTE FUNCTION check_mutual_like();

-- Update updated_at on profile change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_active" ON profiles
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PROFILE PHOTOS
CREATE POLICY "photos_select_active" ON profile_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND is_active = TRUE)
  );

CREATE POLICY "photos_insert_own" ON profile_photos
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "photos_update_own" ON profile_photos
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "photos_delete_own" ON profile_photos
  FOR DELETE USING (auth.uid() = profile_id);

-- INTERESTS (public read)
CREATE POLICY "interests_select_all" ON interests
  FOR SELECT USING (TRUE);

-- PROFILE INTERESTS
CREATE POLICY "profile_interests_select" ON profile_interests
  FOR SELECT USING (TRUE);

CREATE POLICY "profile_interests_insert_own" ON profile_interests
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "profile_interests_delete_own" ON profile_interests
  FOR DELETE USING (auth.uid() = profile_id);

-- SWIPES
CREATE POLICY "swipes_insert_own" ON swipes
  FOR INSERT WITH CHECK (auth.uid() = swiper_id);

CREATE POLICY "swipes_select_own" ON swipes
  FOR SELECT USING (auth.uid() = swiper_id);

-- MATCHES
CREATE POLICY "matches_select_own" ON matches
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "matches_update_own" ON matches
  FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- MESSAGES
CREATE POLICY "messages_select_match" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE id = match_id
        AND status = 'active'
        AND (auth.uid() = user_a OR auth.uid() = user_b)
    )
  );

CREATE POLICY "messages_insert_match" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE id = match_id
        AND status = 'active'
        AND (auth.uid() = user_a OR auth.uid() = user_b)
    )
  );

CREATE POLICY "messages_update_read" ON messages
  FOR UPDATE USING (
    auth.uid() != sender_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE id = match_id AND (auth.uid() = user_a OR auth.uid() = user_b)
    )
  ) WITH CHECK (
    auth.uid() != sender_id
  );

-- REPORTS
CREATE POLICY "reports_insert_own" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_own" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- ============================================================
-- SEED: INTERESTS
-- ============================================================
INSERT INTO interests (name, emoji, category) VALUES
  ('Voyages', '✈️', 'lifestyle'),
  ('Cuisine', '🍳', 'lifestyle'),
  ('Photographie', '📷', 'creative'),
  ('Musique', '🎵', 'creative'),
  ('Cinéma', '🎬', 'creative'),
  ('Lecture', '📚', 'culture'),
  ('Sport', '⚡', 'fitness'),
  ('Yoga', '🧘', 'fitness'),
  ('Randonnée', '🥾', 'fitness'),
  ('Running', '🏃', 'fitness'),
  ('Danse', '💃', 'creative'),
  ('Art', '🎨', 'creative'),
  ('Technologie', '💻', 'tech'),
  ('Gaming', '🎮', 'tech'),
  ('Nature', '🌿', 'lifestyle'),
  ('Animaux', '🐾', 'lifestyle'),
  ('Café', '☕', 'lifestyle'),
  ('Vin', '🍷', 'lifestyle'),
  ('Méditation', '🧠', 'wellness'),
  ('Fitness', '💪', 'fitness'),
  ('Mode', '👗', 'lifestyle'),
  ('Théâtre', '🎭', 'culture'),
  ('Astronomie', '🔭', 'science'),
  ('Jardinage', '🌱', 'lifestyle'),
  ('Surf', '🏄', 'fitness'),
  ('Ski', '⛷️', 'fitness'),
  ('Bénévolat', '❤️', 'social'),
  ('Podcasts', '🎙️', 'culture'),
  ('Street food', '🌮', 'lifestyle'),
  ('Concerts', '🎤', 'culture');
