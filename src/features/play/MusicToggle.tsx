'use client';
import { useTranslations } from 'next-intl';
import { usePrefs } from '@/platform/prefs/store';
import { usePublicConfig } from '@/data/hooks';
import { useSaveKidPrefs } from './useServerPrefs';
import { cn } from '@/shared/cn';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';

/** Small music on/off button for the play screens (44 px, no border). Gone when a parent locked the music off. */
export function MusicToggle({ lifted }: { lifted: boolean }) {
  const t = useTranslations('music');
  const { music, musicLocked } = usePrefs();
  const save = useSaveKidPrefs();
  const adminOn = usePublicConfig().data?.music.enabled ?? true;
  if (musicLocked || !adminOn) return null;
  return (
    <IconButton
      label={music ? t('toggleOn') : t('toggleOff')}
      aria-pressed={music}
      variant="ghost"
      sound={null}
      icon={<Icon name={music ? 'music' : 'volume-off'} />}
      onClick={() => save({ music: !music })}
      className={cn('fixed left-2 z-20 size-11 text-muted', lifted ? 'bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]' : 'bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]')}
    />
  );
}
