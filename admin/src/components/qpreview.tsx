'use client';
// Simple, faithful preview of the child screen: story, picture, visual, prompt, answer widget, hint, then the explanation.
// Not the real game components (the admin app does not import the web app); same order of information and the same wording rules.
import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { Button, cx } from './ui';
import { thumbById, type Question } from '@/lib/qtypes';

type L = 'fr' | 'en';
type Rec = Record<string, unknown>;
const tx = (v: unknown, l: L): string => (v && typeof v === 'object' ? ((v as Rec)[l] as string) || ((v as Rec)[l === 'fr' ? 'en' : 'fr'] as string) || '' : v == null ? '' : String(v));
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);
const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function Visual({ v, l }: { v: NonNullable<Question['visual']>; l: L }) {
  const d = (v.data ?? {}) as Rec;
  const title = tx(d.title, l);
  const box = 'rounded-2xl bg-sunken p-3';
  if (v.kind === 'bars') {
    const bars = arr(d.bars);
    const max = n(d.max, Math.max(1, ...bars.map((b) => n(b.value))));
    return (
      <figure className={box}>
        {title && <figcaption className="mb-2 text-center text-sm font-semibold">{title}</figcaption>}
        <div className="flex h-32 items-end justify-around gap-2" role="img" aria-label={bars.map((b) => `${tx(b.label, l)} ${n(b.value)}`).join(', ')}>
          {bars.map((b, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end text-xs">
              <div className="w-full max-w-10 rounded-t-lg bg-brand" style={{ height: `${(n(b.value) / max) * 100}%` }} />
              <span className="mt-1 truncate">{tx(b.label, l)}</span>
            </div>
          ))}
        </div>
      </figure>
    );
  }
  if (v.kind === 'pictograph') {
    return (
      <figure className={box}>
        {title && <figcaption className="mb-2 text-center text-sm font-semibold">{title}</figcaption>}
        {arr(d.rows).map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-24 truncate">{tx(r.label, l)}</span>
            <span aria-hidden>{'●'.repeat(Math.min(30, n(r.count)))}</span>
          </div>
        ))}
        <p className="mt-1 text-xs text-muted">= {n(d.each, 1)}</p>
      </figure>
    );
  }
  if (v.kind === 'clock') {
    const h = n(d.hour, 12) % 12;
    const m = n(d.minute);
    const pt = (deg: number, len: number) => `${50 + len * Math.sin((deg * Math.PI) / 180)},${50 - len * Math.cos((deg * Math.PI) / 180)}`;
    return (
      <svg viewBox="0 0 100 100" className="mx-auto size-32" role="img" aria-label={`${h || 12}:${String(m).padStart(2, '0')}`}>
        <circle cx="50" cy="50" r="46" fill="var(--elevated)" stroke="var(--fg)" strokeWidth="3" />
        {Array.from({ length: 12 }, (_, i) => (
          <text key={i} x={50 + 37 * Math.sin((i * Math.PI) / 6)} y={54 - 37 * Math.cos((i * Math.PI) / 6)} fontSize="9" textAnchor="middle" fill="var(--fg)">
            {i || 12}
          </text>
        ))}
        <polyline points={`50,50 ${pt(h * 30 + m / 2, 22)}`} stroke="var(--fg)" strokeWidth="4" strokeLinecap="round" />
        <polyline points={`50,50 ${pt(m * 6, 34)}`} stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (v.kind === 'numberline') {
    const min = n(d.min);
    const max = n(d.max, 10);
    const x = (k: number) => 10 + ((k - min) / Math.max(1, max - min)) * 180;
    const step = n(d.step, 1) || 1;
    const ticks = Array.from({ length: Math.min(40, Math.floor((max - min) / step) + 1) }, (_, i) => min + i * step);
    return (
      <svg viewBox="0 0 200 50" className="w-full" role="img" aria-label={`${min} - ${max}`}>
        <line x1="10" x2="190" y1="25" y2="25" stroke="var(--fg)" strokeWidth="2" />
        {ticks.map((k) => (
          <g key={k}>
            <line x1={x(k)} x2={x(k)} y1="20" y2="30" stroke="var(--fg)" />
            <text x={x(k)} y="44" fontSize="8" textAnchor="middle" fill="var(--fg)">
              {k}
            </text>
          </g>
        ))}
        {typeof d.arrow === 'number' && <path d={`M${x(d.arrow)} 8 l-4 -6 h8 z`} fill="var(--brand)" />}
      </svg>
    );
  }
  if (v.kind === 'grid') {
    const cols = n(d.cols, 4);
    const rows = n(d.rows, 4);
    return (
      <div className="mx-auto grid w-fit gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 2rem)` }} role="img" aria-label={`${cols} x ${rows}`}>
        {Array.from({ length: cols * rows }, (_, i) => {
          const cell = arr(d.cells).find((c) => n(c.x) === i % cols && n(c.y) === Math.floor(i / cols));
          return (
            <div key={i} className={cx('grid size-8 place-items-center rounded text-xs', cell ? 'bg-brand text-brand-fg' : 'bg-sunken')}>
              {cell ? tx(cell.label, l) : ''}
            </div>
          );
        })}
      </div>
    );
  }
  if (v.kind === 'fraction') {
    const parts = Math.max(1, n(d.parts, 4));
    return (
      <div className="mx-auto flex w-48 overflow-hidden rounded-xl border-2 border-fg" role="img" aria-label={`${n(d.filled)}/${parts}`}>
        {Array.from({ length: parts }, (_, i) => (
          <div key={i} className={cx('h-10 flex-1 border-r border-fg last:border-r-0', i < n(d.filled) ? 'bg-brand' : 'bg-elevated')} />
        ))}
      </div>
    );
  }
  if (v.kind === 'dice') {
    return (
      <div className="flex justify-center gap-3" role="img" aria-label={(d.dice as number[] | undefined)?.join(', ')}>
        {((d.dice as number[]) ?? []).map((k, i) => (
          <span key={i} className="grid size-12 place-items-center rounded-xl border-2 border-fg bg-elevated text-xl font-bold">
            {k}
          </span>
        ))}
      </div>
    );
  }
  return <pre className="overflow-auto rounded-xl bg-sunken p-2 text-xs">{JSON.stringify(v, null, 1)}</pre>;
}

export function ChildPreview({ q, lang, onLang }: { q: Question; lang: L; onLang: (l: L) => void }) {
  const t = useT();
  const [hint, setHint] = useState(false);
  const [done, setDone] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const l = lang;
  const items = q.items;
  const scene = q.media.find((m) => m.role === 'scene' && m.asset);
  const btn = 'min-h-12 rounded-2xl border-2 border-line bg-elevated px-4 py-2 text-left text-lg font-semibold shadow-[0_3px_0_0_var(--ledge)]';
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div role="group" aria-label={t('q.preview_lang')} className="flex gap-1">
          {(['fr', 'en'] as const).map((x) => (
            <Button key={x} small variant={x === l ? 'soft' : 'ghost'} aria-pressed={x === l} onClick={() => onLang(x)}>
              {x === 'fr' ? 'fr-CA' : 'en-CA'}
            </Button>
          ))}
        </div>
        <Button small onClick={() => (setHint(false), setDone(false), setPick(null))}>
          {t('q.preview_reset')}
        </Button>
      </div>
      <article lang={l === 'fr' ? 'fr-CA' : 'en-CA'} className="space-y-3 rounded-3xl border-2 border-brand/30 bg-bg p-4" aria-label={t('q.preview')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {scene?.asset && <img src={thumbById(scene.asset)} alt="" className="h-36 w-full rounded-2xl object-cover" />}
        {q.media.some((m) => m.role === 'scene' && !m.asset) && <div className="grid h-24 place-items-center rounded-2xl bg-gradient-to-br from-brand-soft to-sunken text-xs text-muted">{t('q.preview_criteria')}</div>}
        {tx(q.story, l) && <p className="text-base">{tx(q.story, l)}</p>}
        {q.math_text && <p className="text-center font-display text-3xl font-bold">{q.math_text}</p>}
        {q.visual && <Visual v={q.visual} l={l} />}
        <h3 className="font-display text-xl font-bold">{tx(q.prompt, l) || <span className="text-muted">{t('q.preview_empty')}</span>}</h3>

        {q.answer.kind === 'choice' && (
          <div className="grid gap-2">
            {(q.choices ?? []).map((c) => (
              <button key={c.id} type="button" onClick={() => (setPick(c.id), setDone(true))} className={cx(btn, pick === c.id && 'border-brand bg-brand-soft')}>
                {tx(c.text, l) || '...'}
              </button>
            ))}
          </div>
        )}
        {q.answer.kind === 'truefalse' && (
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" className={cx(btn, 'text-center')} onClick={() => (setPick(String(v)), setDone(true))}>
                {v ? t('q.true') : t('q.false')}
              </button>
            ))}
          </div>
        )}
        {(q.answer.kind === 'numeric' || q.answer.kind === 'range') && (
          <div className="flex gap-2">
            <input aria-label={t('q.preview_answer')} inputMode="decimal" className="min-h-12 w-32 rounded-2xl border-2 border-line bg-elevated px-3 text-center text-xl" onKeyDown={(e) => e.key === 'Enter' && setDone(true)} />
            <Button variant="primary" onClick={() => setDone(true)}>
              {t('q.preview_check')}
            </Button>
          </div>
        )}
        {q.answer.kind === 'order' && (
          <ol className="grid gap-2">
            {((items as { id: string; text: unknown }[]) ?? []).map((i) => (
              <li key={i.id} className={btn}>
                {tx(i.text, l) || '...'}
              </li>
            ))}
          </ol>
        )}
        {q.answer.kind === 'match' && (
          <div className="grid grid-cols-2 gap-2">
            {(['left', 'right'] as const).map((s) => (
              <div key={s} className="grid gap-2">
                {((items as unknown as Record<string, { id: string; text: unknown }[]>)?.[s] ?? []).map((i) => (
                  <div key={i.id} className={btn}>
                    {tx(i.text, l) || '...'}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button small onClick={() => setHint(!hint)} aria-expanded={hint}>
            {t('q.preview_hint')}
          </Button>
          {(q.answer.kind === 'order' || q.answer.kind === 'match') && (
            <Button small onClick={() => setDone(true)}>
              {t('q.preview_check')}
            </Button>
          )}
        </div>
        {hint && <p className="rounded-xl bg-info-soft p-3 text-sm text-info">{tx(q.hint, l)}</p>}
        {done && <p className="rounded-xl bg-success-soft p-3 text-sm text-success">{tx(q.explain, l)}</p>}
      </article>
    </div>
  );
}
