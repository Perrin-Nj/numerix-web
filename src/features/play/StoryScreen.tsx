'use client';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';
import { ApiError, classifyConnectionFailure, newIdempotencyKey } from '@/data/api/client';
import { streamNarration } from '@/data/api/narration';
import { reportError } from '@/platform/errors/bridge';
import { initialStoryState, storyReducer } from './story-machine';
import { useReadAloud } from '@/platform/speech';
import { useGameStore } from '@/data/local/store';
import { usePickLine } from '@/platform/lines';
import {
  finishSession,
  getSession,
  pauseSession,
  requestBeat,
  resumeSession,
  sendAnswer,
  useChildSettings,
  useSessionStatus,
} from '@/data/hooks';
import { MascotBubble } from '@/game/mascot-bubble';
import { useReducedMotion } from '@/platform/motion';
import { ChoiceButton } from '@/game/choice-button';
import { IllustrationFrame } from '@/game/illustration-frame';
import { OutcomeSim } from '@/game/outcome-sim';
import { MethodVisual } from '@/game/method-visual';
import { ScenePicture } from '@/game/scene-picture';
import { useCoach } from '@/platform/coach/useCoach';
import { NarrationText } from '@/game/narration-text';
import { OutcomeBeat, OutcomeSheet } from '@/game/outcome-beat';
import { HERO_BY_WORLD } from '@/game/human-avatar';
import { getPrefs } from '@/platform/prefs/store';
import { RewardBurst } from '@/game/reward-burst';
import { StoryPanel } from '@/game/story-panel';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';
import { InlineError } from '@/ui/inline-error';
import { useNotify } from '@/ui/notification-center';
import type { AnswerValue, WorldId } from '@/data/api/types';

const KNOWN = new Set([
  'device_offline',
  'server_unreachable',
  'backend_unreachable',
  'backend_timeout',
  'request_failed',
  'unauthorized',
  'session_completed',
  'session_paused',
  'beat_answered',
  'rate_limited',
  'internal_error',
  'not_found',
]);

