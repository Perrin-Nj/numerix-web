import { describe, expect, it } from 'vitest';
import type { AnswerResult, Beat, Session } from '@/data/api/types';
import { initialStoryState, storyReducer, type StoryAction, type StoryState } from './story-machine';

const session = { status: 'active', beats_answered: 1, chapter_length: 5 } as unknown as Session;
const beat = { id: 'b1', question: { math_text: '3 + 4', prompt: 'Combien ?', choices: [6, 7, 8] }, scene: { status: 'ready', text: 'Une histoire.' } } as unknown as Beat;
const withheld = { outcome: 'erreur_typique', attempt: 1, retry_available: true, denouement: { status: 'pending' }, session, rewards: [] } as unknown as AnswerResult;
const full = (o: string, attempt?: 1 | 2): AnswerResult =>
  ({ outcome: o, attempt, correct_answer: 7, explain: '3 + 4 = 7', denouement: { status: 'ready', text: 'Bravo.' }, session, rewards: [] }) as unknown as AnswerResult;

const run = (s: StoryState, ...as: StoryAction[]) => as.reduce(storyReducer, s);
const asked = run(initialStoryState, { type: 'BEAT_LOADED', beat }, { type: 'SHOW_QUESTION' }, { type: 'ANSWER_SENT', beatId: 'b1', value: 6, key: 'k1' });

describe('retry flow', () => {
  it('a withheld first answer opens the retrying phase without a reveal', () => {
    const s = run(asked, { type: 'ANSWER_RETRY_AVAILABLE', beatId: 'b1', result: withheld });
    expect(s).toMatchObject({ phase: 'retrying', attempt: 2, triedValue: 6, chosen: null, outcome: null, correctAnswer: null, pendingAnswer: null });
  });
  it('RETRY_SENT keeps attempt 2 and its own key for a network retry', () => {
    const s = run(asked, { type: 'ANSWER_RETRY_AVAILABLE', beatId: 'b1', result: withheld }, { type: 'RETRY_SENT', beatId: 'b1', value: 7, key: 'k2' }, { type: 'ANSWER_FAILED', beatId: 'b1', code: 'request_failed', message: 'x' });
    expect(s.phase).toBe('answering');
    expect(s.pendingAnswer).toEqual({ value: 7, key: 'k2', attempt: 2 });
  });
  it('the second result is the full reveal and stays attempt 2', () => {
    const s = run(asked, { type: 'ANSWER_RETRY_AVAILABLE', beatId: 'b1', result: withheld }, { type: 'RETRY_SENT', beatId: 'b1', value: 7, key: 'k2' }, { type: 'ANSWER_RESULT', beatId: 'b1', result: full('correct', 2) });
    expect(s).toMatchObject({ phase: 'outcome', attempt: 2, correctAnswer: 7, outcome: 'correct' });
  });
  it('a legacy result without correct_answer does not crash', () => {
    const r = { ...full('correct'), correct_answer: undefined } as unknown as AnswerResult;
    expect(run(asked, { type: 'ANSWER_RESULT', beatId: 'b1', result: r }).correctAnswer).toBeNull();
  });
  it('the retry hint is kept only while retrying', () => {
    expect(run(asked, { type: 'RETRY_HINT', beatId: 'b1', text: 'x' }).retryHint).toBeNull();
    expect(run(asked, { type: 'ANSWER_RETRY_AVAILABLE', beatId: 'b1', result: withheld }, { type: 'RETRY_HINT', beatId: 'b1', text: 'Compte encore.' }).retryHint).toBe('Compte encore.');
  });
  it('a new question resets the attempt, and CONTINUE keeps the last reveal', () => {
    const out = run(asked, { type: 'ANSWER_RESULT', beatId: 'b1', result: full('correct', 1) });
    const next = run(out, { type: 'CONTINUE' }, { type: 'BEAT_LOADED', beat });
    expect(next.attempt).toBe(1);
    expect(next.lastReveal).toMatchObject({ question: 'Combien ?', correctAnswer: 7, explain: '3 + 4 = 7' });
  });
  it('a reload during the second try resumes it', () => {
    const s = run(initialStoryState, { type: 'BEAT_LOADED', beat }, { type: 'RETRY_RESUMED', beatId: 'b1', tried: 6 });
    expect(s).toMatchObject({ phase: 'retrying', attempt: 2, triedValue: 6 });
  });
  it('a late result or hint for another beat is ignored', () => {
    const retrying = run(asked, { type: 'ANSWER_RETRY_AVAILABLE', beatId: 'b1', result: withheld });
    expect(run(retrying, { type: 'RETRY_HINT', beatId: 'old', text: 'x' }).retryHint).toBeNull();
    expect(run(asked, { type: 'ANSWER_RESULT', beatId: 'old', result: full('correct', 1) }).phase).toBe('answering');
    expect(run(asked, { type: 'DEN_DELTA', beatId: 'old', text: 'x' }).denouementText).toBe('');
  });
  it('a verdict does not land outside the answering phase; a second send is ignored', () => {
    const out = run(asked, { type: 'ANSWER_RESULT', beatId: 'b1', result: full('correct', 1) });
    expect(run(out, { type: 'ANSWER_RETRY_AVAILABLE', beatId: 'b1', result: withheld }).phase).toBe('outcome');
    expect(run(asked, { type: 'ANSWER_SENT', beatId: 'b1', value: 8, key: 'k9' }).pendingAnswer?.key).toBe('k1');
  });
  it('CONTINUE on a finished chapter goes to done and keeps the rewards for that screen', () => {
    const done = { ...full('correct', 1), session: { ...session, status: 'completed' }, rewards: [{ kind: 'card' }] } as unknown as AnswerResult;
    const s = run(asked, { type: 'ANSWER_RESULT', beatId: 'b1', result: done }, { type: 'CONTINUE' });
    expect(s.phase).toBe('done');
    expect(s.rewards).toHaveLength(1);
  });
});
