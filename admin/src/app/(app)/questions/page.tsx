'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, qs } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import { TYPES, STATUSES, type Coverage, type QuestRow, type QuestionRow, type WorldRow } from '@/lib/qtypes';
import { Badge, Button, Card, DataState, Input, PageTitle, Select, fmtDay } from '@/components/ui';
import { Filters, Pager, SearchBox, TableWrap, Td, Th } from '@/components/parts';
import { AiDraft } from '@/components/aidraft';
import { statusTone } from '@/components/qfields';

const SIZE = 20;

/** published (solid) and unpublished work (light) against the target; the numbers are always written, never only the colour. */
function Bar({ pub, other, target, label }: { pub: number; other: number; target: number; label: string }) {
  const t = useT();
  const pct = (n: number) => `${Math.min(100, (n / Math.max(1, target)) * 100)}%`;
  const tone = pub >= target ? 'text-success' : pub >= target - 2 ? 'text-warning' : 'text-danger';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className={`shrink-0 font-semibold ${tone}`}>
          {pub}/{target}
          {pub < target && <span className="ml-1 text-xs font-normal">{t('q.missing', { n: target - pub })}</span>}
        </span>
      </div>
      <div role="img" aria-label={`${label}: ${pub} / ${target}`} className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-sunken">
        <div className="absolute inset-y-0 left-0 bg-brand/30" style={{ width: pct(pub + other) }} />
        <div className="absolute inset-y-0 left-0 bg-brand" style={{ width: pct(pub) }} />
      </div>
    </div>
  );
}