const DUST = [8, 22, 38, 54, 70, 86];
/** Soft dust drifting up after a miss. Decorative, no red. */
function Dust() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-2 h-10">
      {DUST.map((left, i) => (
        <span key={i} className="nx-dust" style={{ left: `${left}%`, animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

/**
 * The play screen: one story, one question, four choices. No score, progress bar, timer or menu.
 * The only chrome is a quiet pause button.
 */
export function StoryScreen({ sessionId }: { sessionId: string }) {
  const t = useTranslations('screens.play.story');
  const te = useTranslations('errors');
  const router = useRouter();
  const { notify } = useNotify();
  const status = useSessionStatus();
  const settings = useChildSettings(status.data?.childId ?? '');
  const [s, dispatch] = useReducer(storyReducer, initialStoryState);
  const [attempt, setAttempt] = useState(0);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const pick = usePickLine();
  // Local game state (NEXT_PUBLIC_STATE_SOURCE=local): every play is traced as it happens
  const record = useGameStore((g) => g.append);
  const trace = appConfig.stateSource === 'local' ? status.data?.childId ?? null : null;
  const traced = useRef(new Set<string>());
  const reduced = useReducedMotion();
  // Right answers in a row in this chapter: shown only as a glow around the hero
  const [streak, setStreak] = useState(0);
  // Outcome entrance: 0 stage only, 1 caption, 2 sheet. Tap on the stage skips ahead.
  const [reveal, setReveal] = useState<{ key: string; step: 0 | 1 | 2 }>({ key: '', step: 0 });
  const [collapsedFor, setCollapsedFor] = useState<string | null>(null);

  const { speak, cancel: stopSpeaking, pending: speechWaiting } = useReadAloud(
    (settings.data?.read_aloud ?? true) && appConfig.features.readAloud,
    () =>
      notify({
        id: 'no-voice',
        kind: 'info',
        title: t('noVoice.title'),
        description: t('noVoice.description'),
      }),
  );

  const fail = useCallback(
    (e: unknown) => {
      const code = e instanceof ApiError && KNOWN.has(e.code) ? e.code : 'unknown';
      if (e instanceof ApiError && e.code === 'session_completed') {
        router.replace(`/play/session/${sessionId}/done`);
        return;
      }
      dispatch({ type: 'FAILED', code, message: code });
    },
    [router, sessionId],
  );

  // 1. Load (or resume) the session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let session = await getSession(sessionId);
        if (session.status === 'paused') session = await resumeSession(sessionId);
        if (cancelled) return;
        if (session.status === 'completed') {
          router.replace(`/play/session/${sessionId}/done`);
          return;
        }
        dispatch({ type: 'SESSION_LOADED', session });
        if (session.current_beat) dispatch({ type: 'BEAT_LOADED', beat: session.current_beat });
        else dispatch({ type: 'BEAT_REQUESTED' });
      } catch (e) {
        if (!cancelled) fail(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router, fail]);

  // 2. Ask for the next beat
  useEffect(() => {
    if (s.phase !== 'requesting') return;
    let cancelled = false;
    requestBeat(sessionId)
      .then((beat) => !cancelled && dispatch({ type: 'BEAT_LOADED', beat }))
      .catch((e) => !cancelled && fail(e));
    return () => {
      cancelled = true;
    };
  }, [s.phase, sessionId, fail]);

  // 3. Stream the scene narration
  const beatId = s.beat?.id;
  const sceneReadyAtLoad = s.beat?.scene.status === 'ready' || s.beat?.scene.status === 'fallback';
  useEffect(() => {
    if (!beatId) return;
    if (sceneReadyAtLoad) {
      dispatch({ type: 'SCENE_DONE' });
      return;
    }
    dispatch({ type: 'SCENE_RETRY' });
    const slow = setTimeout(() => dispatch({ type: 'SCENE_SLOW' }), 6000);
    const cancel = streamNarration(sessionId, beatId, 'scene', {
      onDelta: (text) => dispatch({ type: 'SCENE_DELTA', text }),
      onDone: () => {
        clearTimeout(slow);
        dispatch({ type: 'SCENE_DONE' });
      },
      onFallback: (text) => {
        clearTimeout(slow);
        dispatch({ type: 'SCENE_FALLBACK', text });
      },
      onError: () => {
        clearTimeout(slow);
        void classifyConnectionFailure().then((e) => dispatch({ type: 'FAILED', code: e.code, message: e.code }));
      },
    });
    return () => {
      clearTimeout(slow);
      cancel();
    };
  }, [beatId, attempt, sessionId, sceneReadyAtLoad]);

  // Read the scene aloud once it is complete
  const spoken = useRef<string | null>(null);
  useEffect(() => {
    if (
      (s.sceneStatus === 'ready' || s.sceneStatus === 'fallback') &&
      s.sceneText &&
      spoken.current !== `${beatId}:scene`
    ) {
      spoken.current = `${beatId}:scene`;
      speak(s.sceneText);
    }
  }, [s.sceneStatus, s.sceneText, beatId, speak]);

  // 4. Answer
  const submit = useCallback(
    async (value: AnswerValue, key: string) => {
      if (!beatId) return;
      try {
        const result = await sendAnswer(sessionId, beatId, value, key);
        dispatch({ type: 'ANSWER_RESULT', result });
        setStreak((n) => (result.outcome === 'correct' ? n + 1 : 0));
      } catch (e) {
        const code = e instanceof ApiError && KNOWN.has(e.code) ? e.code : 'unknown';
        dispatch({ type: 'ANSWER_FAILED', code, message: code });
      }
    },
    [beatId, sessionId],
  );

  function onSelect(value: AnswerValue) {
    if (s.phase !== 'question') return;
    stopSpeaking();
    const key = newIdempotencyKey();
    dispatch({ type: 'ANSWER_SENT', value, key });
    void submit(value, key);
  }

  // 5. Stream the consequence
  const denRef = useRef(s.denouementStatus);
  useEffect(() => {
    denRef.current = s.denouementStatus;
  });
  useEffect(() => {
    if (s.phase !== 'outcome' || !beatId || denRef.current !== 'pending') return;
    return streamNarration(sessionId, beatId, 'denouement', {
      onDelta: (text) => dispatch({ type: 'DEN_DELTA', text }),
      onDone: () => dispatch({ type: 'DEN_DONE' }),
      onFallback: (text) => dispatch({ type: 'DEN_FALLBACK', text }),
      onError: () =>
        void classifyConnectionFailure().then((e) => dispatch({ type: 'FAILED', code: e.code, message: e.code })),
    });
  }, [s.phase, beatId, sessionId]);

  const denSpoken = useRef<string | null>(null);
  useEffect(() => {
    if (
      (s.denouementStatus === 'ready' || s.denouementStatus === 'fallback') &&
      s.denouementText &&
      denSpoken.current !== beatId
    ) {
      denSpoken.current = beatId ?? null;
      speak(s.denouementText);
    }
  }, [s.denouementStatus, s.denouementText, beatId, speak]);

  // Stage, then caption, then sheet (0, 600, 1200 ms)
  useEffect(() => {
    if (s.phase !== 'outcome' || !beatId) return;
    const up = (step: 1 | 2) => setReveal((r) => (r.key === beatId && r.step >= step ? r : { key: beatId, step }));
    const a = setTimeout(() => up(1), 600);
    const b = setTimeout(() => up(2), 1200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [s.phase, beatId]);
  const step = reveal.key === beatId ? reveal.step : 0;
  const skipAhead = useCallback(() => {
    if (beatId) setReveal({ key: beatId, step: 2 });
  }, [beatId]);

  // Optional buzz: short for right, double for wrong
  useEffect(() => {
    if (s.phase !== 'outcome' || !s.outcome || !getPrefs().vibration || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(s.outcome === 'correct' ? 40 : [40, 70, 40]);
  }, [s.phase, s.outcome, beatId]);

  // Small confetti burst on a correct answer (skipped under reduced motion)
  useEffect(() => {
    if (s.phase !== 'outcome' || s.outcome !== 'correct' || reduced) return;
    let cancelled = false;
    void import('canvas-confetti').then(({ default: confetti }) => {
      if (!cancelled)
        void confetti({
          particleCount: 30,
          spread: 60,
          ticks: 70,
          origin: { y: 0.7 },
          disableForReducedMotion: true,
        });
    });
    return () => {
      cancelled = true;
    };
  }, [s.phase, s.outcome, beatId, reduced]);

  // 6. Continue to the next beat, the rewards, or the chapter-complete screen
  function onContinue() {
    stopSpeaking();
    if (s.session?.status === 'completed') {
      try {
        sessionStorage.setItem(`nx:rewards:${sessionId}`, JSON.stringify(s.rewards));
      } catch {
        // storage can be blocked; the done screen then shows the generic completion
      }
    }
    dispatch({ type: 'CONTINUE' });
  }
  useEffect(() => {
    if (s.phase === 'done') router.replace(`/play/session/${sessionId}/done`);
  }, [s.phase, router, sessionId]);

  // Trace the play: start when the first beat arrives, then every answer, the finish and the cards
  useEffect(() => {
    if (!trace || !s.beat || !s.session) return;
    record(trace, { k: 'start', sid: sessionId, world: s.session.world, skill: s.beat.skill_id, mode: s.session.kind === 'daily_quest' ? 'daily_quest' : s.session.kind === 'onboarding' ? 'onboarding' : 'chapter' });
  }, [trace, record, s.beat, s.session, sessionId]);

  useEffect(() => {
    if (!trace || s.phase !== 'outcome' || !s.outcome || !s.beat || !s.session) return;
    const key = `a:${s.beat.id}`;
    if (traced.current.has(key)) return;
    traced.current.add(key);
    record(trace, { k: 'answer', sid: sessionId, world: s.session.world, skill: s.beat.skill_id, outcome: s.outcome, i: s.beat.index });
    for (const r of s.rewards) {
      if (r.type === 'card_earned' && r.card) {
        record(trace, { k: 'card', card: { id: r.card.id, world: r.card.world, title: r.card.title, earnedAt: r.card.earned_at, source: 'chapter' } });
      }
    }
    if (s.session.status === 'completed') record(trace, { k: 'finish', sid: sessionId, done: true, title: s.session.story_title ?? undefined });
  }, [trace, record, s.phase, s.outcome, s.beat, s.session, s.rewards, sessionId]);

  async function exitPlay() {
    try {
      await finishSession(sessionId);
      if (trace) record(trace, { k: 'finish', sid: sessionId, done: false });
      stopSpeaking();
      router.replace('/play/home');
    } catch (e) {
      reportError(e);
    }
  }

  async function takeBreak() {
    try {
      await pauseSession(sessionId);
      router.replace('/play/home');
    } catch (e) {
      reportError(e);
    }
  }

  function retryAfterError() {
    if (s.beat) {
      dispatch({ type: 'BEAT_LOADED', beat: s.beat });
      setAttempt((a) => a + 1);
    } else if (s.session) dispatch({ type: 'BEAT_REQUESTED' });
    else router.refresh();
  }

  const world: WorldId = s.session?.world ?? 'echecs';
  const showQuestion = s.beat && ['question', 'answering', 'outcome'].includes(s.phase);
  const mood =
    s.phase === 'outcome'
      ? s.outcome === 'correct'
        ? 'success'
        : s.outcome === 'erreur_typique'
          ? 'detour'
          : 'surprise'
      : 'idle';
  const sameChoice = (a: AnswerValue | null, b: AnswerValue) => a !== null && JSON.stringify(a) === JSON.stringify(b);
  const answerError = s.phase === 'answering' && s.error ? s.error.code : null;
  const linePool = s.phase !== 'outcome' ? 'think' : s.outcome === 'correct' ? 'cheer' : s.outcome === 'erreur_typique' ? 'curious' : 'encourage';
  const lang = useLocale();
  const coach = useCoach({
    skillId: s.beat?.skill_id ?? 'generic',
    beatKey: s.beat?.id ?? 'none',
    active: s.phase === 'question' || s.phase === 'answering',
    lang,
  });
  const nums = (s.beat?.question.math_text.match(/\d+/g) ?? []).map(Number);
  const denReady = s.denouementStatus === 'ready' || s.denouementStatus === 'fallback';
  const outcomeStage = s.phase === 'outcome' && !!s.outcome;
  const sheetVisible = outcomeStage && step >= 2;
  // After the short story consequence, the stage shows how to solve it: the same picture for right and wrong answers
  const showHow = outcomeStage && step >= 2 && Boolean(s.methodVisual);
  // A fresh line for each moment, never the same one twice in a row
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mascotLine = useMemo(() => pick(`mascot.${linePool}`), [linePool, s.beat?.id, s.outcome]);

  if (s.phase === 'error') {
    const code = s.error?.code ?? 'unknown';
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-4">
        <h1 className="font-display text-3xl font-bold">{te(`${code}.title`)}</h1>
        <p className="text-lg text-muted">{te(`${code}.description`)}</p>
        <div className="flex gap-3">
          <Button onClick={retryAfterError}>{te('retry')}</Button>
          <Button variant="ghost" onClick={() => router.replace('/play/home')}>
            {te('back')}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh">
      <div className="fixed inset-x-0 top-0 z-20 box-content flex h-14 items-center justify-between bg-bg/85 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
        <IconButton label={t('exit.label')} variant="ghost" sound="back" icon={<Icon name="x" />} onClick={() => setExitOpen(true)} />
        <IconButton
          label={t('pause')}
          variant="ghost"
          icon={<Icon name="pause" />}
          onClick={() => setPauseOpen(true)}
        />
      </div>

      <StoryPanel
        choicesHidden={sheetVisible}
        illustration={
          <IllustrationFrame
            world={world}
            mood={mood}
            alt={t('illustration')}
            stageKey={s.beat && outcomeStage ? (showHow ? `how-${s.beat.id}` : `sim-${s.beat.id}`) : `scene-${s.beat?.id ?? ''}`}
            stage={
              s.beat && outcomeStage && showHow && s.methodVisual ? (
                <MethodVisual visual={s.methodVisual} />
              ) : s.beat && outcomeStage ? (
                <div className="relative flex size-full items-center justify-center">
                  <OutcomeSim world={world} good={s.outcome === 'correct'} showCaption={step >= 1} onDone={skipAhead} />
                  {s.outcome !== 'correct' && !reduced && step >= 1 && <Dust />}
                </div>
              ) : s.beat && nums.length > 0 ? (
                <ScenePicture world={world} skillId={s.beat.skill_id} numbers={nums} hero={HERO_BY_WORLD[world]} glow={streak} />
              ) : undefined
            }
          />
        }
        narration={
          <>
            {s.phase === 'outcome' && s.outcome ? (
              <OutcomeBeat outcome={s.outcome}>
                <NarrationText text={s.denouementText} status={s.denouementStatus} />
              </OutcomeBeat>
            ) : (
              <>
                <NarrationText
                  text={s.sceneText}
                  status={s.sceneStatus}
                  slow={s.sceneSlow}
                  onRetry={() => setAttempt((a) => a + 1)}
                />
                {s.phase === 'narrating' && s.sceneSlow && s.beat && (
                  <div className="mt-3">
                    <Button variant="secondary" onClick={() => dispatch({ type: 'SHOW_QUESTION' })}>
                      {t('showQuestion')}
                    </Button>
                  </div>
                )}
              </>
            )}
            {speechWaiting && (
              <div className="mt-3">
                <Button variant="secondary" iconLeft={<Icon name="volume" />} onClick={() => s.sceneText && speak(s.sceneText)}>
                  {t('tapToHear')}
                </Button>
              </div>
            )}
            {coach.hint && s.phase !== 'outcome' && (
              <MascotBubble size="sm" pose="think" className="mt-4">
                {coach.hint}
              </MascotBubble>
            )}
            {showQuestion && s.phase !== 'outcome' && (
              <MascotBubble size="sm" pose="think" className="mt-4 hidden lg:flex">
                {mascotLine}
              </MascotBubble>
            )}
          </>
        }
        question={
          showQuestion && s.beat ? (
            <p>{s.beat.question.math_text}</p>
          ) : undefined
        }
        choices={
          showQuestion && s.beat ? (
            <>
              {s.beat.question.choices.map((c, i) => (
                <div key={JSON.stringify(c)} className="nx-stagger" style={{ '--i': i } as CSSProperties}>
                  <ChoiceButton
                    value={c}
                    index={i}
                    shortcut={s.phase === 'question'}
                    state={
                      s.phase === 'question'
                        ? 'idle'
                        : sameChoice(s.chosen, c)
                          ? s.phase === 'outcome'
                            ? s.outcome === 'correct'
                              ? 'success'
                              : 'miss'
                            : 'selected'
                          : 'locked'
                    }
                    onSelect={onSelect}
                  />
                </div>
              ))}
            </>
          ) : undefined
        }
        footer={
          answerError ? (
            <div className="flex flex-col items-start gap-3">
              <InlineError message={te(`${answerError}.title`)} recovery={te(`${answerError}.description`)} />
              <Button onClick={() => s.pendingAnswer && void submit(s.pendingAnswer.value, s.pendingAnswer.key)}>
                {te('retry')}
              </Button>
            </div>
          ) : undefined
        }
      />

      {sheetVisible && s.outcome && (
        <OutcomeSheet
          right={s.outcome === 'correct'}
          line={mascotLine}
          hero={HERO_BY_WORLD[world]}
          glow={streak}
          continueLabel={t('continue')}
          canContinue={denReady}
          onContinue={onContinue}
          collapsed={collapsedFor === beatId}
          onCollapsedChange={(c) => setCollapsedFor(c ? (beatId ?? null) : null)}
        />
      )}

      {s.phase === 'rewards' && s.rewards[s.rewardIndex] && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-bg/80 p-4">
          <RewardBurst reward={s.rewards[s.rewardIndex]} onDone={() => dispatch({ type: 'REWARD_DONE' })} />
        </div>
      )}

      <Dialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title={t('exit.title')}
        description={t('exit.text')}
        footer={
          <>
            <Button variant="secondary" onClick={exitPlay}>
              {t('exit.confirm')}
            </Button>
            <Button onClick={() => setExitOpen(false)}>{t('exit.stay')}</Button>
          </>
        }
      />

      <Dialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        title={t('pauseTitle')}
        description={t('pauseText')}
        footer={
          <>
            <Button variant="secondary" onClick={takeBreak}>
              {t('takeBreak')}
            </Button>
            <Button onClick={() => setPauseOpen(false)}>{t('keepPlaying')}</Button>
          </>
        }
      />
    </main>
  );
}
