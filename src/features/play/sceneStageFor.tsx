import type { ReactNode } from 'react';
import { appConfig } from '@/config/app';
import type { Question } from '@/data/api/types';
import { SceneStage, type SceneSpec, type StagePhase } from '@/game/scene-stage';
import { runtimePlates, type RunItems } from '@/game/scene-stage/worlds/espace/plates';
import { mergeReveal, type SceneQuestionPart } from '@/game/scene-stage/delivery';
import { sceneApproved } from '@/game/scene-stage/approval';

/**
 * The one hook point of the scene stage in the play screen. Returns the scene for a question that carries `scene`
 * (sent by the API only for approved questions while platform.scenes_enabled is on), or null so the caller keeps its
 * current stage. After the answer, `reveal` (AnswerResult.scene_reveal) is merged into the spec. Swappable: only this
 * file knows where the spec and the numbers come from. qaAll is the dev route only (QA_SCENES_ALL).
 */
export function sceneStageFor(q: Question | undefined, phase: StagePhase, correctAnswer: unknown, fallback: ReactNode, qaAll = false, id?: string, reveal?: Record<string, unknown> | null): ReactNode | null {
  const base = (q as (Question & { scene?: SceneQuestionPart | null }) | undefined)?.scene;
  if (!appConfig.features.scenes) return null;
  if (id && !sceneApproved(id, true, qaAll)) return null; // the dev route only (it passes an id): scene-approved.json or QA_SCENES_ALL
  if (!q || !base) return null;
  const spec: SceneSpec = mergeReveal(base, phase === 'question' ? null : reveal);
  const answer = typeof correctAnswer === 'number' || typeof correctAnswer === 'string' ? correctAnswer : null;
  const reveal_ = phase !== 'question';
  // the tag row paints the cards or choices the child already sees; their rank, partner and winner come from the released answer
  const plates = !q.visual && (spec.archetype === 'espace.tag-row' || (spec.archetype === 'espace.bay3d' && spec.setting.startsWith('es:tags:'))) ? runtimePlates(q.items as RunItems | undefined, q.choices as (number | string)[], correctAnswer, reveal_) : null;
  // any 3D scene of an order or match question: the cards ride on the visual, rank and partner from the released answer
  const cards = q.visual && spec.archetype.endsWith('3d') && q.items && (q.kind === 'order' || q.kind === 'match') ? runtimePlates(q.items as RunItems, [], correctAnswer, reveal_) : null;
  const visual = cards && q.visual ? { kind: q.visual.kind, data: { ...(q.visual.data as object), plates: cards } } : (q.visual ?? (plates ? { kind: 'plates', data: plates } : undefined));
  const shown = reveal_ ? answerShown(correctAnswer, q.kind === 'estimate') : undefined;
  return (
    <SceneStage
      spec={spec}
      source={{ story: q.story ?? '', prompt: q.prompt ?? '', math_text: q.math_text, visual, correctAnswer: answer, shown }}
      phase={phase}
      fallback={fallback}
    />
  );
}

/** The answer as a badge text: a number, a text, a quotient with its remainder, or a rounded estimate (the number the explanation states). */
export function answerShown(a: unknown, estimate: boolean): string | undefined {
  if (typeof a === 'number') {
    if (!estimate || a === 0) return String(a);
    const p = 10 ** Math.floor(Math.log10(Math.abs(a)));
    return `≈ ${Math.round(a / p) * p}`;
  }
  if (typeof a === 'boolean') return a ? '@true' : '@false'; // true/false tile: the stage words it in the child's language
  if (typeof a === 'string') return a;
  if (Array.isArray(a) && a.length && a.every((x) => typeof x === 'number')) return (a as number[]).join(' r ');
  return undefined;
}
