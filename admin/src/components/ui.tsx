'use client';
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UseQueryResult } from '@tanstack/react-query';
import { useUI } from '@/lib/store';
import { useT, type TFn } from '@/lib/i18n';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

type Variant = 'primary' | 'ghost' | 'danger' | 'soft';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg hover:opacity-90',
  soft: 'bg-brand-soft text-brand hover:opacity-80',
  ghost: 'border border-line bg-elevated text-fg hover:bg-sunken',
  danger: 'bg-danger text-white hover:opacity-90',
};
export function Button({ variant = 'ghost', small, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        small ? 'min-h-8 px-3 text-sm' : 'min-h-10 px-4 text-sm',
        variants[variant],
        className,
      )}
    />
  );
}

const tones = {
  neutral: 'bg-sunken text-muted',
  ok: 'bg-success-soft text-success',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  brand: 'bg-brand-soft text-brand',
};
export type Tone = keyof typeof tones;
export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>
);

export const Card = ({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cx('rounded-2xl border border-line bg-elevated p-4 sm:p-5', className)}>
    {(title || action) && (
      <div className="mb-3 flex items-center justify-between gap-3">
        {title && <h2 className="font-display text-lg font-semibold">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

export const PageTitle = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
      {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
    </div>
    {action}
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('skeleton', className ?? 'h-5 w-full')} aria-hidden />;

const field = 'w-full min-h-10 rounded-xl border border-line bg-elevated px-3 text-sm text-fg placeholder:text-muted focus:border-brand';
export function Input({ label, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <input id={id} {...p} className={field} />
    </div>
  );
}
export function Select({ label, className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-muted">
          {label}
        </label>
      )}
      <select id={id} {...p} className={field}>
        {children}
      </select>
    </div>
  );
}
export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-brand' : 'bg-line')}
      >
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

/** Modal on native <dialog>: focus trap, Esc and backdrop close come for free. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-elevated p-0 text-fg"
    >
      {open && (
        <div className="p-5">
          <h2 className="mb-3 font-display text-xl font-semibold">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

export interface ConfirmSpec {
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
  reason?: { label: string; required?: boolean };
  typed?: string;
  run: (reason: string) => Promise<unknown>;
}
function ConfirmBody({ spec, onClose }: { spec: ConfirmSpec; onClose: () => void }) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = (!spec.typed || typed === spec.typed) && (!spec.reason?.required || reason.trim().length > 0);
  async function go() {
    setBusy(true);
    try {
      await spec.run(reason.trim());
      onClose();
    } catch {
      // spec.run (via useAct) already toasted the server message; keep the dialog open to retry
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {spec.body && <p className="mb-3 text-sm text-muted">{spec.body}</p>}
      {spec.reason && <Input label={spec.reason.label} value={reason} onChange={(e) => setReason(e.target.value)} className="mb-3" />}
      {spec.typed && <Input label={t('confirm.type', { word: spec.typed })} value={typed} onChange={(e) => setTyped(e.target.value)} className="mb-3" autoComplete="off" />}
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button variant={spec.danger ? 'danger' : 'primary'} disabled={!ok || busy} onClick={go}>
          {busy ? t('common.working') : spec.confirmLabel}
        </Button>
      </div>
    </>
  );
}
export function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec | null; onClose: () => void }) {
  return (
    <Modal open={!!spec} onClose={onClose} title={spec?.title ?? ''}>
      {spec && <ConfirmBody spec={spec} onClose={onClose} />}
    </Modal>
  );
}

export function Toaster() {
  const { toasts, dismiss } = useUI();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {toasts.map((x) => (
        <button
          key={x.id}
          onClick={() => dismiss(x.id)}
          className={cx(
            'pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-left text-sm font-medium shadow-lg',
            x.kind === 'ok' ? 'border-success bg-success-soft text-success' : 'border-danger bg-danger-soft text-danger',
          )}
        >
          {x.text}
        </button>
      ))}
    </div>
  );
}

export function Fox({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Numerix" className="shrink-0">
      <path d="M8 6l15 12c3-1 15-1 18 0L56 6c3 14 2 26-4 34-4 6-12 12-20 12S16 46 12 40C6 32 5 20 8 6z" fill="#f07e2b" />
      <path d="M12 40c4 6 12 12 20 12s16-6 20-12c-6 3-12 8-20 8s-14-5-20-8z" fill="#fff9f0" />
      <path d="M11 12l8 8-7 6zM53 12l-8 8 7 6z" fill="#5b4bdb" opacity=".25" />
      <circle cx="23" cy="32" r="3" fill="#1f1b2e" />
      <circle cx="41" cy="32" r="3" fill="#1f1b2e" />
      <path d="M29 40h6l-3 4z" fill="#1f1b2e" />
    </svg>
  );
}

export function errText(e: unknown, t: TFn): string {
  const m = (e as Error)?.message ?? '';
  const known: Record<string, Parameters<TFn>[0]> = { network_error: 'err.network', platform_unreachable: 'err.platform', unauthorized: 'err.unauth' };
  return known[m] ? t(known[m]) : m || t('err.title');
}

export function ErrorPanel({ message, onRetry, title }: { message: string; onRetry?: () => void; title?: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-soft p-5">
      <h3 className="font-display text-lg font-semibold text-danger">{title ?? t('err.title')}</h3>
      <p className="mt-1 break-words text-sm">{message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )}
        <Button onClick={() => router.back()}>{t('common.back')}</Button>
        <Link href="/" className="inline-flex min-h-10 items-center rounded-xl border border-line bg-elevated px-4 text-sm font-semibold hover:bg-sunken">
          {t('common.home')}
        </Link>
      </div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
      <Fox size={44} />
      {text}
    </div>
  );
}

function useSlow(loading: boolean, ms = 8000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const id = setTimeout(() => setSlow(true), ms);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [loading, ms]);
  return slow && loading;
}

/** Skeleton while loading, "taking too long" panel after 8 s, error panel with Retry/Back/Home, empty state, else children. Never a stuck spinner. */
export function DataState<T>({
  q,
  isEmpty,
  emptyText,
  skeleton,
  children,
}: {
  q: UseQueryResult<T>;
  isEmpty?: (d: T) => boolean;
  emptyText?: string;
  skeleton?: ReactNode;
  children: (d: T) => ReactNode;
}) {
  const t = useT();
  const slow = useSlow(q.isLoading);
  if (slow) return <ErrorPanel title={t('err.slow')} message={t('err.slow_body')} onRetry={() => q.refetch()} />;
  if (q.isLoading)
    return (
      <div className="space-y-3" aria-busy>
        {skeleton ?? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </>
        )}
      </div>
    );
  if (q.isError) return <ErrorPanel message={errText(q.error, t)} onRetry={() => q.refetch()} />;
  const d = q.data as T;
  if (isEmpty?.(d)) return <Empty text={emptyText ?? t('common.empty')} />;
  return <>{children(d)}</>;
}

const loc = (l: string) => (l === 'fr' ? 'fr-CA' : 'en-CA');
export const fmtDate = (iso: string | undefined, l: string) => (iso ? new Date(iso).toLocaleString(loc(l), { dateStyle: 'medium', timeStyle: 'short' }) : '-');
export const fmtDay = (iso: string | undefined, l: string) => (iso ? new Date(iso).toLocaleDateString(loc(l), { dateStyle: 'medium' }) : '-');
