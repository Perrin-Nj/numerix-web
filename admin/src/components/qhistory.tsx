'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import { diffQuestions, type Question, type QuestionView, type VersionRow } from '@/lib/qtypes';
import type { AuditEntry, Page } from '@/lib/types';
import { Badge, Button, Empty, fmtDate } from './ui';

/** Versions double as the per-question audit trail (actor, action, time); the diff compares any version with the one before it or with the current text. */
export function History({ view, onRestore, dirty }: { view: QuestionView; onRestore: (v: number) => void; dirty: boolean }) {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const [sel, setSel] = useState<number | null>(null);
  const versions = view.versions;
  const prev = sel === null ? null : (versions.find((v) => v.version < sel) ?? null);
  const a = useQuery({ queryKey: ['api', 'qv', view.id, sel], queryFn: () => api<{ question: Question }>(`questions/${view.id}/versions/${sel}`), enabled: sel !== null });
  const b = useQuery({ queryKey: ['api', 'qv', view.id, prev?.version], queryFn: () => api<{ question: Question }>(`questions/${view.id}/versions/${prev!.version}`), enabled: prev !== null });
  const audit = useQuery({ queryKey: ['api', 'audit', 'q', view.id, view.version], queryFn: () => api<Page<AuditEntry>>('audit?page_size=100') });
  const rows = (audit.data?.items ?? []).filter((e) => e.target_id === view.id);
  const diff = a.data && (prev ? b.data : true) ? diffQuestions(prev ? b.data!.question : ({} as Question), a.data.question) : null;
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold">{t('q.versions')}</h3>
        <ol className="space-y-1.5">
          {versions.map((v: VersionRow) => (
            <li key={v.version} className="rounded-xl border border-line p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <b>v{v.version}</b>
                <Badge tone={v.status === 'published' ? 'ok' : 'neutral'}>{t(`q.status.${v.status}` as 'q.status.draft')}</Badge>
                <span className="text-muted">
                  {v.action} / {v.actor}
                </span>
                <span className="ml-auto text-xs text-muted">{fmtDate(v.at, locale)}</span>
              </div>
              <div className="mt-1.5 flex gap-2">
                <Button small aria-pressed={sel === v.version} onClick={() => setSel(sel === v.version ? null : v.version)}>
                  {t('q.diff')}
                </Button>
                {v.version !== view.version && (
                  <Button small onClick={() => onRestore(v.version)} disabled={dirty} title={dirty ? t('q.save_first') : undefined}>
                    {t('q.restore')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
      {sel !== null && (
        <section aria-live="polite">
          <h3 className="mb-2 text-sm font-semibold">{prev ? t('q.diff_title', { a: prev.version, b: sel }) : t('q.diff_first', { b: sel })}</h3>
          {diff === null ? (
            <p className="text-sm text-muted">{t('common.working')}</p>
          ) : diff.length === 0 ? (
            <p className="text-sm text-muted">{t('q.diff_none')}</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {diff.map((d) => (
                <li key={d.path} className="rounded-lg bg-sunken p-2">
                  <code className="font-semibold">{d.path}</code>
                  {d.from !== undefined && <div className="break-words text-danger">- {d.from}</div>}
                  {d.to !== undefined && <div className="break-words text-success">+ {d.to}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section>
        <h3 className="mb-2 text-sm font-semibold">{t('q.audit')}</h3>
        {audit.isError ? (
          <p role="alert" className="text-sm text-danger">
            {(audit.error as Error).message}
          </p>
        ) : rows.length === 0 ? (
          <Empty text={t('audit.empty')} />
        ) : (
          <ul className="space-y-1 text-xs">
            {rows.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-2 rounded-lg bg-sunken p-2">
                <Badge tone="brand">{e.action}</Badge>
                <span>{e.actor}</span>
                <span className="text-muted">{fmtDate(e.at, locale)}</span>
                {e.detail ? <span className="w-full break-words text-muted">{typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)}</span> : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-muted">{t('q.audit_note')}</p>
      </section>
    </div>
  );
}
