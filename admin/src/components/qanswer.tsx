'use client';
import { useId, type ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { Badge, Button, Input, Select } from './ui';
import { IssueLines, MisSelect, fieldCls, issuesFor } from './qfields';
import { checkCalc, nextChoiceId, retype, sequenceOf, type CommonError, type Issue, type MatchItems, type OrderItem, type Question } from '@/lib/qtypes';

interface P {
  q: Question;
  set: (fn: (q: Question) => Question) => void;
  issues: Issue[];
}
const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? NaN : Number(s));
const showNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '');

/** Calc input with the live "verified" badge: the same arithmetic the server recomputes. */
export function CalcField({ value, expected, onChange, label, issues }: { value?: string; expected: unknown; onChange: (v: string) => void; label: string; issues?: Issue[] }) {
  const t = useT();
  const c = checkCalc(value, expected);
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-muted">
          {label}
        </label>
        <span role="status">
          {c.state === 'none' && <Badge>{t('q.calc_none')}</Badge>}
          {c.state === 'ok' && <Badge tone="ok">{t('q.calc_ok')}</Badge>}
          {c.state === 'bad' && <Badge tone="bad">{c.reason === 'mismatch' ? t('q.calc_bad', { v: JSON.stringify(c.value) }) : t('q.calc_err', { why: c.reason })}</Badge>}
        </span>
      </div>
      <input id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="6+3" className={`${fieldCls} font-mono`} spellCheck={false} />
      <IssueLines issues={issues ?? []} />
    </div>
  );
}

function Row({ children, onRemove, label }: { children: ReactNode; onRemove?: () => void; label: string }) {
  const t = useT();
  return (
    <div className="mb-2 flex items-start gap-2 rounded-xl border border-line bg-sunken/50 p-2.5">
      <div className="min-w-0 flex-1">{children}</div>
      {onRemove && (
        <Button small onClick={onRemove} aria-label={`${t('q.remove')} ${label}`}>
          {t('q.remove')}
        </Button>
      )}
    </div>
  );
}

function TwoInputs({ label, v, onChange, lang = true }: { label: string; v: { fr: string; en: string }; onChange: (v: { fr: string; en: string }) => void; lang?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Input label={`${label} fr-CA`} value={v.fr} lang={lang ? 'fr-CA' : undefined} onChange={(e) => onChange({ ...v, fr: e.target.value })} />
      <Input label={`${label} en-CA`} value={v.en} lang={lang ? 'en-CA' : undefined} onChange={(e) => onChange({ ...v, en: e.target.value })} />
    </div>
  );
}

function CommonErrors({ q, set, issues }: P) {
  const t = useT();
  const list = q.common_errors ?? [];
  const put = (i: number, e: Partial<CommonError>) => set((x) => ({ ...x, common_errors: list.map((c, k) => (k === i ? { ...c, ...e } : c)) }));
  return (
    <div className="mt-4">
      <h4 className="mb-1 text-sm font-semibold">{t('q.common_errors')}</h4>
      <p className="mb-2 text-xs text-muted">{t('q.common_errors_hint')}</p>
      {list.map((c, i) => (
        <Row key={i} label={`#${i + 1}`} onRemove={() => set((x) => ({ ...x, common_errors: list.filter((_, k) => k !== i) }))}>
          <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
            <Input label={t('q.wrong_value')} inputMode="decimal" value={showNum(c.value)} onChange={(e) => put(i, { value: num(e.target.value) })} />
            <MisSelect label={t('q.misconception')} skill={q.skill} value={c.misconception} onChange={(v) => put(i, { misconception: v })} />
          </div>
          <div className="mt-2">
            <TwoInputs label={t('q.feedback')} v={c.feedback} onChange={(feedback) => put(i, { feedback })} />
          </div>
          <IssueLines issues={issuesFor(issues, `common_errors.${i}`)} />
        </Row>
      ))}
      <Button small onClick={() => set((x) => ({ ...x, common_errors: [...list, { value: NaN, misconception: '', feedback: { fr: '', en: '' } }] }))}>
        {t('q.add_error')}
      </Button>
    </div>
  );
}

