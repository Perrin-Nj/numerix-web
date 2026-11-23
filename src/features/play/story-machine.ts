import type { AnswerResult, AnswerValue, Beat, MethodVisual, Outcome, Reward, Session } from '@/data/api/types';

/**
 * The story screen state machine (spec 7.5). Pure reducer so every transition is explicit.
 * Phases: starting, requesting, narrating (scene), question, answering, retrying (one more go), outcome (denouement), rewards, done.
 */
export type Phase =
  | 'starting'
  | 'requesting'
  | 'narrating'
  | 'question'
  | 'answering'
  | 'retrying'
  | 'outcome'
  | 'rewards'
  | 'done'
  | 'error';

export type NarrationStatus = 'pending' | 'streaming' | 'ready' | 'fallback';

/** What the child saw on the last reveal, kept in memory only so they can read it again. */
export type LastReveal = {
  question: string;
  correctAnswer: AnswerValue | null;
  outcome: Outcome | null;
  explain: string | null;
  feedback: string | null;
  text: string;
};

export type StoryState = {
  phase: Phase;
  session: Session | null;
  beat: Beat | null;
  sceneText: string;
  sceneStatus: NarrationStatus;
  sceneSlow: boolean;
  chosen: AnswerValue | null;
  /** 1 for the first try, 2 once the server offered a second one. */
  attempt: 1 | 2;
  /** The first answer, shown as already tried while the child has one more go. */
  triedValue: AnswerValue | null;
  /** Warm nudge from the hint endpoint (kind retry_hint) for the second try; never the answer. */
  retryHint: string | null;
  lastReveal: LastReveal | null;
  outcome: Outcome | null;
  correctAnswer: AnswerValue | null;
  /** Reveal part of the scene spec (answer-bound bindings), merged into the stage after the answer. */
  sceneReveal: Record<string, unknown> | null;
  denouementText: string;
  denouementStatus: NarrationStatus;
  /** How-to picture for the last answer (right or wrong), when the backend sent one. */
  methodVisual: MethodVisual | null;
  /** Curated questions: kind note for the typical error, and how to solve it. */
  feedback: string | null;
  explain: string | null;
  /** Server hint for the consequence scene family, from the answer (more exact than the beat's). */
  sceneKey: string | null;
  rewards: Reward[];
  rewardIndex: number;
  /** Set when the last answer could not be sent; the same key is reused on retry. */
  pendingAnswer: { value: AnswerValue; key: string; attempt: 1 | 2 } | null;
  error: { code: string; message: string } | null;
};

export const initialStoryState: StoryState = {
  phase: 'starting',
  session: null,
  beat: null,
  sceneText: '',
  sceneStatus: 'pending',
  sceneSlow: false,
  chosen: null,
  attempt: 1,
  triedValue: null,
  retryHint: null,
  lastReveal: null,
  outcome: null,
  correctAnswer: null,
  sceneReveal: null,
  denouementText: '',
  denouementStatus: 'pending',
  methodVisual: null,
  feedback: null,
  explain: null,
  sceneKey: null,
  rewards: [],
  rewardIndex: 0,
  pendingAnswer: null,
  error: null,
};

export type StoryAction =
  | { type: 'SESSION_LOADED'; session: Session }
  | { type: 'BEAT_REQUESTED' }
  | { type: 'BEAT_LOADED'; beat: Beat }
  | { type: 'SCENE_DELTA'; text: string }
  | { type: 'SCENE_DONE' }
  | { type: 'SCENE_FALLBACK'; text: string }
  | { type: 'SCENE_SLOW' }
  | { type: 'SCENE_RETRY' }
  | { type: 'SHOW_QUESTION' }
  | { type: 'ANSWER_SENT'; beatId: string; value: AnswerValue; key: string }
  | { type: 'ANSWER_FAILED'; beatId: string; code: string; message: string }
  | { type: 'ANSWER_RESULT'; beatId: string; result: AnswerResult }
  /** The first answer was not right and the server holds the reveal back: one more go. */
  | { type: 'ANSWER_RETRY_AVAILABLE'; beatId: string; result: AnswerResult }
  | { type: 'RETRY_SENT'; beatId: string; value: AnswerValue; key: string }
  | { type: 'RETRY_HINT'; beatId: string; text: string }
  /** The page was reloaded while the second try was open. */
  | { type: 'RETRY_RESUMED'; beatId: string; tried: AnswerValue | null }
  | { type: 'DEN_DELTA'; beatId: string; text: string }
  | { type: 'DEN_DONE'; beatId: string }
  | { type: 'DEN_FALLBACK'; beatId: string; text: string }
  | { type: 'CONTINUE' }
  | { type: 'REWARD_DONE' }
  | { type: 'FAILED'; code: string; message: string };

