'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { usePrefs } from '@/platform/prefs/store';
import { useSpeaker } from '@/platform/speech';
import { useCountUp } from '@/platform/motion';
import { reportError } from '@/platform/errors/bridge';
import { signOut, useChildSettings, useEngagement, useGrowth, useSessionStatus } from '@/data/hooks';
import { useLocale } from 'next-intl';
import { useChildProfile } from '@/data/local/who';
import { Avatar } from '@/game/avatar';
import { CreditsLink } from '@/game/credits-link';
import { ParentGate } from '@/features/common/ParentGate';
import { DailyGoalRing } from '@/game/daily-goal-ring';
import { StreakBadge } from '@/game/streak-badge';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Panel } from '@/ui/panel';
import { ScreenState } from '@/game/screen-state';
import { Skeleton } from '@/ui/skeleton';
import { Switch } from '@/ui/switch';

function GrowthLines({ g }: { g: { current: { chapters_completed: number; skills_mastered: number }; previous: { chapters_completed: number; skills_mastered: number } } }) {
  const t = useTranslations('screens.play.me');
  const chapters = useCountUp(g.current.chapters_completed);
  const skills = useCountUp(g.current.skills_mastered);
  return (
    <>
      <p className="text-lg">{t('growthLine', { now: chapters, before: g.previous.chapters_completed })}</p>
      <p className="text-lg">{t('skillsLine', { now: skills, before: g.previous.skills_mastered })}</p>
    </>
  );
}