function Numeric({ q, set, issues }: P) {
  const t = useT();
  const a = q.answer;
  const pair = Array.isArray(a.value);
  const put = (patch: Partial<Question['answer']>) => set((x) => ({ ...x, answer: { ...x.answer, ...patch } }));
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          {pair ? (
            <div className="grid grid-cols-2 gap-2">
              <Input label={t('q.quotient')} inputMode="numeric" value={showNum((a.value as number[])[0])} onChange={(e) => put({ value: [num(e.target.value), (a.value as number[])[1]] })} />
              <Input label={t('q.remainder')} inputMode="numeric" value={showNum((a.value as number[])[1])} onChange={(e) => put({ value: [(a.value as number[])[0], num(e.target.value)] })} />
            </div>
          ) : (
            <Input label={t('q.answer_value')} inputMode="decimal" value={showNum(a.value)} onChange={(e) => put({ value: num(e.target.value) })} />
          )}
          <label className="mt-1 flex min-h-8 items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={pair} onChange={(e) => put({ value: e.target.checked ? [0, 0] : 0 })} />
            {t('q.divmod')}
          </label>
          <IssueLines issues={issuesFor(issues, 'answer.value')} />
        </div>
        <CalcField label={t('q.calc')} value={a.calc} expected={a.value} onChange={(calc) => put({ calc })} issues={issuesFor(issues, 'answer.calc')} />
      </div>
      <CommonErrors q={q} set={set} issues={issues} />
    </>
  );
}

function Range({ q, set, issues }: P) {
  const t = useT();
  const a = q.answer;
  const put = (patch: Partial<Question['answer']>) => set((x) => ({ ...x, answer: { ...x.answer, ...patch } }));
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label={t('q.min')} inputMode="decimal" value={showNum(a.min)} onChange={(e) => put({ min: num(e.target.value) })} />
        <Input label={t('q.exact')} inputMode="decimal" value={showNum(a.exact_for_check)} onChange={(e) => put({ exact_for_check: num(e.target.value) })} />
        <Input label={t('q.max')} inputMode="decimal" value={showNum(a.max)} onChange={(e) => put({ max: num(e.target.value) })} />
      </div>
      <div className="mt-3">
        <CalcField label={t('q.calc')} value={a.calc} expected={a.exact_for_check} onChange={(calc) => put({ calc })} issues={issuesFor(issues, 'answer.calc')} />
      </div>
      <IssueLines issues={issues.filter((i) => i.field === 'answer')} />
      <CommonErrors q={q} set={set} issues={issues} />
    </>
  );
}

