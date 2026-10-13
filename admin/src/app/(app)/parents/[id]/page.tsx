'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAct, useApi, useParentActions } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import type { BroadcastRow, Page, Parent, Plan } from '@/lib/types';
import type { Key } from '@/messages/fr';
import { Badge, Button, Card, ConfirmDialog, DataState, Empty, Input, PageTitle, Select, Skeleton, fmtDate, fmtDay, type ConfirmSpec } from '@/components/ui';
import { AccountBadge, SubBadge } from '@/components/parts';

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

export default function ParentDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const router = useRouter();
  const locale = useUI((s) => s.locale);
  const act = useAct();
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [days, setDays] = useState('30');
  const [plan, setPlan] = useState<Plan | ''>('');
  const actions = useParentActions(setConfirm);
  const q = useApi<Parent>(`parents/${id}`);
  const notes = useApi<Page<BroadcastRow>>('notifications?page_size=100');

  return (
    <>
      <div className="mb-3">
        <Link href="/parents" className="text-sm font-semibold text-brand hover:underline">
          {t('common.back_to', { where: t('nav.parents') })}
        </Link>
      </div>
      <DataState q={q} skeleton={<Skeleton className="h-64" />}>
        {(p) => {
          const s = p.subscription;
          return (
            <>
              <PageTitle
                title={p.name}
                sub={p.email}
                action={
                  <div className="flex gap-2">
                    <AccountBadge status={p.status} />
                    <SubBadge status={s.status} />
                  </div>
                }
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title={t('pd.profile')}>
                  <Row k={t('pd.email')} v={p.email} />
                  <Row k={t('pd.locale')} v={p.locale?.toUpperCase()} />
                  <Row k={t('col.created')} v={fmtDay(p.created_at, locale)} />
                  <Row k={t('col.kids')} v={p.children_count} />
                  {p.status === 'blocked' && <Row k={t('pd.blocked_reason')} v={p.blocked_reason || '-'} />}
                  <div className="mt-3">
                    {p.status === 'blocked' ? (
                      <Button onClick={() => actions.unblock(p)}>{t('act.unblock')}</Button>
                    ) : (
                      <Button onClick={() => actions.block(p)}>{t('act.block')}</Button>
                    )}
                  </div>
                </Card>

                <Card title={t('pd.subscription')}>
                  <Row k={t('f.subscription')} v={<SubBadge status={s.status} />} />
                  <Row k={t('f.plan')} v={t(`plan.${s.plan}`)} />
                  <Row k={t('pd.method')} v={s.method ? t(`method.${s.method}`) : '-'} />
                  <Row k={t('pd.renews')} v={fmtDay(s.renews_at, locale)} />
                  {s.trial_ends_at && <Row k={t('pd.trial_ends')} v={fmtDay(s.trial_ends_at, locale)} />}
                  {s.marked_by_admin && <Row k={t('pd.admin_mark')} v={<Badge tone="brand">{t('common.yes')}</Badge>} />}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.status === 'active' ? <Button onClick={() => actions.unpaid(p)}>{t('act.unpaid')}</Button> : <Button variant="primary" onClick={() => actions.paid(p)}>{t('act.paid')}</Button>}
                  </div>
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <Input label={t('pd.extend')} type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} className="w-28" />
                    <Button
                      disabled={!(Number(days) > 0)}
                      onClick={() => actions.patch(p.id, { subscription: { extend_days: Number(days) } }, t('toast.extended', { n: days })).catch(() => undefined)}
                    >
                      {t('pd.extend_btn')}
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <Select label={t('pd.change_plan')} value={plan || s.plan} onChange={(e) => setPlan(e.target.value as Plan)} className="min-w-48">
                      {(['free', 'family_monthly', 'family_yearly'] as const).map((x) => (
                        <option key={x} value={x}>
                          {t(`plan.${x}`)}
                        </option>
                      ))}
                    </Select>
                    <Button
                      disabled={!plan || plan === s.plan}
                      onClick={() => actions.patch(p.id, { subscription: { plan } }, t('toast.plan')).then(() => setPlan('')).catch(() => undefined)}
                    >
                      {t('common.apply')}
                    </Button>
                  </div>
                </Card>

                <Card title={t('pd.children')} className="lg:col-span-2">
                  {p.children?.length ? (
                    <ul className="divide-y divide-line">
                      {p.children.map((c) => (
                        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                          <Link href={`/children/${c.id}`} className="font-semibold text-brand hover:underline">
                            {c.display_name}
                          </Link>
                          <span className="text-muted">
                            {t('col.grade')} {c.grade} - {t('col.last_seen')}: {fmtDate(c.last_seen_at, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Empty text={t('pd.no_children')} />
                  )}
                </Card>

                <Card title={t('pd.notifications')} className="lg:col-span-2">
                  <DataState q={notes} isEmpty={(d) => !d.items.some((n) => n.parent_id === p.id)} emptyText={t('pd.no_notifications')} skeleton={<Skeleton className="h-16" />}>
                    {(d) => (
                      <ul className="divide-y divide-line">
                        {d.items
                          .filter((n) => n.parent_id === p.id)
                          .map((n) => (
                            <li key={n.id} className="py-2.5 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge>{t(`nk.${n.kind}` as Key)}</Badge>
                                <span className="font-semibold">{n.title}</span>
                                <span className="ml-auto text-xs text-muted">{fmtDate(n.created_at, locale)}</span>
                              </div>
                              <p className="mt-1 text-muted">{n.body}</p>
                            </li>
                          ))}
                      </ul>
                    )}
                  </DataState>
                </Card>

                <Card title={t('pd.danger')} className="border-danger/40 lg:col-span-2">
                  <p className="mb-3 text-sm text-muted">{t('pd.delete_body')}</p>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setConfirm({
                        title: t('pd.delete_title', { name: p.name }),
                        body: t('pd.delete_body'),
                        confirmLabel: t('pd.delete'),
                        danger: true,
                        typed: p.email,
                        run: async () => {
                          await act(() => api(`parents/${p.id}`, { method: 'DELETE' }), t('toast.deleted'));
                          router.replace('/parents');
                        },
                      })
                    }
                  >
                    {t('pd.delete')}
                  </Button>
                </Card>
              </div>
            </>
          );
        }}
      </DataState>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
