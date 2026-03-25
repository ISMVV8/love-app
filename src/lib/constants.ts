export const COLORS = {
  bg: '#09090B',
  bgCard: 'rgba(24, 24, 27, 0.8)',
  bgElevated: '#1A1A1E',
  accentPink: '#ec4899',
  accentViolet: '#8b5cf6',
  accentSoft: 'rgba(236, 72, 153, 0.12)',
  gradient: 'linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)',
  gradient135: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717a',
  border: 'rgba(255, 255, 255, 0.1)',
  success: '#22C55E',
  error: '#ef4444',
  warning: '#F59E0B',
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
