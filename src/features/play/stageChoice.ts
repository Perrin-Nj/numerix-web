import type { Question, QuestionMedia } from '@/data/api/types';

/** What the play screen derives from a question before it draws the stage. Shared with the dev render-audit page. */
export function stageInputs(q: Question | undefined) {
  const nums = (q?.math_text.match(/\d+/g) ?? []).map(Number);
  const scene = (q?.media as QuestionMedia[] | undefined)?.find((m) => m.role === 'scene');
  // the generic world hero is a filler, never scene content: the stage then draws a calm tinted backdrop instead
  const sceneMedia = scene && !scene.hero_fallback ? scene.image : null;
  const sprite = q?.media?.find((m) => m.role === 'object')?.image;
  // Curated questions show a counting picture only when they come with a sprite; generated ones keep the emoji picture
  const showCounting = nums.length > 0 && (q?.kind === undefined || ((q.kind === 'numeric' || q.kind === 'word') && Boolean(sprite)));
  const compact = Boolean(q && q.choices.length === 0 && q.kind !== 'truefalse');
  return { nums, sceneMedia, sprite, showCounting, compact };
}

export type StageKind = 'scene' | 'how' | 'answer-on-visual' | 'visual' | 'counting' | 'none';

/** Which picture fills the stage, in the exact priority order of the play screen. */
export function stageKind(a: {
  hasScene: boolean;
  hasBeat: boolean;
  outcomeStage: boolean;
  showHow: boolean;
  hasMethodVisual: boolean;
  hasVisual: boolean;
  showCounting: boolean;
}): StageKind {
  if (a.hasScene && !a.showHow) return 'scene';
  if (a.hasBeat && a.outcomeStage && a.showHow && a.hasMethodVisual) return 'how';
  if (a.hasBeat && a.outcomeStage && a.hasVisual) return 'answer-on-visual';
  if (a.hasBeat && a.hasVisual) return 'visual';
  if (a.hasBeat && a.showCounting) return 'counting';
  return 'none';
}