export function storyReducer(s: StoryState, a: StoryAction): StoryState {
  // A late result, hint or text for another question is dropped
  if ('beatId' in a && a.beatId !== s.beat?.id) return s;
  // A verdict only lands on a question that is waiting for it
  if ((a.type === 'ANSWER_RESULT' || a.type === 'ANSWER_RETRY_AVAILABLE') && s.phase !== 'answering') return s;
  switch (a.type) {
    case 'SESSION_LOADED':
      return { ...s, session: a.session, error: null };
    case 'BEAT_REQUESTED':
      return { ...s, phase: 'requesting', error: null };
    case 'BEAT_LOADED':
      return {
        ...s,
        phase: 'narrating',
        beat: a.beat,
        sceneText: a.beat.scene.text ?? '',
        sceneStatus: a.beat.scene.status === 'ready' ? 'ready' : a.beat.scene.status === 'fallback' ? 'fallback' : 'pending',
        sceneSlow: false,
        chosen: null,
        attempt: 1,
        triedValue: null,
        retryHint: null,
        outcome: null,
        correctAnswer: null,
        sceneReveal: null,
        denouementText: '',
        denouementStatus: 'pending',
        methodVisual: null,
        feedback: null,
        explain: null,
        rewards: [],
        rewardIndex: 0,
        pendingAnswer: null,
        error: null,
      };
    case 'SCENE_DELTA':
      return { ...s, sceneText: s.sceneText + a.text, sceneStatus: 'streaming', sceneSlow: false };
    case 'SCENE_DONE':
      return { ...s, sceneStatus: 'ready', phase: s.phase === 'narrating' ? 'question' : s.phase, sceneSlow: false };
    case 'SCENE_FALLBACK':
      return { ...s, sceneText: a.text, sceneStatus: 'fallback', phase: s.phase === 'narrating' ? 'question' : s.phase, sceneSlow: false };
    case 'SCENE_SLOW':
      return s.sceneStatus === 'pending' ? { ...s, sceneSlow: true } : s;
    case 'SCENE_RETRY':
      return { ...s, sceneText: '', sceneStatus: 'pending', sceneSlow: false };
    case 'SHOW_QUESTION':
      return s.phase === 'narrating' ? { ...s, phase: 'question' } : s;
    case 'ANSWER_SENT':
      return s.phase !== 'question' ? s : { ...s, phase: 'answering', attempt: 1, chosen: a.value, pendingAnswer: { value: a.value, key: a.key, attempt: 1 }, error: null };
    case 'RETRY_SENT':
      return s.phase !== 'retrying' ? s : { ...s, phase: 'answering', attempt: 2, chosen: a.value, pendingAnswer: { value: a.value, key: a.key, attempt: 2 }, error: null };
    case 'ANSWER_RETRY_AVAILABLE':
      return {
        ...s,
        phase: 'retrying',
        session: a.result.session,
        attempt: 2,
        triedValue: s.chosen,
        chosen: null,
        retryHint: null,
        pendingAnswer: null,
        error: null,
      };
    case 'RETRY_RESUMED':
      return s.phase === 'narrating' || s.phase === 'question' ? { ...s, phase: 'retrying', attempt: 2, triedValue: a.tried, sceneStatus: 'ready' } : s;
    case 'RETRY_HINT':
      return s.phase === 'retrying' ? { ...s, retryHint: a.text } : s;
    case 'ANSWER_FAILED':
      // Stay in 'answering' with the pending answer so Retry can reuse the same idempotency key
      return s.phase === 'answering' ? { ...s, error: { code: a.code, message: a.message } } : s;
    case 'ANSWER_RESULT':
      return {
        ...s,
        phase: 'outcome',
        session: a.result.session,
        outcome: a.result.outcome,
        correctAnswer: a.result.correct_answer ?? null,
        sceneReveal: a.result.scene_reveal ?? null,
        attempt: a.result.attempt ?? s.attempt,
        denouementText: a.result.denouement.text ?? '',
        denouementStatus: a.result.denouement.status === 'ready' ? 'ready' : a.result.denouement.status === 'fallback' ? 'fallback' : 'pending',
        methodVisual: a.result.method_visual ?? null,
        feedback: a.result.feedback ?? null,
        explain: a.result.explain ?? null,
        sceneKey: a.result.scene_key ?? null,
        rewards: a.result.rewards ?? [],
        rewardIndex: 0,
        pendingAnswer: null,
        error: null,
      };
    case 'DEN_DELTA':
      return { ...s, denouementText: s.denouementText + a.text, denouementStatus: 'streaming' };
    case 'DEN_DONE':
      return { ...s, denouementStatus: 'ready' };
    case 'DEN_FALLBACK':
      return { ...s, denouementText: a.text, denouementStatus: 'fallback' };
    case 'CONTINUE': {
      const lastReveal: LastReveal | null =
        s.phase === 'outcome' && s.beat
          ? {
              question: s.beat.question.prompt ?? s.beat.question.math_text,
              correctAnswer: s.correctAnswer,
              outcome: s.outcome,
              explain: s.explain,
              feedback: s.feedback,
              text: s.denouementText,
            }
          : s.lastReveal;
      s = { ...s, lastReveal };
      // A finished chapter hands its rewards to the chapter-complete screen
      if (s.session?.status === 'completed') return { ...s, phase: 'done' };
      if (s.rewards.length > 0 && s.rewardIndex < s.rewards.length && s.phase === 'outcome') {
        return { ...s, phase: 'rewards' };
      }
      return { ...s, phase: 'requesting' };
    }
    case 'REWARD_DONE': {
      const next = s.rewardIndex + 1;
      if (next < s.rewards.length) return { ...s, rewardIndex: next };
      return { ...s, rewardIndex: next, phase: s.session?.status === 'completed' ? 'done' : 'requesting' };
    }
    case 'FAILED':
      return { ...s, phase: 'error', error: { code: a.code, message: a.message } };
  }
}
