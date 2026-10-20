'use client';
import { useLocale } from 'next-intl';
import { usePublicConfig } from '@/data/hooks';

/** Kid-visible text the admin edits (Config > Copy), in the visitor's language; '' when the config is not available. */
export function useAdminCopy(key: 'home_tip' | 'feed_empty' | 'session_done'): string {
  const lang = useLocale().startsWith('fr') ? 'fr' : 'en';
  return usePublicConfig().data?.copy[key]?.[lang] ?? '';
}
