'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAct, useApi, useDraft } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import type { AICfg, CopyCfg, EnvItem, PlatformConfig } from '@/lib/types';
import { ConfigEditor } from '@/components/cfgeditor';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, PageTitle, Select, Switch, type ConfirmSpec } from '@/components/ui';

export default function ConfigPage() {
  const t = useT();
  const act = useAct();
  const q = useApi<PlatformConfig>('config');
  const { cur, set, dirty, reset } = useDraft(q.data);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [flag, setFlag] = useState('');

  return (
    <>
      <PageTitle
        title={t('nav.config')}
        sub={t('config.sub')}
        action={dirty ? <Badge tone="warn">{t('common.unsaved')}</Badge> : <Badge tone="ok">{t('common.saved')}</Badge>}
      />
      <DataState q={q}>
        {(server) => {
          const d = cur ?? server;
          const patch = (p: Partial<PlatformConfig>) => set({ ...d, ...p });
          const mark = (k: keyof PlatformConfig) => (JSON.stringify(d[k]) !== JSON.stringify(server[k]) ? ` (${t('common.changed')})` : '');
          const numField = (k: 'card_threshold_pct' | 'trial_days' | 'daily_time_limit_minutes_default' | 'reminder_hour_local' | 'expiring_warning_days', max: number, hint?: string) => (
            <div>
              <Input label={t(`config.${k}`) + mark(k)} type="number" min={0} max={max} value={d[k] ?? ''} onChange={(e) => patch({ [k]: e.target.value === '' && k === 'daily_time_limit_minutes_default' ? null : Number(e.target.value) })} />
              {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
            </div>
          );
          const save = () => {
            const run = () => act(() => api('config', { method: 'PUT', body: d }), t('toast.saved'));
            if (d.unpaid_policy !== server.unpaid_policy)
              setConfirm({ title: t('config.policy_confirm'), body: t(`config.policy_${d.unpaid_policy}`), confirmLabel: t('common.save'), run });
            else run().catch(() => undefined);
          };
          return (
            <div className="space-y-4">
              <Card title={t('config.access')}>
                <Select label={t('config.unpaid_policy') + mark('unpaid_policy')} value={d.unpaid_policy} onChange={(e) => patch({ unpaid_policy: e.target.value as PlatformConfig['unpaid_policy'] })} className="max-w-sm">
                  <option value="block">{t('config.block')}</option>
                  <option value="allow">{t('config.allow')}</option>
                </Select>
                <p className="mt-2 max-w-2xl rounded-xl bg-sunken p-3 text-sm text-muted">{t(`config.policy_${d.unpaid_policy}`)}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {numField('trial_days', 365)}
                  {numField('expiring_warning_days', 60)}
                </div>
              </Card>
              <Card title={t('config.kids')}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {numField('card_threshold_pct', 100, t('config.card_hint'))}
                  {numField('daily_time_limit_minutes_default', 180)}
                  {numField('reminder_hour_local', 23, t('config.hour_hint'))}
                  <Select label={t('config.default_locale') + mark('default_locale')} value={d.default_locale} onChange={(e) => patch({ default_locale: e.target.value })}>
                    <option value="fr-CA">FR (CA)</option>
                    <option value="en-CA">EN (CA)</option>
                  </Select>
                </div>
              </Card>
              <Card>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label={t('config.daily_goal_default') + mark('daily_goal_default')} type="number" min={1} max={5} value={d.daily_goal_default ?? 1} onChange={(e) => patch({ daily_goal_default: Number(e.target.value) })} />
                  <Switch label={t('config.welcome_gift')} hint={t('config.welcome_gift_hint')} checked={!!d.welcome_gift} onChange={(v) => patch({ welcome_gift: v })} />
                </div>
              </Card>
              <Card title={t('config.features') + mark('features')}>
                {Object.keys(d.features ?? {}).length === 0 && <p className="text-sm text-muted">{t('config.no_flags')}</p>}
                <div className="grid gap-x-8 sm:grid-cols-2">
                  {Object.entries(d.features ?? {}).map(([k, v]) => (
                    <Switch key={k} label={k} checked={!!v} onChange={(val) => patch({ features: { ...d.features, [k]: val } })} />
                  ))}
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <Input label={t('config.new_flag')} value={flag} onChange={(e) => setFlag(e.target.value.replace(/[^a-z0-9_]/gi, '_'))} className="w-56" />
                  <Button
                    disabled={!flag || flag in (d.features ?? {})}
                    onClick={() => {
                      patch({ features: { ...d.features, [flag]: false } });
                      setFlag('');
                    }}
                  >
                    {t('common.add')}
                  </Button>
                </div>
              </Card>
              <div className="flex gap-2">
                <Button variant="primary" disabled={!dirty} onClick={save}>
                  {t('common.save')}
                </Button>
                <Button disabled={!dirty} onClick={reset}>
                  {t('common.discard')}
                </Button>
              </div>
            </div>
          );
        }}
      </DataState>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
      <ConfigEditor<AICfg> section ns="ai" title={t('config.ai_title')} sub="">
        {(d, patch) => (
          <>
            <Switch label={t('config.ai_draft')} checked={d.draft_enabled} onChange={(v) => patch({ draft_enabled: v })} />
            <Switch label={t('config.ai_narrator')} checked={d.narrator_enabled} onChange={(v) => patch({ narrator_enabled: v })} />
          </>
        )}
      </ConfigEditor>
      <ConfigEditor<CopyCfg> section ns="copy" title={t('config.copy_title')} sub="">
        {(d, patch) => (
          <div className="space-y-4">
            {(['home_tip', 'feed_empty', 'session_done'] as const).map((k) => (
              <div key={k} className="grid gap-3 sm:grid-cols-2">
                <Input label={`${t(`config.copy_${k}`)} (FR)`} value={d[k].fr} maxLength={200} onChange={(e) => patch({ [k]: { ...d[k], fr: e.target.value } })} />
                <Input label={`${t(`config.copy_${k}`)} (EN)`} value={d[k].en} maxLength={200} onChange={(e) => patch({ [k]: { ...d[k], en: e.target.value } })} />
              </div>
            ))}
          </div>
        )}
      </ConfigEditor>
      <EnvPanel />
    </>
  );
}

/** Settings that stay in the server environment: shown read only, secrets only as set / not set. */
function EnvPanel() {
  const t = useT();
  const q = useApi<{ env: EnvItem[] }>('appconfig');
  return (
    <div className="mt-8">
      <h2 className="font-display text-xl font-bold">{t('cfg.env_title')}</h2>
      <p className="mb-3 text-sm text-muted">{t('cfg.env_sub')}</p>
      <DataState q={q}>
        {(d) => (
          <Card>
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {d.env.map((e) => (
                <li key={e.key} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <code className="break-all">{e.key}</code>
                  <span className="flex items-center gap-2">
                    {e.value && <span className="max-w-40 truncate text-muted">{e.value}</span>}
                    {e.secret && <Badge>{t('cfg.env_secret')}</Badge>}
                    <Badge tone={e.set ? 'ok' : 'neutral'}>{e.set ? t('cfg.env_set') : t('cfg.env_unset')}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </DataState>
    </div>
  );
}
