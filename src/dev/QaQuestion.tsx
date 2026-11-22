'use client';
import { useTranslations } from 'next-intl';
import { QuestionInput } from '@/game/question-input';
import { QuestionSwap } from '@/game/question-swap';
import { QuestionVisual } from '@/game/question-visual';
import { IllustrationFrame } from '@/game/illustration-frame';
import { ScenePicture } from '@/game/scene-picture';
import { NarrationText } from '@/game/narration-text';
import { OutcomeBeat, OutcomeSheet } from '@/game/outcome-beat';
import { StoryPanel } from '@/game/story-panel';
import { sceneStageFor } from '@/features/play/sceneStageFor';
import { stageInputs, stageKind } from '@/features/play/stageChoice';
import type { AnswerValue, WorldId } from '@/data/api/types';
import type { QaBeat } from './qa-beat';

/**
 * Render-audit mirror of StoryScreen for one question and one phase. Same components, same props, same stage choice
 * (stageInputs and stageKind are shared with StoryScreen). Reveal = the sheet step of a right answer, the state the child
 * sees after the stage, caption and sheet delays. Differences: no session, no streaming (the story is the scene text, the
 * denouement is replaced by the explanation), no top bar, no mascot bubble.
 */
export function QaQuestion({ beat, phase }: { beat: QaBeat; phase: 'question' | 'reveal' }) {
  const t = useTranslations('screens.play.story');
  const q = beat.question;
  const world = beat.world as WorldId;
  const reveal = phase === 'reveal';
  const { nums, sceneMedia, sprite, showCounting, compact } = stageInputs(q);
  const ca = beat.correctAnswer as AnswerValue | null;
  const solution = reveal && ca != null
    ? {
        numeric: typeof ca === 'number' ? ca : undefined,
        text: typeof ca === 'string' ? ca : undefined,
        order: Array.isArray(ca) && ca.every((x) => typeof x === 'string') && q.items?.cards ? { sequence: ca as string[], cards: q.items.cards } : undefined,
      }
    : undefined;
  const sceneStage = sceneStageFor(q, reveal ? 'ok' : 'question', ca, q.visual ? <QuestionVisual visual={q.visual} /> : null);
  const kind = stageKind({ hasScene: Boolean(sceneStage), hasBeat: true, outcomeStage: reveal, showHow: false, hasMethodVisual: false, hasVisual: Boolean(q.visual), showCounting });
  const stage =
    kind === 'scene' ? sceneStage
    : kind === 'answer-on-visual' && q.visual ? (
        <div className="relative flex size-full items-center justify-center">
          <div className="size-full nx-reveal-ok">
            <QuestionVisual visual={q.visual} reveal={solution} context={q.story ?? undefined} />
          </div>
        </div>
      )
    : kind === 'visual' && q.visual ? <QuestionVisual visual={q.visual} context={q.story ?? undefined} />
    : kind === 'counting' ? <ScenePicture world={world} skillId={beat.skill} numbers={nums} mathText={q.math_text} sprite={sprite} />
    : undefined;

  return (
    <main className="relative min-h-dvh" data-qa-kind={kind} data-qa-phase={phase}>
      <StoryPanel
        choicesHidden={reveal}
        choicesFree
        compactStage={compact}
        mediumStage={Boolean(q.kind)}
        visualStage={Boolean(q.visual)}
        illustration={
          <div data-qa="stage" className="size-full">
            <IllustrationFrame world={world} media={sceneMedia} fill mood={reveal ? 'success' : 'idle'} alt={t('illustration')} stageKey={`scene-${beat.id}`} stage={stage} />
          </div>
        }
        narration={
          reveal ? (
            <OutcomeBeat outcome="correct">
              <NarrationText text={beat.explain ?? ''} status="ready" />
            </OutcomeBeat>
          ) : (
            <NarrationText text={q.story ?? ''} status="ready" />
          )
        }
        question={<p>{q.prompt ?? q.math_text}</p>}
        choices={
          <QuestionSwap id={beat.id}>
            <QuestionInput question={q} phase={reveal ? 'outcome' : 'question'} chosen={reveal ? ca : null} outcome={reveal ? 'correct' : null} onSubmit={() => {}} />
          </QuestionSwap>
        }
        sheet={reveal ? <OutcomeSheet right line="" explain={beat.explain ?? undefined} glow={0} continueLabel={t('continue')} canContinue onContinue={() => {}} collapsed={false} onCollapsedChange={() => {}} /> : undefined}
      />
    </main>
  );
}
