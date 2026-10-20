'use client';
import { useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAct, useApi, useDraft } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import type { CfgDoc, CfgVersion } from '@/lib/types';
import { Badge, Button, Card, ConfirmDialog, DataState, PageTitle, fmtDate, type ConfirmSpec } from '@/components/ui';

/**
 * One editable config document (Music, Voice, Scenes, Feed, Maintenance...): load, edit a local draft, save with the
 * version the editor loaded (a stale save answers 409), roll back, and browse the history. The server validates.
 */
export function ConfigEditor<T extends object>({
  ns,
  title,
  sub,
  riskyBody,
  section,
  children,
}: {
  /** Embedded below another page: a heading instead of the page title. */
  section?: boolean;
  ns: string;
  title: string;
  sub: string;
  /** Returns a warning text when this save needs a confirmation, else null. */
  riskyBody?: (draft: T, server: T) => string | null;
  children: (d: T, patch: (p: Partial<T>) => void, server: T) => ReactNode;
}) {
  const t = useT();
  const act = useAct();
  const locale = useUI((s) => s.locale);
  const q = useApi<CfgDoc<T>>(`appconfig/${ns}`);
  const hist = useApi<{ items: CfgVersion[] }>(`appconfig/${ns}/versions`);
  const { cur, set, dirty, reset } = useDraft(q.data?.value);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  return (
    <>
      {section ? (
        <h2 className="mb-3 mt-8 font-display text-xl font-bold">{title}</h2>
      ) : (
        <PageTitle title={title} sub={sub} action={dirty ? <Badge tone="warn">{t('common.unsaved')}</Badge> : <Badge tone="ok">{t('common.saved')}</Badge>} />
      )}
      <DataState q={q}>
        {(doc) => {
          const d = (cur ?? doc.value) as T;
          const patch = (p: Partial<T>) => set({ ...d, ...p });
          const save = () => {
            const run = () => act(() => api(`appconfig/${ns}`, { method: 'PUT', body: { value: d, expected_version: doc.version } }), t('toast.saved'));
            const risk = riskyBody?.(d, doc.value);
            if (risk) setConfirm({ title: t('common.save'), body: risk, confirmLabel: t('common.save'), run });
            else run().catch(() => undefined);
          };
          const rollback = (to?: number) =>
            setConfirm({
              title: t('cfg.rollback_confirm'),
              body: t('cfg.rollback_body'),
              confirmLabel: t('cfg.rollback'),
              run: () => act(() => api(`appconfig/${ns}/rollback`, { method: 'POST', body: to ? { to_version: to } : {} }), t('toast.saved')),
            });
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                {doc.version === 0 ? t('cfg.never_saved') : `${t('cfg.version', { v: doc.version })} - ${t('cfg.by', { who: doc.updated_by, when: fmtDate(doc.updated_at, locale) })}`}
              </p>
              <Card>{children(d, patch, doc.value)}</Card>
              <p className="text-xs text-muted">{t('cfg.public_note')}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" disabled={!dirty} onClick={save}>
                  {t('common.save')}
                </Button>
                <Button disabled={!dirty} onClick={reset}>
                  {t('common.discard')}
                </Button>
                <Button disabled={doc.version === 0} onClick={() => rollback()}>
                  {t('cfg.rollback')}
                </Button>
              </div>
              <Card title={t('cfg.history')}>
                <DataState q={hist} isEmpty={(h) => h.items.length === 0} emptyText={t('cfg.history_empty')}>
                  {(h) => (
                    <ul className="divide-y divide-line text-sm">
                      {h.items.map((v) => (
                        <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <span>
                            <Badge tone={v.action === 'rollback' ? 'info' : 'neutral'}>{t(`cfg.action_${v.action}` as 'cfg.action_set')}</Badge>{' '}
                            <strong>v{v.version}</strong> - {v.actor}, {fmtDate(v.at, locale)}
                          </span>
                          {v.version !== doc.version && (
                            <Button small onClick={() => rollback(v.version)}>
                              {t('cfg.restore')}
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </DataState>
              </Card>
            </div>
          );
        }}
      </DataState>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
