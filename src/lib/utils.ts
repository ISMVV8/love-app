import { differenceInYears, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function calculateAge(birthDate: string | Date): number {
  return differenceInYears(new Date(), new Date(birthDate));
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export function getCompatibilityColor(score: number): string {
  if (score >= 75) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 25) return 'text-orange-400';
  return 'text-red-400';
}

export function getCompatibilityLabel(score: number): string {
  if (score >= 75) return 'Excellente';
  if (score >= 50) return 'Bonne';
  if (score >= 25) return 'Moyenne';
  return 'Faible';
}
