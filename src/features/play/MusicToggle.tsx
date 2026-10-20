'use client';
import { useTranslations } from 'next-intl';
import { usePrefs } from '@/platform/prefs/store';
import { cn } from '@/shared/cn';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';

/** Small music on/off button for the play screens (44 px, no border). Gone when a parent locked the music off. */
export function MusicToggle({ lifted }: { lifted: boolean }) {
  const t = useTranslations('music');
  const { music, musicLocked, set } = usePrefs();
  if (musicLocked) return null;
  return (
    <IconButton
      label={music ? t('toggleOn') : t('toggleOff')}
      aria-pressed={music}
      variant="ghost"
      sound={null}
      icon={<Icon name={music ? 'music' : 'volume-off'} />}
      onClick={() => set({ music: !music })}
      className={cn('fixed left-2 z-20 size-11 text-muted', lifted ? 'bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]' : 'bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]')}
    />
  );
}
