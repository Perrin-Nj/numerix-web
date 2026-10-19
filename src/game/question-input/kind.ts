import type { AnswerValue, Outcome, Question } from '@/data/api/types';

export type InputPhase = 'question' | 'answering' | 'outcome';

export type InputProps = {
  question: Question;
  phase: InputPhase;
  chosen: AnswerValue | null;
  outcome: Outcome | null;
  onSubmit: (value: AnswerValue) => void;
};

export type InputKind = 'choice' | 'keypad' | 'truefalse' | 'order' | 'match' | 'estimate';

/** Reads min, max and step from a number-line visual, the only place an estimate question states its range. */
export function estimateRange(q: Question): { min: number; max: number; step: number } | null {
  const d = q.visual?.kind === 'numberline' ? (q.visual.data as Record<string, unknown> | undefined) : undefined;
  if (!d || typeof d.min !== 'number' || typeof d.max !== 'number' || d.max <= d.min) return null;
  const span = d.max - d.min;
  const step = typeof d.step === 'number' && d.step > 0 ? d.step : span / 100;
  return { min: d.min, max: d.max, step };
}

/**
 * Which input a question needs. Cards win whenever the server sent choices (generated questions always do);
 * an unknown kind without choices is a numeric entry, as the contract says.
 */
export function inputKind(q: Question): InputKind {
  if (q.kind === 'truefalse') return 'truefalse';
  if (q.kind === 'order' && (q.items?.cards?.length ?? 0) > 1) return 'order';
  if (q.kind === 'match' && (q.items?.left?.length ?? 0) > 0 && (q.items?.right?.length ?? 0) > 0) return 'match';
  if (q.choices.length > 0) return 'choice';
  if (q.kind === 'estimate' && estimateRange(q)) return 'estimate';
  return 'keypad';
}

/** True when the statement asks for a quotient and a remainder. */
export function wantsRemainder(q: Question): boolean {
  return /\b(avec reste|with remainder|remainder|reste)\b/i.test(`${q.math_text} ${q.prompt ?? ''}`);
}

/** Style of the submit row, shared by every input that needs a "Check" button. */
export const SUBMIT_ROW = 'flex items-center justify-end gap-2';
