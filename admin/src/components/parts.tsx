'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Button, Input, type Tone } from './ui';
import { useT } from '@/lib/i18n';
import type { Parent, SubStatus } from '@/lib/types';

const subTone: Record<SubStatus, Tone> = { active: 'ok', trial: 'info', unpaid: 'warn', expired: 'bad', canceled: 'neutral' };
export function SubBadge({ status }: { status: SubStatus }) {
  const t = useT();
  return <Badge tone={subTone[status] ?? 'neutral'}>{t(`sub.${status}`)}</Badge>;
}
export function AccountBadge({ status }: { status: Parent['status'] }) {
  const t = useT();
  return <Badge tone={status === 'blocked' ? 'bad' : 'ok'}>{t(`acct.${status}`)}</Badge>;
}

export function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const t = useT();
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted">
      <span>{t('common.total', { n: total })}</span>
      <div className="flex items-center gap-2">
        <Button small disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {t('common.prev')}
        </Button>
        <span>
          {page} / {pages}
        </span>
        <Button small disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Search box that writes to the store after a short pause. */
export function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [text, setText] = useState(value);
  const d = useDebounced(text);
  useEffect(() => {
    if (d !== value) onChange(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);
  return <Input label={label} value={text} onChange={(e) => setText(e.target.value)} placeholder={label} className="min-w-52 flex-1" />;
}

export const TableWrap = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto rounded-2xl border border-line bg-elevated">
    <table className="w-full min-w-[40rem] text-left text-sm">{children}</table>
  </div>
);
export const Th = ({ children }: { children?: ReactNode }) => <th className="whitespace-nowrap border-b border-line bg-sunken px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">{children}</th>;
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={`border-b border-line px-3 py-2.5 align-middle ${className ?? ''}`}>{children}</td>;

export const Filters = ({ children }: { children: ReactNode }) => <div className="mb-4 flex flex-wrap items-end gap-3">{children}</div>;
