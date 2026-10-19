'use client';
import { useState } from 'react';
import { qs } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import { thumb, type AssetRow, type Question, type WorldRow } from '@/lib/qtypes';
import { Badge, Button, DataState, PageTitle, Select, Modal } from '@/components/ui';
import { Filters, Pager, SearchBox } from '@/components/parts';
import { Input } from '@/components/ui';

const SIZE = 24;

/** The API has no usage endpoint: usage = questions of the export that name the asset id (criteria based media resolve at play time and are not counted). */
function Detail({ a, onClose, usage }: { a: AssetRow | null; onClose: () => void; usage: { ids: string[] | null; error: boolean } }) {
  const t = useT();
  const locale = useUI((s) => s.locale);
  return (
    <Modal open={!!a} onClose={onClose} title={a ? (locale === 'fr' ? a.alt_fr : a.alt_en) : ''} wide>
      {a && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(a)} alt={locale === 'fr' ? a.alt_fr : a.alt_en} className="max-h-72 w-full rounded-xl bg-sunken object-contain" />
          <dl className="space-y-1.5 text-sm">
            <Row k="ID" v={<code className="break-all">{a.id}</code>} />
            <Row k={t('q.kind')} v={a.kind} />
            <Row k={t('q.world')} v={a.world || '-'} />
            <Row k={t('media.band')} v={a.grade_band} />
            <Row k={t('media.licence')} v={a.licence_url ? <a className="text-brand underline" href={a.licence_url} target="_blank" rel="noreferrer">{a.licence}</a> : a.licence} />
            <Row k={t('media.creator')} v={a.creator || '-'} />
            <Row k={t('media.source')} v={a.source_url ? <a className="text-brand underline" href={a.source_url} target="_blank" rel="noreferrer">{a.source_name}</a> : a.source_name} />
            <Row k={t('media.attribution')} v={a.attribution_required ? <span>{a.attribution_text}</span> : t('media.not_required')} />
            <Row k={t('media.review')} v={<Badge tone={a.review_status === 'approved' ? 'ok' : 'warn'}>{a.review_status}</Badge>} />
            <Row k={t('media.tags')} v={Object.entries(a.tags ?? {}).map(([k, v]) => `${k}: ${v.join(', ')}`).join(' / ') || '-'} />
            <Row k={t('media.usage')} v={usage.error ? t('err.title') : usage.ids === null ? '...' : usage.ids.length ? `${t('media.usage_n', { n: usage.ids.length })}: ${usage.ids.slice(0, 8).join(', ')}` : t('media.usage_n', { n: 0 })} />
          </dl>
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>{t('common.back')}</Button>
      </div>
    </Modal>
  );
}
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="grid grid-cols-[7rem_1fr] gap-2">
    <dt className="text-muted">{k}</dt>
    <dd className="min-w-0 break-words">{v}</dd>
  </div>
);

export default function MediaPage() {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const [f, setF] = useState({ q: '', world: '', kind: '', status: '', licence: '', page: 1 });
  const [sel, setSel] = useState<AssetRow | null>(null);
  const worlds = useApi<{ items: WorldRow[] }>('worlds');
  const bank = useApi<{ questions: Question[] }>('questions/export');
  const list = useApi<{ items: AssetRow[]; page: number; page_size: number; total: number }>(`assets${qs({ ...f, page_size: SIZE })}`);
  const up = (p: Partial<typeof f>) => setF((c) => ({ ...c, page: 1, ...p }));
  return (
    <>
      <PageTitle title={t('nav.media')} sub={t('media.sub')} />
      <p role="note" className="mb-4 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
        <b>{t('media.upload_off')}</b> {t('media.upload_off_body')}
      </p>
      <Filters>
        <SearchBox value={f.q} onChange={(q) => up({ q })} label={t('common.search')} />
        <Select label={t('q.world')} value={f.world} onChange={(e) => up({ world: e.target.value })}>
          <option value="">{t('common.all')}</option>
          {worlds.data?.items.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name[locale]}
            </option>
          ))}
        </Select>
        <Select label={t('q.kind')} value={f.kind} onChange={(e) => up({ kind: e.target.value })}>
          <option value="">{t('common.all')}</option>
          {['photo', 'sprite', 'vocab', 'illustration'].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </Select>
        <Select label={t('media.review')} value={f.status} onChange={(e) => up({ status: e.target.value })}>
          <option value="">{t('common.all')}</option>
          {['approved', 'pending', 'rejected'].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </Select>
        <Input label={t('media.licence')} value={f.licence} onChange={(e) => up({ licence: e.target.value })} className="w-32" />
      </Filters>
      <DataState q={list} isEmpty={(d) => !d.items.length} emptyText={t('q.media_none')}>
        {(d) => (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {d.items.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setSel(a)} className="flex h-full w-full flex-col rounded-xl border-2 border-line bg-elevated p-2 text-left hover:border-brand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb(a)} alt="" loading="lazy" className="h-24 w-full rounded-lg bg-sunken object-contain" />
                    <span className="mt-1 line-clamp-2 text-xs">{locale === 'fr' ? a.alt_fr : a.alt_en}</span>
                    <span className="mt-auto flex flex-wrap gap-1 pt-1">
                      <Badge tone="info">{a.licence}</Badge>
                      <Badge tone={a.review_status === 'approved' ? 'ok' : 'warn'}>{a.review_status}</Badge>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pager page={d.page} total={d.total} size={d.page_size} onPage={(page) => setF((c) => ({ ...c, page }))} />
          </>
        )}
      </DataState>
      <Detail key={sel?.id ?? 'none'} a={sel} onClose={() => setSel(null)} usage={{ ids: sel && bank.data ? bank.data.questions.filter((x) => x.media?.some((m) => m.asset === sel.id)).map((x) => x.id ?? '') : null, error: bank.isError }} />
    </>
  );
}
