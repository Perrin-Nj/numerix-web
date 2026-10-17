import type { AnswerResult, AnswerValue, Beat, MethodVisual, Outcome, Reward, Session } from '@/data/api/types';

/**
 * The story screen state machine (spec 7.5). Pure reducer so every transition is explicit.
 * Phases: starting, requesting, narrating (scene), question, answering, outcome (denouement), rewards, done.
 */
export type Phase =
  | 'starting'
  | 'requesting'
  | 'narrating'
  | 'question'
  | 'answering'
  | 'outcome'
  | 'rewards'
  | 'done'
  | 'error';

export type NarrationStatus = 'pending' | 'streaming' | 'ready' | 'fallback';

export type StoryState = {
  phase: Phase;
  session: Session | null;
  beat: Beat | null;
  sceneText: string;
  sceneStatus: NarrationStatus;
  sceneSlow: boolean;
  chosen: AnswerValue | null;
  outcome: Outcome | null;
  correctAnswer: AnswerValue | null;
  denouementText: string;
  denouementStatus: NarrationStatus;
  /** How-to picture for the last answer (right or wrong), when the backend sent one. */
  methodVisual: MethodVisual | null;
  rewards: Reward[];
  rewardIndex: number;
  /** Set when the last answer could not be sent; the same key is reused on retry. */
  pendingAnswer: { value: AnswerValue; key: string } | null;
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
  outcome: null,
  correctAnswer: null,
  denouementText: '',
  denouementStatus: 'pending',
  methodVisual: null,
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
  | { type: 'ANSWER_SENT'; value: AnswerValue; key: string }
  | { type: 'ANSWER_FAILED'; code: string; message: string }
  | { type: 'ANSWER_RESULT'; result: AnswerResult }
  | { type: 'DEN_DELTA'; text: string }
  | { type: 'DEN_DONE' }
  | { type: 'DEN_FALLBACK'; text: string }
  | { type: 'CONTINUE' }
  | { type: 'REWARD_DONE' }
  | { type: 'FAILED'; code: string; message: string };

export function storyReducer(s: StoryState, a: StoryAction): StoryState {
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
        outcome: null,
        correctAnswer: null,
        denouementText: '',
        denouementStatus: 'pending',
        methodVisual: null,
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
      return { ...s, phase: 'answering', chosen: a.value, pendingAnswer: { value: a.value, key: a.key }, error: null };
    case 'ANSWER_FAILED':
      // Stay in 'answering' with the pending answer so Retry can reuse the same idempotency key
      return { ...s, phase: 'answering', error: { code: a.code, message: a.message } };
    case 'ANSWER_RESULT':
      return {
        ...s,
        phase: 'outcome',
        session: a.result.session,
        outcome: a.result.outcome,
        correctAnswer: a.result.correct_answer,
        denouementText: a.result.denouement.text ?? '',
        denouementStatus: a.result.denouement.status === 'ready' ? 'ready' : a.result.denouement.status === 'fallback' ? 'fallback' : 'pending',
        methodVisual: a.result.method_visual ?? null,
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
