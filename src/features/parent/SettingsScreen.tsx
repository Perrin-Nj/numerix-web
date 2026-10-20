'use client';
import { useState } from 'react';
import { usePrefs } from '@/platform/prefs/store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { exportChild, useChildren, useChildSettings, useDeleteChild, useUpdateSettings } from '@/data/hooks';
import { ParentPage } from './ParentPage';
import { useNotify } from '@/ui/notification-center';
import { reportError } from '@/platform/errors/bridge';
import { WORLD_IDS, type ChildSettings, type WorldId } from '@/data/api/types';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { FormField } from '@/ui/form-field';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Panel } from '@/ui/panel';
import { Select } from '@/ui/select';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from '@/game/screen-state';
import { Switch } from '@/ui/switch';

/** Per-child settings: goal, time limit, sound, read aloud, languages, worlds, data export and deletion. */
export function SettingsScreen({ childId }: { childId: string }) {
  const t = useTranslations('screens.parent.settings');
  const computerVoice = usePrefs((p) => p.computerVoice);
  const setPrefs = usePrefs((p) => p.set);
  const tw = useTranslations('worlds');
  const router = useRouter();
  const { notify } = useNotify();
  const settings = useChildSettings(childId);
  const save = useUpdateSettings(childId);
  const children = useChildren();
  const del = useDeleteChild();
  const [edits, setDraft] = useState<ChildSettings | null>(null);
  const draft = edits ?? settings.data ?? null;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');

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

  async function onDelete() {
    await del.mutateAsync(childId);
    setConfirmOpen(false);
    notify({ kind: 'success', title: t('deleted') });
    router.replace('/parent');
  }

  return (
    <ParentPage title={t('title')} backHref={`/parent/children/${childId}`}>
      {!draft && <ScreenState isLoading={settings.isLoading} error={settings.error} isEmpty onRetry={() => void settings.refetch()} area="parent" skeleton={<Skeleton shape="block" className="nx-skeleton-card" height={240} />}>{null}</ScreenState>}
      {draft && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <Panel title={t('play')} icon="settings">
            <div className="flex flex-col gap-4 [&>div:has(button[role=switch])]:border-t-2 [&>div:has(button[role=switch])]:border-line [&>div:has(button[role=switch])]:pt-4">
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
              <Switch checked={draft.sound} onCheckedChange={(v) => setDraft({ ...draft, sound: v })} label={t('sound')} />
              <Switch
                checked={draft.read_aloud}
                onCheckedChange={(v) => setDraft({ ...draft, read_aloud: v })}
                label={t('readAloud')}
                description={t('readAloudHint')}
              />
              <Switch checked={computerVoice} onCheckedChange={(v) => setPrefs({ computerVoice: v })} label={t('computerVoice')} description={t('computerVoiceHint')} />
              <Switch
                checked={draft.kid_can_change_language !== false}
                onCheckedChange={(v) => setDraft({ ...draft, kid_can_change_language: v })}
                label={t('kidLanguage')}
                description={t('kidLanguageHint')}
              />
              <Switch
                checked={draft.remember_on_device === true}
                onCheckedChange={(v) => setDraft({ ...draft, remember_on_device: v })}
                label={t('rememberOnDevice')}
                description={t('rememberOnDeviceHint')}
              />
            </div>
          </Panel>

          <Panel title={t('worlds')} icon="map">
            <div className="grid gap-3 sm:grid-cols-2">
              {WORLD_IDS.map((w: WorldId) => {
                const on = draft.enabled_worlds.includes(w);
                return (
                  <Switch
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
            </div>
            <p className="mt-2 text-sm text-muted">{t('worldsHint')}</p>
          </Panel>

          <div className="sticky bottom-3 z-10 flex">
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

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tone="danger"
        title={t('confirm.title')}
        description={t('confirm.description')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('confirm.cancel')}
            </Button>
            <Button variant="danger" loading={del.isPending} disabled={typed.trim() !== (child?.display_name ?? '')} onClick={onDelete}>
              {t('confirm.confirm')}
            </Button>
          </>
        }
      >
        <FormField label={t('confirm.type', { name: child?.display_name ?? '' })} htmlFor="confirm-name">
          <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </FormField>
      </Dialog>
    </ParentPage>
  );
}