function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="font-display font-semibold">{label}</span>
      <div className="flex gap-2">
        {options.map((o) => (
          <Button key={String(o.value)} size="sm" variant={o.value === value ? 'primary' : 'secondary'} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function LanguagePanel({ childId }: { childId: string | null }) {
  const t = useTranslations('screens.play.me.language');
  const router = useRouter();
  const locale = useLocale();
  const settings = useChildSettings(childId ?? '');
  // A parent can lock the language; absent means allowed
  const allowed = settings.data?.kid_can_change_language !== false;
  const set = (value: string) => {
    window.speechSynthesis?.cancel();
    document.cookie = `NEXT_LOCALE=${value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <Panel title={t('title')}>
      {allowed ? (
        <Choice
          label={t('label')}
          value={locale.startsWith('en') ? 'en-CA' : 'fr-CA'}
          options={[
            { value: 'fr-CA', label: 'Français' },
            { value: 'en-CA', label: 'English' },
          ]}
          onChange={set}
        />
      ) : (
        <p className="text-muted">{t('locked')}</p>
      )}
    </Panel>
  );
}

function VoicePanel() {
  const t = useTranslations('screens.play.me.voice');
  const prefs = usePrefs();
  const sp = useSpeaker();
  const tm = useTranslations('music');
  return (
    <Panel title={t('title')}>
      <div className="flex flex-col gap-4">
        {!prefs.musicLocked && (
          <>
            <Switch label={tm('switch')} description={tm('switchHint')} checked={prefs.music} onCheckedChange={(music) => prefs.set({ music })} />
            {prefs.music && (
              <Choice
                label={tm('volume')}
                value={prefs.musicVolume}
                options={[
                  { value: 0.2, label: tm('low') },
                  { value: 0.35, label: tm('medium') },
                ]}
                onChange={(musicVolume) => prefs.set({ musicVolume })}
              />
            )}
          </>
        )}
        <Switch label={t('vibration')} description={t('vibrationHint')} checked={prefs.vibration} onCheckedChange={(vibration) => prefs.set({ vibration })} />
        <Switch label={t('voice')} description={t('voiceHint')} checked={prefs.voice} onCheckedChange={(voice) => prefs.set({ voice })} />
        <Switch label={t('hints')} description={t('hintsHint')} checked={prefs.hints} onCheckedChange={(hints) => prefs.set({ hints })} />
        {prefs.hints && (
          <>
            <Choice
              label={t('delay')}
              value={prefs.hintDelaySec}
              options={([15, 30, 45] as const).map((n) => ({ value: n, label: t('delayUnit', { n }) }))}
              onChange={(hintDelaySec) => prefs.set({ hintDelaySec })}
            />
            <Choice
              label={t('volume')}
              value={prefs.hintVolume}
              options={[
                { value: 0.25, label: t('low') },
                { value: 0.5, label: t('medium') },
                { value: 1, label: t('normal') },
              ]}
              onChange={(hintVolume) => prefs.set({ hintVolume })}
            />
          </>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" iconLeft={<Icon name="volume" />} disabled={!sp.supported || !prefs.voice} onClick={() => sp.speak(t('sample'))}>
            {t('test')}
          </Button>
          <p className="text-sm text-muted" aria-live="polite">
            {!sp.supported || (sp.voicesLoaded && !sp.voiceLabel) ? t('noVoice') : sp.voiceLabel ? t('using', { name: sp.voiceLabel }) : null}
          </p>
        </div>
      </div>
    </Panel>
  );
}

/** The child's own page: progress, voice and help settings, who is playing, credits link. */
export function MeScreen() {
  const t = useTranslations('screens.play.me');
  const router = useRouter();
  const status = useSessionStatus();
  const childId = status.data?.childId ?? null;
  const profile = useChildProfile(childId) ?? null;
  const engagement = useEngagement(childId);
  const growth = useGrowth(childId);
  const settled = !engagement.isLoading && !growth.isLoading;
  const [gate, setGate] = useState<'parent' | 'logout' | null>(null);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 lg:max-w-4xl">
      <header className="flex items-center gap-4">
        {profile && <Avatar avatarId={profile.avatar} name={profile.name} size="lg" />}
        <div>
          <h1 className="font-display text-4xl font-bold">{profile?.name ?? t('title')}</h1>
          {profile && <p className="text-muted">{t('title')}</p>}
        </div>
      </header>
      {(engagement.isLoading || engagement.error) && (
        <ScreenState isLoading={engagement.isLoading} error={engagement.error} onRetry={() => void engagement.refetch()} area="play" skeleton={<Skeleton height={140} />}>
          {null}
        </ScreenState>
      )}
      {engagement.data && (
        <Panel title={t('today')}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <StreakBadge days={engagement.data.streak.current_days} />
            <DailyGoalRing done={engagement.data.daily_goal.done_chapters} target={engagement.data.daily_goal.target_chapters} />
          </div>
          <p className="mt-3 text-muted">{t('longest', { days: engagement.data.streak.longest_days })}</p>
        </Panel>
      )}
      {growth.data && (
        <Panel title={t('growth')}>
          <GrowthLines g={growth.data} />
        </Panel>
      )}
      {/* The settings panels wait for the stats above them, so nothing visible jumps down when those arrive */}
      {settled && (
        <>
      <LanguagePanel childId={childId} />
      <VoicePanel />
      <Panel title={t('account.title')}>
        <div className="flex flex-col gap-3">
          <p className="text-muted">{t('account.hint')}</p>
          <div className="flex flex-wrap gap-3">
            <Button
              iconLeft={<Icon name="users" />}
              onClick={async () => {
                try {
                  await signOut('child');
                  router.replace('/play');
                  router.refresh();
                } catch (e) {
                  reportError(e);
                }
              }}
            >
              {t('account.switch')}
            </Button>
            <Button variant="secondary" iconLeft={<Icon name="shield" />} onClick={() => setGate('parent')}>
              {t('grownUps')}
            </Button>
            <Button variant="ghost" iconLeft={<Icon name="log-out" />} onClick={() => setGate('logout')}>
              {t('account.signOut')}
            </Button>
          </div>
        </div>
      </Panel>
      <div className="mt-4 flex justify-center">
        <CreditsLink />
      </div>
        </>
      )}
      <ParentGate
        open={gate !== null}
        onOpenChange={(o) => !o && setGate(null)}
        onUnlocked={async () => {
          const mode = gate;
          try {
            if (mode === 'logout') {
              await signOut('all');
              router.replace('/');
            } else {
              await signOut('child');
              router.replace('/parent');
            }
            router.refresh();
          } catch (e) {
            reportError(e);
          }
        }}
      />
    </main>
  );
}
