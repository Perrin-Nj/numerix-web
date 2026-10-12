'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Skeleton } from '@/ui/skeleton';

export type VirtualFeedProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T) => string;
  /** Estimated item height in px. Real heights are measured. */
  estimateSize: number;
  hasMore: boolean;
  loadMore: () => void;
  loading?: boolean;
  ariaLabel: string;
  /** Items with the same label are grouped under one sticky header. Items must already be ordered by group. */
  groupBy?: (item: T) => string;
  /** Replaces the default empty message. */
  emptySlot?: ReactNode;
  /** True when the last load failed. */
  error?: boolean;
  /** Replaces the default error message. */
  errorSlot?: ReactNode;
  onRetry?: () => void;
  className?: string;
};

type Row<T> = { kind: 'header'; key: string; label: string } | { kind: 'item'; key: string; item: T; index: number };

const HEADER_SIZE = 44;
const PRELOAD_ROWS = 4;

export function VirtualFeed<T>({
  items,
  renderItem,
  getKey,
  estimateSize,
  hasMore,
  loadMore,
  loading,
  ariaLabel,
  groupBy,
  emptySlot,
  error,
  errorSlot,
  onRetry,
  className,
}: VirtualFeedProps<T>) {
  const t = useTranslations('ui.virtualFeed');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focusRow, setFocusRow] = useState(0);

  const rows = useMemo(() => {
    const out: Row<T>[] = [];
    let last: string | null = null;
    items.forEach((item, index) => {
      const label = groupBy?.(item);
      if (label !== undefined && label !== last) {
        out.push({ kind: 'header', key: `header:${label}`, label });
        last = label;
      }
      out.push({ kind: 'item', key: getKey(item), item, index });
    });
    return out;
  }, [items, groupBy, getKey]);

  const headerIndexes = useMemo(() => rows.flatMap((r, i) => (r.kind === 'header' ? [i] : [])), [rows]);
  const activeHeader = useRef(-1);

  // TanStack Virtual is not memoizable by the React Compiler; the component opts out on its own.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (rows[i]?.kind === 'header' ? HEADER_SIZE : estimateSize),
    getItemKey: (i) => rows[i]?.key ?? i,
    overscan: 4,
    rangeExtractor: useCallback(
      (range: Range) => {
        activeHeader.current = [...headerIndexes].reverse().find((i) => range.startIndex >= i) ?? -1;
        const base = defaultRangeExtractor(range);
        return activeHeader.current >= 0 && !base.includes(activeHeader.current)
          ? [activeHeader.current, ...base]
          : base;
      },
      [headerIndexes],
    ),
  });

  const virtualItems = virtualizer.getVirtualItems();
  const lastVisible = virtualItems.length ? virtualItems[virtualItems.length - 1].index : -1;

  useEffect(() => {
    if (hasMore && !loading && !error && rows.length > 0 && lastVisible >= rows.length - 1 - PRELOAD_ROWS) loadMore();
  }, [hasMore, loading, error, rows.length, lastVisible, loadMore]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const dir = e.key === 'ArrowDown' || e.key === 'PageDown' ? 1 : e.key === 'ArrowUp' || e.key === 'PageUp' ? -1 : 0;
    if (!dir || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    const holder = (e.target as HTMLElement).closest<HTMLElement>('[data-row]');
    const from = holder ? Number(holder.dataset.row) : focusRow;
    let next = from + dir;
    while (next >= 0 && next < rows.length && rows[next].kind === 'header') next += dir;
    if (next < 0 || next >= rows.length) return;
    e.preventDefault();
    setFocusRow(next);
    virtualizer.scrollToIndex(next, { align: 'auto' });
    requestAnimationFrame(() => scrollRef.current?.querySelector<HTMLElement>(`[data-row="${next}"]`)?.focus());
  }

  const showInitialLoading = loading && items.length === 0;
  const showEmpty = !loading && !error && items.length === 0;
  const showInitialError = error && items.length === 0;

  return (
    <div
      ref={scrollRef}
      role="feed"
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      onKeyDown={onKeyDown}
      className={cn('relative h-[70dvh] overflow-y-auto overscroll-contain', className)}
    >
      {showInitialLoading && (
        <div role="status" className="flex flex-col gap-3 p-2">
          <span className="sr-only">{t('loading')}</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} shape="block" height={estimateSize} className="w-full" />
          ))}
        </div>
      )}

      {showEmpty && (
        <div role="status" className="flex flex-col items-center gap-3 p-8 text-center text-muted">
          {emptySlot ?? (
            <>
              <Icon name="book" size={40} />
              <p className="font-display text-lg text-fg">{t('emptyTitle')}</p>
              <p>{t('emptyHint')}</p>
            </>
          )}
        </div>
      )}

      {showInitialError && <ErrorBlock slot={errorSlot} onRetry={onRetry} />}

      {rows.length > 0 && (
        <div style={{ height: virtualizer.getTotalSize() }} className="relative w-full">
          {virtualItems.map((v) => {
            const row = rows[v.index];
            if (!row) return null;
            const sticky = row.kind === 'header' && v.index === activeHeader.current;
            const style = sticky
              ? { position: 'sticky' as const, top: 0, zIndex: 2 }
              : { position: 'absolute' as const, top: 0, left: 0, transform: `translateY(${v.start}px)` };
            return row.kind === 'header' ? (
              <div
                key={v.key}
                ref={virtualizer.measureElement}
                data-index={v.index}
                role="presentation"
                style={style}
                className="w-full border-b-2 border-line bg-bg px-2 py-2 font-display text-lg font-semibold text-fg"
              >
                <h3>{row.label}</h3>
              </div>
            ) : (
              <div
                key={v.key}
                ref={virtualizer.measureElement}
                data-index={v.index}
                data-row={v.index}
                role="article"
                aria-posinset={row.index + 1}
                aria-setsize={hasMore ? -1 : items.length}
                tabIndex={v.index === focusRow ? 0 : -1}
                onFocus={() => setFocusRow(v.index)}
                style={style}
                className="w-full rounded-md px-2 py-1"
              >
                {renderItem(row.item, row.index)}
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && loading && (
        <div role="status" className="flex flex-col gap-3 p-2">
          <span className="sr-only">{t('loadingMore')}</span>
          <Skeleton shape="block" height={estimateSize} className="w-full" />
        </div>
      )}
      {items.length > 0 && error && <ErrorBlock slot={errorSlot} onRetry={onRetry} />}
      {items.length > 0 && !hasMore && !loading && !error && (
        <p className="p-4 text-center text-muted">{t('end')}</p>
      )}
    </div>
  );
}

function ErrorBlock({ slot, onRetry }: { slot?: ReactNode; onRetry?: () => void }) {
  const t = useTranslations('ui.virtualFeed');
  return (
    <div role="alert" className="flex flex-col items-center gap-3 p-6 text-center">
      {slot ?? (
        <>
          <Icon name="alert" size={32} className="text-danger" />
          <p className="font-display text-lg text-fg">{t('errorTitle')}</p>
          <p className="text-muted">{t('errorHint')}</p>
        </>
      )}
      {onRetry && (
        <Button variant="secondary" iconLeft={<Icon name="refresh" />} onClick={onRetry}>
          {t('retry')}
        </Button>
      )}
    </div>
  );
}
