export const COLORS = {
  bg: '#09090b',
  bgCard: 'rgba(255, 255, 255, 0.05)',
  bgCardHover: 'rgba(255, 255, 255, 0.08)',
  accent: '#ec4899',
  accentEnd: '#8b5cf6',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  border: 'rgba(255, 255, 255, 0.1)',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
} as const;

export const INTEREST_CATEGORIES: Record<string, string> = {
  lifestyle: '#ec4899',
  creative: '#8b5cf6',
  culture: '#3b82f6',
  fitness: '#22c55e',
  tech: '#06b6d4',
  wellness: '#f59e0b',
  science: '#6366f1',
  social: '#ef4444',
};

export const GENDER_LABELS: Record<string, string> = {
  male: 'Homme',
  female: 'Femme',
  non_binary: 'Non-binaire',
  other: 'Autre',
};

export const LOOKING_FOR_LABELS: Record<string, string> = {
  relationship: 'Relation sérieuse',
  casual: 'Casual',
  friendship: 'Amitié',
  not_sure: 'Pas encore sûr·e',
};

export const HAIR_COLOR_LABELS: Record<string, string> = {
  black: 'Noirs',
  brown: 'Bruns',
  blonde: 'Blonds',
  red: 'Roux',
  gray: 'Gris',
  white: 'Blancs',
  other: 'Autre',
};

export const EYE_COLOR_LABELS: Record<string, string> = {
  brown: 'Marron',
  blue: 'Bleus',
  green: 'Verts',
  hazel: 'Noisette',
  gray: 'Gris',
  other: 'Autre',
};

export const BODY_TYPE_LABELS: Record<string, string> = {
  slim: 'Mince',
  average: 'Moyen',
  athletic: 'Athlétique',
  curvy: 'Rond·e',
  other: 'Autre',
};

export const SKIN_TONE_LABELS: Record<string, string> = {
  very_light: 'Très clair',
  light: 'Clair',
  medium: 'Médium',
  olive: 'Olive',
  brown: 'Mat',
  dark: 'Foncé',
};

export const SMOKING_LABELS: Record<string, string> = {
  never: 'Jamais',
  occasionally: 'Occasionnellement',
  regularly: 'Régulièrement',
};

export const DRINKING_LABELS: Record<string, string> = {
  never: 'Jamais',
  socially: 'En soirée',
  regularly: 'Régulièrement',
};

export const SWIPE_THRESHOLD = 100;
export const MAX_PHOTOS = 6;
export const MAX_BIO_LENGTH = 500;
export const MIN_AGE = 18;
export const MAX_AGE = 99;
