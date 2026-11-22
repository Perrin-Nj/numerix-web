'use client';
import { api } from '@/lib/api';
import { useAct, useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import type { AdminWorld, PlatformConfig } from '@/lib/types';
import { Badge, Card, DataState, PageTitle, Skeleton } from '@/components/ui';

function Toggle({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${on ? 'bg-brand' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

/** Worlds: open or close (status), mark ready for parents, mark as default for new children. */
export default function WorldsPage() {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const act = useAct();
  const worlds = useApi<{ items: AdminWorld[] }>('worlds');
  const cfg = useApi<PlatformConfig>('config');
  const label = (w: AdminWorld) => (typeof w.name === 'string' ? w.name : (w.name?.[locale] ?? w.id));

  return (
    <>
      <PageTitle title={t('worlds.title')} sub={t('worlds.sub')} />
      <p className="mb-3 text-sm text-muted">{t('worlds.hint_ready')}</p>
      <DataState q={worlds} skeleton={<Skeleton className="h-64" />}>
        {(wd) => (
          <DataState q={cfg} skeleton={<Skeleton className="h-64" />}>
            {(c) => {
              const ready = c.ready_worlds ?? [];
              const dflt = c.default_worlds ?? [];
              const saveLists = (next: { ready_worlds: string[]; default_worlds: string[] }) =>
                act(() => api('config', { method: 'PUT', body: { ...c, ...next } }), t('worlds.toast_cfg')).catch(() => undefined);
              return (
                <Card>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-muted">
                        <th className="py-2 pr-3">{t('worlds.col_world')}</th>
                        <th className="py-2 pr-3">{t('worlds.col_status')}</th>
                        <th className="py-2 pr-3">{t('worlds.col_ready')}</th>
                        <th className="py-2">{t('worlds.col_default')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wd.items.map((w) => {
                        const open = w.status === 'published';
                        const isReady = ready.includes(w.id);
                        const isDefault = dflt.includes(w.id);
                        return (
                          <tr key={w.id} className="border-b border-line last:border-0" data-world={w.id}>
                            <td className="py-2 pr-3 font-medium">
                              {label(w)} <code className="text-xs text-muted">{w.id}</code>
                            </td>
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-2">
                                {/* closing a ready or default world is refused by the server (422): take it off the lists first */}
                                <Toggle
                                  on={open}
                                  label={`${t('worlds.col_status')}: ${label(w)}`}
                                  onChange={(v) => act(() => api(`worlds/${w.id}/status`, { method: 'PUT', body: { status: v ? 'published' : 'draft' } }), t('worlds.toast_status')).catch(() => undefined)}
                                />
                                <Badge tone={open ? 'ok' : 'neutral'}>{open ? t('worlds.open') : t('worlds.closed')}</Badge>
                              </div>
                            </td>
                            <td className="py-2 pr-3">
                              <Toggle
                                on={isReady}
                                label={`${t('worlds.col_ready')}: ${label(w)}`}
                                disabled={!open || (isReady && isDefault)}
                                onChange={(v) => saveLists({ default_worlds: dflt, ready_worlds: v ? [...ready, w.id] : ready.filter((x) => x !== w.id) })}
                              />
                            </td>
                            <td className="py-2">
                              <Toggle
                                on={isDefault}
                                label={`${t('worlds.col_default')}: ${label(w)}`}
                                disabled={!isReady || (isDefault && dflt.length === 1)}
                                onChange={(v) => saveLists({ ready_worlds: ready, default_worlds: v ? [...dflt, w.id] : dflt.filter((x) => x !== w.id) })}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              );
            }}
          </DataState>
        )}
      </DataState>
    </>
  );
}
