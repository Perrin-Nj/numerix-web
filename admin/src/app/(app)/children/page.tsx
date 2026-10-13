'use client';
import Link from 'next/link';
import { qs } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useFilters, useUI } from '@/lib/store';
import type { Child, Page } from '@/lib/types';
import { DataState, PageTitle, Select, fmtDate } from '@/components/ui';
import { Filters, Pager, SearchBox, TableWrap, Td, Th } from '@/components/parts';

const SIZE = 15;

export default function ChildrenPage() {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const { children: f, setChildren } = useFilters();
  const q = useApi<Page<Child>>(`children${qs({ q: f.q, page: f.page, page_size: SIZE })}`);
  return (
    <>
      <PageTitle title={t('nav.children')} sub={t('children.sub')} />
      <Filters>
        <SearchBox value={f.q} onChange={(v) => setChildren({ q: v })} label={t('common.search')} />
        <Select label={t('col.grade')} value={f.grade} onChange={(e) => setChildren({ grade: e.target.value })}>
          <option value="all">{t('common.all')}</option>
          {[1, 2, 3, 4, 5, 6].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Select label={t('f.activity')} value={f.status} onChange={(e) => setChildren({ status: e.target.value })}>
          <option value="all">{t('common.all')}</option>
          <option value="today">{t('f.active_today')}</option>
          <option value="idle">{t('f.idle')}</option>
        </Select>
      </Filters>
      <DataState q={q} isEmpty={(d) => !d.items?.length} emptyText={t('children.empty')}>
        {(d) => (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t('col.child')}</Th>
                  <Th>{t('col.parent')}</Th>
                  <Th>{t('col.grade')}</Th>
                  <Th>{t('col.last_seen')}</Th>
                  <Th>{t('col.minutes_today')}</Th>
                  <Th>{t('col.cards')}</Th>
                  <Th>{t('col.skills')}</Th>
                </tr>
              </thead>
              <tbody>
                {/* the platform filters only by parent and name: grade and activity apply to the current page */}
                {d.items
                  .filter((c) => (f.grade === 'all' || String(c.grade) === f.grade) && (f.status === 'all' || (f.status === 'today') === c.minutes_today > 0))
                  .map((c) => (
                  <tr key={c.id} className="hover:bg-sunken/60">
                    <Td>
                      <Link href={`/children/${c.id}`} className="font-semibold text-brand hover:underline">
                        {c.display_name}
                      </Link>
                    </Td>
                    <Td>
                      <Link href={`/parents/${c.parent_id}`} className="hover:underline">
                        {c.parent_name ?? c.parent_id}
                      </Link>
                    </Td>
                    <Td>{c.grade}</Td>
                    <Td>{fmtDate(c.last_seen_at, locale)}</Td>
                    <Td>{c.minutes_today}</Td>
                    <Td>{c.cards_total}</Td>
                    <Td>{c.skills_mastered}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pager page={d.page ?? f.page} total={d.total ?? d.items.length} size={d.page_size ?? SIZE} onPage={(page) => setChildren({ page })} />
          </>
        )}
      </DataState>
    </>
  );
}
