export const COLORS = {
  bg: '#0C0C0E',
  bgCard: '#161618',
  bgCardHover: '#1C1C1E',
  accent: '#E11D48',
  accentHover: '#BE123C',
  accentSubtle: 'rgba(225, 29, 72, 0.1)',
  text: '#F4F4F5',
  textMuted: '#A1A1AA',
  textTertiary: '#71717A',
  border: '#262628',
  success: '#10B981',
  error: '#ef4444',
  warning: '#F59E0B',
} as const;

export const INTEREST_CATEGORIES: Record<string, string> = {
  lifestyle: '#E11D48',
  creative: '#8b5cf6',
  culture: '#3b82f6',
  fitness: '#10B981',
  tech: '#06b6d4',
  wellness: '#F59E0B',
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
