'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { api, qs } from '@/lib/api';
import { useAct, useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import { STATUSES, type Issue } from '@/lib/qtypes';
import { Badge, Button, Card, PageTitle, Select, errText } from '@/components/ui';
import { Area } from '@/components/qfields';

interface Report {
  dry_run?: boolean;
  added: number;
  changed: number;
  unchanged: number;
  invalid: { id: string; issues: Issue[] }[];
}

export default function ImportPage() {
  const t = useT();
  const act = useAct();
  const toast = useUI((s) => s.toast);
  const locale = useUI((s) => s.locale);
  const worlds = useApi<{ items: { id: string; name: { fr: string; en: string } }[] }>('worlds');
  const file = useRef<HTMLInputElement>(null);
  const [exp, setExp] = useState({ world: '', status: '' });
  const [text, setText] = useState('');
  const [publish, setPublish] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [parseErr, setParseErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function download() {
    try {
      const d = await api<unknown>(`questions/export${qs(exp)}`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }));
      a.download = `questions${exp.world ? `-${exp.world}` : ''}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast('err', errText(e, t));
    }
  }
  const parse = () => {
    try {
      const v = JSON.parse(text);
      setParseErr('');
      return v;
    } catch (e) {
      setParseErr((e as Error).message);
      return undefined;
    }
  };
  async function dry() {
    const body = parse();
    if (body === undefined) return;
    setBusy(true);
    try {
      setReport(await api<Report>(`questions/import${qs({ dry_run: 1, publish: publish ? 1 : '' })}`, { method: 'POST', body }));
    } catch (e) {
      setReport(null);
      toast('err', errText(e, t));
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    const body = parse();
    if (body === undefined) return;
    setBusy(true);
    try {
      const r = await act(() => api<Report>(`questions/import${qs({ publish: publish ? 1 : '' })}`, { method: 'POST', body }), t('q.imported'));
      setReport(r as Report);
    } catch {
      /* act already toasted */
    } finally {
      setBusy(false);
    }
  }
  const applicable = report?.dry_run && report.added + report.changed > 0;
  return (
    <>
      <p className="mb-3">
        <Link href="/questions" className="text-sm font-semibold text-brand underline">
          {t('common.back_to', { where: t('nav.questions') })}
        </Link>
      </p>
      <PageTitle title={t('q.import_export')} sub={t('q.import_sub')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('q.export')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label={t('q.world')} value={exp.world} onChange={(e) => setExp({ ...exp, world: e.target.value })}>
              <option value="">{t('common.all')}</option>
              {worlds.data?.items.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name[locale]}
                </option>
              ))}
            </Select>
            <Select label={t('q.status')} value={exp.status} onChange={(e) => setExp({ ...exp, status: e.target.value })}>
              <option value="">{t('common.all')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`q.status.${s}` as 'q.status.draft')}
                </option>
              ))}
            </Select>
          </div>
          <Button className="mt-3" onClick={download}>
            {t('q.download')}
          </Button>
        </Card>
        <Card title={t('q.import')}>
          <input ref={file} type="file" accept="application/json,.json" aria-label={t('q.choose_file')} className="mb-3 block w-full text-sm" onChange={async (e) => (setText((await e.target.files?.[0]?.text()) ?? ''), setReport(null))} />
          <Area label={t('q.json')} rows={6} value={text} spellCheck={false} className="font-mono" onChange={(e) => (setText(e.target.value), setReport(null))} issues={parseErr ? [{ code: 'json', field: 'json', message: parseErr }] : []} />
          <label className="mt-2 flex min-h-9 items-center gap-2 text-sm">
            <input type="checkbox" checked={publish} onChange={(e) => (setPublish(e.target.checked), setReport(null))} />
            {t('q.import_publish')}
          </label>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" disabled={busy || !text.trim()} onClick={dry}>
              {t('q.dry_run')}
            </Button>
            <Button disabled={busy || !applicable} onClick={apply} title={applicable ? undefined : t('q.apply_needs_dry')}>
              {t('q.apply')}
            </Button>
          </div>
        </Card>
      </div>
      {report && (
        <Card title={report.dry_run ? t('q.report_dry') : t('q.report_done')} className="mt-4">
          <div role="status" className="flex flex-wrap gap-2">
            <Badge tone="ok">{t('q.r_added', { n: report.added })}</Badge>
            <Badge tone="info">{t('q.r_changed', { n: report.changed })}</Badge>
            <Badge>{t('q.r_unchanged', { n: report.unchanged })}</Badge>
            <Badge tone={report.invalid.length ? 'bad' : 'ok'}>{t('q.r_invalid', { n: report.invalid.length })}</Badge>
          </div>
          {report.invalid.length > 0 && (
            <ul className="mt-3 space-y-2 text-sm">
              {report.invalid.map((x) => (
                <li key={x.id} className="rounded-xl bg-danger-soft p-2">
                  <b>{x.id}</b>
                  <ul className="mt-1 text-xs">
                    {x.issues.map((i, k) => (
                      <li key={k}>
                        <code>{i.field}</code> {i.message}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