function ChoiceEditor({ q, set, issues }: P) {
  const t = useT();
  const cs = q.choices ?? [];
  const a = q.answer;
  const put = (id: string, patch: Partial<(typeof cs)[number]>) => set((x) => ({ ...x, choices: cs.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  return (
    <>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{t('q.choices')}</legend>
        {cs.map((c) => {
          const correct = a.correct === c.id;
          const own = issuesFor(issues, `choices.${c.id}`);
          return (
            <Row key={c.id} label={c.id} onRemove={cs.length > 3 ? () => set((x) => ({ ...x, choices: cs.filter((k) => k.id !== c.id), answer: { ...x.answer, correct: x.answer.correct === c.id ? cs.find((k) => k.id !== c.id)?.id : x.answer.correct } })) : undefined}>
              <div className="mb-2 flex items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-brand-soft font-bold text-brand" aria-hidden>
                  {c.id}
                </span>
                <label className="flex min-h-9 items-center gap-2 text-sm font-medium">
                  <input type="radio" name="correct" checked={correct} onChange={() => set((x) => ({ ...x, answer: { ...x.answer, correct: c.id } }))} />
                  {t('q.correct')}
                </label>
              </div>
              <TwoInputs label={t('q.option')} v={c.text} onChange={(text) => put(c.id, { text })} />
              {correct ? (
                <div className="mt-2">
                  <CalcField
                    label={t('q.calc_choice')}
                    value={a.calc_choice?.[c.id]}
                    expected={Number(c.text.fr.replace(',', '.'))}
                    onChange={(v) => set((x) => ({ ...x, answer: { ...x.answer, calc_choice: { ...x.answer.calc_choice, [c.id]: v } } }))}
                    issues={issuesFor(issues, 'answer.calc_choice')}
                  />
                </div>
              ) : (
                <div className="mt-2 grid items-end gap-2 sm:grid-cols-[1fr_auto]">
                  <MisSelect label={t('q.misconception')} skill={q.skill} value={c.random ? '' : c.misconception} onChange={(v) => put(c.id, { misconception: v || undefined, random: undefined })} />
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!c.random} onChange={(e) => put(c.id, { random: e.target.checked || undefined, misconception: undefined })} />
                    {t('q.random')}
                  </label>
                </div>
              )}
              <IssueLines issues={own.filter((i) => !i.field.endsWith('.misconception') || !correct)} />
            </Row>
          );
        })}
      </fieldset>
      <Button small disabled={cs.length >= 5} onClick={() => set((x) => ({ ...x, choices: [...cs, { id: nextChoiceId(cs.map((c) => c.id)), text: { fr: '', en: '' } }] }))}>
        {t('q.add_choice')}
      </Button>
      <IssueLines issues={issues.filter((i) => i.field === 'choices' || i.field === 'answer.correct')} />
    </>
  );
}

function TrueFalse({ q, set, issues }: P) {
  const t = useT();
  return (
    <>
      <fieldset className="mb-3 flex gap-5">
        <legend className="mb-1 text-sm font-semibold">{t('q.tf_value')}</legend>
        {[true, false].map((v) => (
          <label key={String(v)} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="radio" name="tf" checked={q.answer.value === v} onChange={() => set((x) => ({ ...x, answer: { ...x.answer, value: v } }))} />
            {v ? t('q.true') : t('q.false')}
          </label>
        ))}
      </fieldset>
      <MisSelect label={t('q.tf_mis')} skill={q.skill} value={q.answer.misconception} onChange={(v) => set((x) => ({ ...x, answer: { ...x.answer, misconception: v || undefined } }))} />
      <IssueLines issues={issuesFor(issues, 'answer')} />
    </>
  );
}

function Order({ q, set, issues }: P) {
  const t = useT();
  const items = (q.items as OrderItem[]) ?? [];
  const by = q.answer.by ?? 'asc';
  // the sequence is derived from the keys, so it can never disagree with them
  const write = (next: OrderItem[], b = by) => set((x) => ({ ...x, items: next, answer: { ...x.answer, by: b, sequence: sequenceOf(next, b) } }));
  return (
    <>
      <Select label={t('q.order_by')} value={by} onChange={(e) => write(items, e.target.value as 'asc' | 'desc')} className="mb-3 max-w-xs">
        <option value="asc">{t('q.asc')}</option>
        <option value="desc">{t('q.desc')}</option>
      </Select>
      {items.map((it, i) => (
        <Row key={it.id} label={it.id} onRemove={items.length > 3 ? () => write(items.filter((_, k) => k !== i)) : undefined}>
          <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
            <TwoInputs label={t('q.item')} v={it.text} onChange={(text) => write(items.map((x, k) => (k === i ? { ...x, text } : x)))} />
            <Input label={t('q.key')} value={it.key} onChange={(e) => write(items.map((x, k) => (k === i ? { ...x, key: e.target.value } : x)))} />
          </div>
          <IssueLines issues={issuesFor(issues, `items.${it.id}`)} />
        </Row>
      ))}
      <Button small disabled={items.length >= 6} onClick={() => write([...items, { id: nextChoiceId(items.map((i) => i.id)), text: { fr: '', en: '' }, key: '' }])}>
        {t('q.add_item')}
      </Button>
      <p className="my-3 text-sm">
        <span className="font-medium text-muted">{t('q.sequence')}: </span>
        <span className="font-mono">{(q.answer.sequence ?? []).join(' , ')}</span>
      </p>
      <MisSelect label={t('q.tf_mis')} skill={q.skill} value={q.answer.misconception} onChange={(v) => set((x) => ({ ...x, answer: { ...x.answer, misconception: v || undefined } }))} />
      <IssueLines issues={issues.filter((i) => i.field === 'items' || i.field.startsWith('answer'))} />
    </>
  );
}

function Match({ q, set, issues }: P) {
  const t = useT();
  const it = (q.items as MatchItems) ?? { left: [], right: [] };
  const pairs = q.answer.pairs ?? [];
  const rightOf = (l: string) => pairs.find((p) => p[0] === l)?.[1] ?? '';
  const write = (n: MatchItems, p = pairs) => set((x) => ({ ...x, items: n, answer: { ...x.answer, pairs: p.filter((pp) => n.left.some((l) => l.id === pp[0]) && n.right.some((r) => r.id === pp[1])) } }));
  const setPair = (l: string, r: string) => set((x) => ({ ...x, answer: { ...x.answer, pairs: [...pairs.filter((p) => p[0] !== l), ...(r ? [[l, r]] : [])] } }));
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {(['left', 'right'] as const).map((side) => (
          <div key={side}>
            <h4 className="mb-1 text-sm font-semibold">{t(side === 'left' ? 'q.left' : 'q.right')}</h4>
            {it[side].map((x, i) => (
              <Row key={x.id} label={x.id} onRemove={it[side].length > 2 ? () => write({ ...it, [side]: it[side].filter((_, k) => k !== i) }) : undefined}>
                <TwoInputs label={x.id} v={x.text} onChange={(text) => write({ ...it, [side]: it[side].map((y, k) => (k === i ? { ...y, text } : y)) })} />
                {side === 'left' && (
                  <Select label={t('q.matches')} value={rightOf(x.id)} onChange={(e) => setPair(x.id, e.target.value)} className="mt-2">
                    <option value="">-</option>
                    {it.right.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id}: {r.text.fr || r.text.en}
                      </option>
                    ))}
                  </Select>
                )}
                <IssueLines issues={issuesFor(issues, `items.${x.id}`)} />
              </Row>
            ))}
            <Button small disabled={it[side].length >= 6} onClick={() => write({ ...it, [side]: [...it[side], { id: `${side[0]}${it[side].length + 1}`, text: { fr: '', en: '' } }] })}>
              {t('q.add_item')}
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <MisSelect label={t('q.tf_mis')} skill={q.skill} value={q.answer.misconception} onChange={(v) => set((x) => ({ ...x, answer: { ...x.answer, misconception: v || undefined } }))} />
      </div>
      <IssueLines issues={issues.filter((i) => i.field.startsWith('answer'))} />
    </>
  );
}

const KINDS: Record<string, string[]> = { numeric: ['numeric'], word: ['numeric', 'choice'], visual: ['numeric', 'choice'], estimate: ['range', 'choice'] };

export function AnswerEditor({ q, set, issues }: P) {
  const t = useT();
  const kinds = KINDS[q.type];
  return (
    <div>
      {kinds && kinds.length > 1 && (
        <Select label={t('q.answer_kind')} value={q.answer.kind} onChange={(e) => set((x) => retype(x, x.type, e.target.value))} className="mb-3 max-w-xs">
          {kinds.map((k) => (
            <option key={k} value={k}>
              {t(`q.kind.${k}` as 'q.kind.numeric')}
            </option>
          ))}
        </Select>
      )}
      {q.answer.kind === 'numeric' && <Numeric q={q} set={set} issues={issues} />}
      {q.answer.kind === 'range' && <Range q={q} set={set} issues={issues} />}
      {q.answer.kind === 'choice' && <ChoiceEditor q={q} set={set} issues={issues} />}
      {q.answer.kind === 'truefalse' && <TrueFalse q={q} set={set} issues={issues} />}
      {q.answer.kind === 'order' && <Order q={q} set={set} issues={issues} />}
      {q.answer.kind === 'match' && <Match q={q} set={set} issues={issues} />}
    </div>
  );
}
