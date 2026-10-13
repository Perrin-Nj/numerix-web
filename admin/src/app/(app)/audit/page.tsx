'use client';
import { qs } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useFilters, useUI } from '@/lib/store';
import type { AuditEntry, Page } from '@/lib/types';
import { Badge, DataState, Input, PageTitle, fmtDate } from '@/components/ui';
import { Filters, Pager, SearchBox, TableWrap, Td, Th } from '@/components/parts';

const SIZE = 20;

export default function AuditPage() {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const { audit: f, setAudit } = useFilters();
  const q = useApi<Page<AuditEntry>>(`audit${qs({ page: f.page, page_size: SIZE })}`);
  return (
    <>
      <PageTitle title={t('nav.audit')} sub={t('audit.sub')} />
      <Filters>
        <SearchBox value={f.q} onChange={(v) => setAudit({ q: v })} label={t('audit.search')} />
        <Input label={t('audit.action')} value={f.action} onChange={(e) => setAudit({ action: e.target.value })} placeholder="parent.block" className="w-48" />
      </Filters>
      <DataState q={q} isEmpty={(d) => !d.items?.length} emptyText={t('audit.empty')}>
        {(d) => (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t('audit.when')}</Th>
                  <Th>{t('audit.who')}</Th>
                  <Th>{t('audit.what')}</Th>
                  <Th>{t('audit.target')}</Th>
                  <Th>{t('audit.detail')}</Th>
                </tr>
              </thead>
              <tbody>
                {/* the platform has no audit filter yet: applied to the current page */}
                {d.items.filter((e) => (!f.action || e.action.includes(f.action)) && (!f.q || `${e.actor} ${e.target_id} ${e.target_type}`.toLowerCase().includes(f.q.toLowerCase()))).map((e) => (
                  <tr key={e.id}>
                    <Td className="whitespace-nowrap">{fmtDate(e.at, locale)}</Td>
                    <Td>{e.actor}</Td>
                    <Td>
                      <Badge tone="brand">{e.action}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {e.target_type} <span className="text-muted">{e.target_id}</span>
                    </Td>
                    <Td className="max-w-xs break-words text-xs text-muted">{e.detail == null ? '-' : typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pager page={d.page ?? f.page} total={d.total ?? d.items.length} size={d.page_size ?? SIZE} onPage={(page) => setAudit({ page })} />
          </>
        )}
      </DataState>
    </>
  );
}
