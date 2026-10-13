'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAct, useApi, useDraft } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import type { Activity, Child } from '@/lib/types';
import { Badge, Button, Card, DataState, Input, PageTitle, Select, Skeleton, Switch, fmtDate } from '@/components/ui';
import { TableWrap, Td, Th } from '@/components/parts';

export default function ChildDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const locale = useUI((s) => s.locale);
  const act = useAct();
  const q = useApi<Child>(`children/${id}`);
  const activity = useApi<Activity>(`children/${id}/activity`);
  const { cur, set, dirty, reset } = useDraft(q.data);

  return (
    <>
      <div className="mb-3">
        <Link href="/children" className="text-sm font-semibold text-brand hover:underline">
          {t('common.back_to', { where: t('nav.children') })}
        </Link>
      </div>
      <DataState q={q} skeleton={<Skeleton className="h-64" />}>
        {(c) => {
          const d = cur ?? c;
          const patch = (p: Partial<Child>) => set({ ...d, ...p });
          const setting = (p: Partial<Child['settings']>) => set({ ...d, settings: { ...d.settings, ...p } });
          return (
            <>
              <PageTitle
                title={c.display_name}
                sub={t('cd.audit_note')}
                action={
                  <Link href={`/parents/${c.parent_id}`} className="rounded-xl border border-line bg-elevated px-3 py-2 text-sm font-semibold hover:bg-sunken">
                    {t('col.parent')}: {c.parent?.name ?? c.parent_id}
                  </Link>
                }
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <Card
                  title={t('cd.edit')}
                  className="lg:col-span-2"
                  action={dirty ? <Badge tone="warn">{t('common.unsaved')}</Badge> : <Badge tone="ok">{t('common.saved')}</Badge>}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Input label={t('col.child')} value={d.display_name} maxLength={30} onChange={(e) => patch({ display_name: e.target.value })} />
                    <Select label={t('col.grade')} value={String(d.grade)} onChange={(e) => patch({ grade: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5, 6].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </Select>
                    <Input label={t('cd.avatar')} value={d.avatar_id ?? ''} onChange={(e) => patch({ avatar_id: e.target.value })} />
                    <Input
                      label={t('cd.goal')}
                      type="number"
                      min={1}
                      max={5}
                      value={d.settings.daily_goal_chapters}
                      onChange={(e) => setting({ daily_goal_chapters: Number(e.target.value) })}
                    />
                    <Input
                      label={t('cd.daily_limit')}
                      type="number"
                      min={5}
                      max={180}
                      placeholder={t('cd.no_limit')}
                      value={d.settings.daily_time_limit_minutes ?? ''}
                      onChange={(e) => setting({ daily_time_limit_minutes: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div className="mt-2 grid max-w-3xl gap-x-8 sm:grid-cols-2">
                    <Switch label={t('cd.kid_lang')} hint={t('cd.kid_lang_hint')} checked={d.settings.kid_can_change_language} onChange={(v) => setting({ kid_can_change_language: v })} />
                    <Switch label={t('cd.read_aloud')} checked={d.settings.read_aloud} onChange={(v) => setting({ read_aloud: v })} />
                    <Switch label={t('cd.sound')} checked={d.settings.sound} onChange={(v) => setting({ sound: v })} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="primary"
                      disabled={!dirty}
                      onClick={() =>
                        act(
                          () =>
                            api(`children/${c.id}`, {
                              method: 'PATCH',
                              body: { display_name: d.display_name, grade: d.grade, avatar_id: d.avatar_id, settings: d.settings },
                            }),
                          t('toast.saved'),
                        ).catch(() => undefined)
                      }
                    >
                      {t('common.save')}
                    </Button>
                    <Button disabled={!dirty} onClick={reset}>
                      {t('common.discard')}
                    </Button>
                  </div>
                </Card>

                <Card title={t('cd.progress')}>
                  <dl className="grid grid-cols-2 gap-x-4 text-sm">
                    {(
                      [
                        [t('col.last_seen'), fmtDate(c.last_seen_at, locale)],
                        [t('col.minutes_today'), c.minutes_today],
                        [t('cd.sessions_total'), c.sessions_total],
                        [t('col.cards'), c.cards_total],
                        [t('col.skills'), c.skills_mastered],
                      ] as [string, string | number][]
                    ).map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="border-b border-line py-2 text-muted">{k}</dt>
                        <dd className="border-b border-line py-2 text-right font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>

                <Card title={t('cd.sessions')}>
                  <DataState q={activity} isEmpty={(a) => !a.sessions.length} emptyText={t('common.empty')} skeleton={<Skeleton className="h-24" />}>
                    {(a) => (
                      <TableWrap>
                        <thead>
                          <tr>
                            <Th>{t('cd.when')}</Th>
                            <Th>{t('cd.skill')}</Th>
                            <Th>{t('cd.score')}</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.sessions.map((s) => (
                            <tr key={s.id}>
                              <Td>{fmtDate(s.started_at, locale)}</Td>
                              <Td>{s.skill_name}</Td>
                              <Td>
                                {s.correct}/{s.total} {s.card_awarded && <Badge tone="ok">{t('col.cards')}</Badge>}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </TableWrap>
                    )}
                  </DataState>
                </Card>

                <Card title={t('col.cards')}>
                  <DataState q={activity} isEmpty={(a) => !a.cards.length} emptyText={t('common.empty')} skeleton={<Skeleton className="h-12" />}>
                    {(a) => (
                      <ul className="flex flex-wrap gap-2">
                        {a.cards.map((x) => (
                          <li key={x.id}>
                            <Badge tone="brand">{x.name}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </DataState>
                </Card>

                <Card title={t('col.skills')}>
                  <DataState q={activity} isEmpty={(a) => !a.skills.length} emptyText={t('common.empty')} skeleton={<Skeleton className="h-12" />}>
                    {(a) => (
                      <ul className="flex flex-wrap gap-2">
                        {a.skills.map((x) => (
                          <li key={x.skill_id}>
                            <Badge tone="ok">
                              {x.name} {x.mastery_pct}%
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </DataState>
                </Card>
              </div>
            </>
          );
        }}
      </DataState>
    </>
  );
}
