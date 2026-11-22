'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { exportChild, useChildren, useChildSettings, useUpdateSettings, useWorlds } from '@/data/hooks';
import { DeleteChildDialog } from './DeleteChildDialog';
import { ParentPage } from './ParentPage';
import { useNotify } from '@/ui/notification-center';
import { reportError } from '@/platform/errors/bridge';
import type { ChildSettings, World } from '@/data/api/types';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Panel } from '@/ui/panel';
import { Select } from '@/ui/select';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/game/screen-state';
import { SwitchRow } from '@/game/switch-row';
import { SettingsGrid } from '@/ui/settings-grid';

/** Per-child settings: goal, time limit, sound, read aloud, languages, worlds, data export and deletion. */
export function SettingsScreen({ childId }: { childId: string }) {
  const t = useTranslations('screens.parent.settings');
  const tm = useTranslations('music');
  const tw = useTranslations('worlds');
  const router = useRouter();
  const { notify } = useNotify();
  const settings = useChildSettings(childId);
  const save = useUpdateSettings(childId);
  const children = useChildren();
  const worlds = useWorlds();
  const [edits, setDraft] = useState<ChildSettings | null>(null);
  const draft = edits ?? settings.data ?? null;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const child = children.data?.find((c) => c.id === childId);

  async function onSave() {
    if (!draft) return;
    await save.mutateAsync(draft);
    notify({ kind: 'success', title: t('saved') });
  }

  async function onExport() {
    try {
      const data = await exportChild(childId);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `numerix-${childId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      reportError(e);
    }
  }

  return (
    <ParentPage wide title={t('title')} backHref={`/parent/children/${childId}`}>
      {!draft && <ScreenState isLoading={settings.isLoading} error={settings.error} isEmpty onRetry={() => void settings.refetch()} area="parent" skeleton={<Skeleton shape="block" className="nx-skeleton-card" height={240} />}>{null}</ScreenState>}
      {draft && (
        <div className="flex w-full flex-col gap-5">
          <Panel title={t('play')} icon="settings">
            <SettingsGrid>
              <Select
                label={t('goal')}
                value={String(draft.daily_goal_chapters)}
                onValueChange={(v) => setDraft({ ...draft, daily_goal_chapters: Number(v) })}
                options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: t('goalOption', { count: n }) }))}
              />
              <Select
                label={t('limit')}
                value={String(draft.daily_time_limit_minutes ?? 0)}
                onValueChange={(v) => setDraft({ ...draft, daily_time_limit_minutes: Number(v) === 0 ? null : Number(v) })}
                options={[0, 15, 30, 45, 60].map((n) => ({ value: String(n), label: n === 0 ? t('noLimit') : t('limitOption', { count: n }) }))}
              />
              <SwitchRow checked={draft.sound} onCheckedChange={(v) => setDraft({ ...draft, sound: v })} label={t('sound')} />
              <SwitchRow checked={!draft.music?.parent_locked} onCheckedChange={(v) => setDraft({ ...draft, music: { ...(draft.music ?? { enabled: true, volume: 30 }), parent_locked: !v } })} label={tm('parentLock')} description={tm('parentLockHint')} />
              <SwitchRow
                checked={draft.read_aloud}
                onCheckedChange={(v) => setDraft({ ...draft, read_aloud: v })}
                label={t('readAloud')}
                description={t('readAloudHint')}
              />
              <SwitchRow checked={draft.voice?.computer_voice === true} onCheckedChange={(v) => setDraft({ ...draft, voice: { ...(draft.voice ?? { human_enabled: true }), computer_voice: v } })} label={t('computerVoice')} description={t('computerVoiceHint')} />
              <SwitchRow
                checked={draft.kid_can_change_language !== false}
                onCheckedChange={(v) => setDraft({ ...draft, kid_can_change_language: v })}
                label={t('kidLanguage')}
                description={t('kidLanguageHint')}
              />
              <SwitchRow
                checked={draft.remember_on_device === true}
                onCheckedChange={(v) => setDraft({ ...draft, remember_on_device: v })}
                label={t('rememberOnDevice')}
                description={t('rememberOnDeviceHint')}
              />
            </SettingsGrid>
          </Panel>

          <Panel title={t('worlds')} icon="map">
            <SettingsGrid>
              {/* Only worlds an admin marked ready can be switched on; one that is already on stays listed so it can be switched off */}
              {(worlds.data ?? [])
                .filter((x: World) => x.ready === true || draft.enabled_worlds.includes(x.id))
                .map(({ id: w }: World) => {
                const on = draft.enabled_worlds.includes(w);
                return (
                  <SwitchRow
                    key={w}
                    checked={on}
                    label={tw(w)}
                    disabled={on && draft.enabled_worlds.length === 1}
                    onCheckedChange={(v) =>
                      setDraft({
                        ...draft,
                        enabled_worlds: v ? [...draft.enabled_worlds, w] : draft.enabled_worlds.filter((x) => x !== w),
                      })
                    }
                  />
                );
              })}
            </SettingsGrid>
            <p className="mt-2 text-sm text-muted">{t('worldsHint')}</p>
          </Panel>

          <div className="sticky bottom-3 z-10 flex justify-end">
            <Button size="lg" className="max-sm:w-full" onClick={onSave} loading={save.isPending}>
              {t('save')}
            </Button>
          </div>

          <Panel title={t('data')} icon="download" className="border-danger/40">
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" iconLeft={<Icon name="download" />} onClick={onExport}>
                {t('export')}
              </Button>
              <Button variant="danger" iconLeft={<Icon name="trash" />} onClick={() => setConfirmOpen(true)}>
                {t('delete')}
              </Button>
            </div>
          </Panel>
        </div>
      )}

      <DeleteChildDialog childId={childId} name={child?.display_name ?? ''} open={confirmOpen} onOpenChange={setConfirmOpen} onDeleted={() => router.replace('/parent')} />
    </ParentPage>
  );
}
