// Enums matching the DB schema
export type Gender = 'male' | 'female' | 'non_binary' | 'other';
export type LookingFor = 'relationship' | 'casual' | 'friendship' | 'not_sure';
export type SwipeAction = 'like' | 'dislike' | 'super_like';
export type MatchStatus = 'active' | 'unmatched';
export type MessageType = 'text' | 'image' | 'gif' | 'audio';
export type ReportReason = 'inappropriate' | 'fake_profile' | 'harassment' | 'spam' | 'other';

// Physical attributes
export type HairColor = 'black' | 'brown' | 'blonde' | 'red' | 'gray' | 'white' | 'other';
export type EyeColor = 'brown' | 'blue' | 'green' | 'hazel' | 'gray' | 'other';
export type BodyType = 'slim' | 'average' | 'athletic' | 'curvy' | 'other';
export type SkinTone = 'very_light' | 'light' | 'medium' | 'olive' | 'brown' | 'dark';
export type SmokingHabit = 'never' | 'occasionally' | 'regularly';
export type DrinkingHabit = 'never' | 'socially' | 'regularly';

// Row types
export interface Profile {
  id: string;
  first_name: string;
  birth_date: string;
  gender: Gender;
  bio: string | null;
  looking_for: LookingFor;
  location_city: string | null;
  location_lat: number | null;
  location_lng: number | null;
  max_distance_km: number;
  age_min: number;
  age_max: number;
  gender_preference: Gender[] | null;
  // Physical attributes
  hair_color: HairColor | null;
  eye_color: EyeColor | null;
  body_type: BodyType | null;
  skin_tone: SkinTone | null;
  height_cm: number | null;
  smoking: SmokingHabit | null;
  drinking: DrinkingHabit | null;
  // Physical preferences
  pref_hair_color: HairColor[] | null;
  pref_eye_color: EyeColor[] | null;
  pref_body_type: BodyType[] | null;
  pref_skin_tone: SkinTone[] | null;
  pref_height_min: number | null;
  pref_height_max: number | null;
  pref_smoking: SmokingHabit[] | null;
  pref_drinking: DrinkingHabit[] | null;
  // Meta
  invisible_mode: boolean;
  is_verified: boolean;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProfilePhoto {
  id: string;
  profile_id: string;
  url: string;
  position: number;
  is_primary: boolean;
  created_at: string;
}

export interface Interest {
  id: string;
  name: string;
  emoji: string | null;
  category: string;
}

export interface ProfileInterest {
  profile_id: string;
  interest_id: string;
}

export interface Swipe {
  id: string;
  swiper_id: string;
  swiped_id: string;
  action: SwipeAction;
  created_at: string;
}

export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  status: MatchStatus;
  matched_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  read_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: ReportReason;
  details: string | null;
  created_at: string;
}

// Extended types with relations
export interface ProfileWithPhotos extends Profile {
  profile_photos: ProfilePhoto[];
  profile_interests: (ProfileInterest & { interests: Interest })[];
}

export interface DiscoverProfile extends Profile {
  profile_photos: ProfilePhoto[];
  profile_interests: { interest_id: string; interests: Interest }[];
  compatibility_score?: number;
}

export interface MatchWithProfile extends Match {
  other_profile: Profile & {
    profile_photos: ProfilePhoto[];
  };
  last_message?: Message | null;
  unread_count?: number;
}

// Muzz features
export type ChatRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ChatRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  status: ChatRequestStatus;
  created_at: string;
}

export interface Boost {
  id: string;
  user_id: string;
  activated_at: string;
  expires_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

// Insert types
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at' | 'last_active_at' | 'is_verified' | 'is_active'>;
export type MessageInsert = Omit<Message, 'id' | 'created_at' | 'read_at'>;
export type SwipeInsert = Omit<Swipe, 'id' | 'created_at'>;
