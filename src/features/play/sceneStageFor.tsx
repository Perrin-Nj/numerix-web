import type { ReactNode } from 'react';
import { appConfig } from '@/config/app';
import type { Question } from '@/data/api/types';
import { SceneStage, type SceneSpec, type StagePhase } from '@/game/scene-stage';

/**
 * The one hook point of the scene stage in the play screen. Returns the scene for a question that carries `scene`
 * (the three default worlds, served by the API; see specs/001-three-worlds-premium/contract-delta.md), or null so the
 * caller keeps its current stage. Swappable: only this file knows where the spec and the numbers come from.
 */
export function sceneStageFor(q: Question | undefined, phase: StagePhase, correctAnswer: unknown, fallback: ReactNode): ReactNode | null {
  if (!appConfig.features.scenes) return null;
  const spec = (q as (Question & { scene?: SceneSpec }) | undefined)?.scene;
  if (!q || !spec) return null;
  const answer = typeof correctAnswer === 'number' || typeof correctAnswer === 'string' ? correctAnswer : null;
  return (
    <SceneStage
      spec={spec}
      source={{ story: q.story ?? '', prompt: q.prompt ?? '', math_text: q.math_text, visual: q.visual, correctAnswer: answer }}
      phase={phase}
      fallback={fallback}
    />
  );
}
