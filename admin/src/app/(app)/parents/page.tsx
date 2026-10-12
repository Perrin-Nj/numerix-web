'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, qs } from '@/lib/api';
import { useAct, useApi, useParentActions } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useFilters, useUI } from '@/lib/store';
import type { Page, Parent } from '@/lib/types';
import { Button, ConfirmDialog, DataState, PageTitle, Select, fmtDay, type ConfirmSpec } from '@/components/ui';
import { AccountBadge, Filters, Pager, SearchBox, SubBadge, TableWrap, Td, Th } from '@/components/parts';

const SIZE = 15;

export default function ParentsPage() {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const { parents: f, setParents, selected, toggle, clearSel } = useFilters();
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const act = useAct();
  const actions = useParentActions(setConfirm);
  const q = useApi<Page<Parent>>(`parents${qs({ q: f.q, status: f.status, subscription: f.sub, plan: f.plan, page: f.page, page_size: SIZE })}`);

  const bulk = (status: 'active' | 'unpaid') =>
    setConfirm({
      title: t(status === 'active' ? 'bulk.paid.title' : 'bulk.unpaid.title', { n: selected.length }),
      confirmLabel: t(status === 'active' ? 'act.paid' : 'act.unpaid'),
      danger: status === 'unpaid',
      run: async () => {
        await act(
          () => Promise.all(selected.map((id) => api(`parents/${id}`, { method: 'PATCH', body: { subscription: { status, ...(status === 'active' ? { plan: 'family_monthly' } : {}) } } }))),
          t('toast.bulk', { n: selected.length }),
        );
        clearSel();
      },
    });

  return (
    <>
      <PageTitle title={t('nav.parents')} sub={t('parents.sub')} />
      <Filters>
        <SearchBox value={f.q} onChange={(v) => setParents({ q: v })} label={t('common.search')} />
        <Select label={t('f.account')} value={f.status} onChange={(e) => setParents({ status: e.target.value })}>
          <option value="all">{t('common.all')}</option>
          <option value="active">{t('acct.active')}</option>
          <option value="blocked">{t('acct.blocked')}</option>
        </Select>
        <Select label={t('f.subscription')} value={f.sub} onChange={(e) => setParents({ sub: e.target.value })}>
          <option value="all">{t('common.all')}</option>
          {(['active', 'trial', 'unpaid', 'expired', 'canceled'] as const).map((s) => (
            <option key={s} value={s}>
              {t(`sub.${s}`)}
            </option>
          ))}
        </Select>
        <Select label={t('f.plan')} value={f.plan} onChange={(e) => setParents({ plan: e.target.value })}>
          <option value="all">{t('common.all')}</option>
          {(['free', 'family_monthly', 'family_yearly'] as const).map((s) => (
            <option key={s} value={s}>
              {t(`plan.${s}`)}
            </option>
          ))}
        </Select>
      </Filters>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm">
          <span className="font-semibold">{t('bulk.selected', { n: selected.length })}</span>
          <Button small variant="primary" onClick={() => bulk('active')}>
            {t('act.paid')}
          </Button>
          <Button small onClick={() => bulk('unpaid')}>
            {t('act.unpaid')}
          </Button>
          <Button small variant="ghost" onClick={clearSel}>
            {t('common.clear')}
          </Button>
        </div>
      )}
      <DataState q={q} isEmpty={(d) => !d.items?.length} emptyText={t('parents.empty')}>
        {(d) => (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th />
                  <Th>{t('col.parent')}</Th>
                  <Th>{t('f.account')}</Th>
                  <Th>{t('f.subscription')}</Th>
                  <Th>{t('f.plan')}</Th>
                  <Th>{t('col.kids')}</Th>
                  <Th>{t('col.created')}</Th>
                  <Th>{t('col.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {/* the platform has no plan filter yet: applied to the current page */}
                {d.items.filter((p) => f.plan === 'all' || p.subscription.plan === f.plan).map((p) => (
                  <tr key={p.id} className="hover:bg-sunken/60">
                    <Td>
                      <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} aria-label={p.name} />
                    </Td>
                    <Td>
                      <Link href={`/parents/${p.id}`} className="font-semibold text-brand hover:underline">
                        {p.name}
                      </Link>
                      <div className="text-xs text-muted">{p.email}</div>
                    </Td>
                    <Td>
                      <AccountBadge status={p.status} />
                    </Td>
                    <Td>
                      <SubBadge status={p.subscription.status} />
                    </Td>
                    <Td>{t(`plan.${p.subscription.plan}`)}</Td>
                    <Td>{p.children_count}</Td>
                    <Td>{fmtDay(p.created_at, locale)}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {p.subscription.status === 'active' ? (
                          <Button small onClick={() => actions.unpaid(p)}>
                            {t('act.unpaid')}
                          </Button>
                        ) : (
                          <Button small variant="soft" onClick={() => actions.paid(p)}>
                            {t('act.paid')}
                          </Button>
                        )}
                        {p.status === 'blocked' ? (
                          <Button small onClick={() => actions.unblock(p)}>
                            {t('act.unblock')}
                          </Button>
                        ) : (
                          <Button small onClick={() => actions.block(p)}>
                            {t('act.block')}
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pager page={d.page ?? f.page} total={d.total ?? d.items.length} size={d.page_size ?? SIZE} onPage={(page) => setParents({ page })} />
          </>
        )}
      </DataState>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