function CoveragePanel({ world, onWorld }: { world: string; onWorld: (w: string) => void }) {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const cov = useApi<Coverage>('content/coverage');
  const worlds = useApi<{ items: WorldRow[] }>('worlds');
  const quests = useApi<{ items: QuestRow[] }>('quests');
  return (
    <Card title={t('q.coverage')} className="mb-5">
      <p className="mb-3 max-w-3xl text-xs text-muted">{t('q.coverage_legend')}</p>
      <DataState q={cov}>
        {(c) => {
          const per = (w: string) => {
            const qs_ = c.quests.filter((x) => x.world === w);
            const pub = qs_.reduce((s, x) => s + Math.min(x.by_status.published ?? 0, x.target_count), 0);
            const other = qs_.reduce((s, x) => s + (x.by_status.review ?? 0) + (x.by_status.draft ?? 0), 0);
            return { qs: qs_, pub, other, target: qs_.reduce((s, x) => s + x.target_count, 0) };
          };
          return (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(worlds.data?.items ?? []).map((w) => {
                const p = per(w.id);
                return (
                  <li key={w.id} className={`rounded-xl border-2 p-2.5 ${world === w.id ? 'border-brand' : 'border-line'}`}>
                    <button type="button" className="mb-1 w-full text-left" aria-pressed={world === w.id} onClick={() => onWorld(world === w.id ? '' : w.id)}>
                      <Bar pub={p.pub} other={p.other} target={p.target} label={w.name[locale]} />
                    </button>
                    <details>
                      <summary className="cursor-pointer text-xs text-muted">{t('q.by_quest', { n: p.qs.length })}</summary>
                      <ul className="mt-2 space-y-2">
                        {p.qs.map((x) => (
                          <li key={x.quest}>
                            <Bar pub={x.by_status.published ?? 0} other={(x.by_status.review ?? 0) + (x.by_status.draft ?? 0)} target={x.target_count} label={quests.data?.items.find((y) => y.id === x.quest)?.name[locale] ?? x.quest} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>
          );
        }}
      </DataState>
    </Card>
  );
}

export default function QuestionsPage() {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const [f, setFS] = useState({ world: '', quest: '', type: '', grade: '', difficulty: '', status: '', tag: '', q: '', page: 1 });
  const [ai, setAi] = useState(false);
  const setF = (p: Partial<typeof f>) => setFS((c) => ({ ...c, page: 1, ...p }));
  const worlds = useQuery({ queryKey: ['api', 'worlds'], queryFn: () => api<{ items: WorldRow[] }>('worlds') });
  const quests = useQuery({ queryKey: ['api', 'quests'], queryFn: () => api<{ items: QuestRow[] }>('quests') });
  const list = useApi<{ items: QuestionRow[]; page: number; page_size: number; total: number }>(`questions${qs({ ...f, page_size: SIZE })}`);
  const sel = (k: keyof typeof f, label: string, opts: { v: string; l: string }[], onChange?: (v: string) => void) => (
    <Select label={label} value={String(f[k])} onChange={(e) => (onChange ? onChange(e.target.value) : setF({ [k]: e.target.value }))}>
      <option value="">{t('common.all')}</option>
      {opts.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </Select>
  );
  return (
    <>
      <PageTitle
        title={t('nav.questions')}
        sub={t('q.sub')}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/questions/import" className="inline-flex min-h-11 items-center rounded-xl border-2 border-line bg-elevated px-4 text-sm font-semibold hover:bg-sunken">
              {t('q.import_export')}
            </Link>
            <Button onClick={() => setAi(true)}>{t('q.ai_open')}</Button>
            <Link href="/questions/new" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-brand-fg">
              {t('q.new')}
            </Link>
          </div>
        }
      />
      <CoveragePanel world={f.world} onWorld={(world) => setF({ world, quest: '' })} />
      <Filters>
        <SearchBox value={f.q} onChange={(q) => setF({ q })} label={t('common.search')} />
        {sel('world', t('q.world'), (worlds.data?.items ?? []).map((w) => ({ v: w.id, l: w.name[locale] })), (world) => setF({ world, quest: '' }))}
        {sel('quest', t('q.quest'), (quests.data?.items ?? []).filter((x) => !f.world || x.world === f.world).map((x) => ({ v: x.id, l: x.name[locale] })))}
        {sel('type', t('q.type'), TYPES.map((k) => ({ v: k, l: t(`q.type.${k}` as 'q.type.numeric') })))}
        {sel('grade', t('q.grade'), [1, 2, 3, 4, 5, 6].map((g) => ({ v: String(g), l: String(g) })))}
        {sel('difficulty', t('q.difficulty'), [1, 2, 3, 4, 5].map((g) => ({ v: String(g), l: String(g) })))}
        {sel('status', t('q.status'), STATUSES.map((s) => ({ v: s, l: t(`q.status.${s}` as 'q.status.draft') })))}
        <Input label={t('q.tag')} value={f.tag} onChange={(e) => setF({ tag: e.target.value })} className="w-36" />
      </Filters>
      <DataState q={list} isEmpty={(d) => !d.items.length} emptyText={t('q.empty')}>
        {(d) => (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>{t('q.type')}</Th>
                  <Th>{t('q.grade')}</Th>
                  <Th>{t('q.difficulty')}</Th>
                  <Th>{t('q.status')}</Th>
                  <Th>{t('q.prompt')}</Th>
                  <Th>{t('q.updated')}</Th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((r) => (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap">
                      <Link href={`/questions/${r.id}`} className="font-semibold text-brand underline">
                        {r.id}
                      </Link>
                    </Td>
                    <Td>{t(`q.type.${r.type}` as 'q.type.numeric')}</Td>
                    <Td>{r.grade}</Td>
                    <Td>{r.difficulty}</Td>
                    <Td>
                      <Badge tone={statusTone[r.status]}>{t(`q.status.${r.status}` as 'q.status.draft')}</Badge> {r.ai_drafted && <Badge tone="info">{t('q.ai_chip')}</Badge>}
                    </Td>
                    <Td className="max-w-xs truncate">{locale === 'fr' ? r.prompt_fr : r.prompt_en}</Td>
                    <Td className="whitespace-nowrap">{fmtDay(r.updated_at, locale)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pager page={d.page} total={d.total} size={d.page_size} onPage={(page) => setFS((c) => ({ ...c, page }))} />
          </>
        )}
      </DataState>
      <AiDraft open={ai} onClose={() => setAi(false)} />
    </>
  );
}
