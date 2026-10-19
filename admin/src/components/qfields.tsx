'use client';
import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import { cx, type Tone } from './ui';

export const statusTone: Record<string, Tone> = { draft: 'neutral', review: 'warn', published: 'ok', retired: 'bad' };
import misc from '@/lib/misconceptions.json';
import type { Issue, Loc } from '@/lib/qtypes';

export const fieldCls = 'w-full min-h-11 rounded-xl border-2 border-line bg-elevated px-3 text-sm text-fg placeholder:text-muted focus:border-brand';

/** Issues whose field is `field` or sits under it. */
export const issuesFor = (issues: Issue[], field: string) => issues.filter((i) => i.field === field || i.field.startsWith(`${field}.`) || i.field.startsWith(`${field}#`));

export function IssueLines({ issues, id }: { issues: Issue[]; id?: string }) {
  const t = useT();
  if (!issues.length) return null;
  return (
    <ul id={id} className="mt-1 space-y-0.5 text-xs">
      {issues.map((i, k) => (
        <li key={k} className={i.warning ? 'text-warning' : 'text-danger'}>
          <span className="font-semibold">{i.warning ? t('q.warning') : t('q.error')} </span>
          {i.message}
        </li>
      ))}
    </ul>
  );
}

export function Area({ label, hint, issues, className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode; issues?: Issue[] }) {
  const id = useId();
  const bad = issues?.some((i) => !i.warning);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 flex justify-between gap-2 text-sm font-medium text-muted">
        <span>{label}</span>
        {hint && <span className="text-xs font-normal">{hint}</span>}
      </label>
      <textarea id={id} rows={2} {...p} aria-invalid={bad || undefined} aria-describedby={issues?.length ? `${id}-i` : undefined} className={cx(fieldCls, 'py-2', bad && 'border-danger')} />
      <IssueLines issues={issues ?? []} id={`${id}-i`} />
    </div>
  );
}

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** fr-CA and en-CA side by side for one {fr,en} field. */
export function LocPair({ label, value, onChange, issues = [], field, rows = 2 }: { label: string; value: Loc; onChange: (v: Loc) => void; issues?: Issue[]; field: string; rows?: number }) {
  const t = useT();
  return (
    <fieldset className="mb-3">
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['fr', 'en'] as const).map((l) => (
          <Area
            key={l}
            rows={rows}
            label={l === 'fr' ? 'fr-CA' : 'en-CA'}
            hint={t('q.words', { n: wc(value[l] ?? '') })}
            value={value[l] ?? ''}
            lang={l === 'fr' ? 'fr-CA' : 'en-CA'}
            onChange={(e) => onChange({ ...value, [l]: e.target.value })}
            issues={issuesFor(issues, `${field}.${l}`)}
          />
        ))}
      </div>
    </fieldset>
  );
}

interface Mis {
  code: string;
  s: string;
  f: string;
  e: string;
}
export const MISCONCEPTIONS = misc as Mis[];

/** Misconception code picker: codes of the question's skill first, then the generic ones. */
export function MisSelect({ value, onChange, skill, label, className }: { value?: string; onChange: (v: string) => void; skill: string; label: string; className?: string }) {
  const id = useId();
  const t = useT();
  const locale = useUI((s) => s.locale);
  const d = (m: Mis) => `${m.code}: ${locale === 'fr' ? m.f : m.e}`;
  const own = MISCONCEPTIONS.filter((m) => m.s === skill);
  const rest = MISCONCEPTIONS.filter((m) => m.s !== skill);
  const known = !value || MISCONCEPTIONS.some((m) => m.code === value);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-muted">
        {label}
      </label>
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={fieldCls}>
        <option value="">{t('q.pick_code')}</option>
        {!known && <option value={value}>{value}</option>}
        {own.length > 0 && (
          <optgroup label={t('q.codes_skill', { skill })}>
            {own.map((m) => (
              <option key={m.code} value={m.code}>
                {d(m)}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label={t('q.codes_other')}>
          {rest.map((m) => (
            <option key={m.code} value={m.code}>
              {d(m)}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
