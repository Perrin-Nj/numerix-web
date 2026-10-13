import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names conditionally with clsx, then lets tailwind-merge resolve conflicting Tailwind classes so
 * the last one wins.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
