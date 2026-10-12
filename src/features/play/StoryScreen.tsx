'use client';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';
import { ApiError, classifyConnectionFailure, newIdempotencyKey } from '@/lib/api/client';
import { streamNarration } from '@/lib/api/narration';
import { reportError } from '@/lib/errors/bridge';
import { initialStoryState, storyReducer } from '@/lib/session/machine';
import { useReadAloud } from '@/lib/speech';
import { useGameStore } from '@/lib/game/store';
import { usePickLine } from '@/lib/lines';
import {
  finishSession,
  getSession,
  pauseSession,
  requestBeat,
  resumeSession,
  sendAnswer,
  useChildSettings,
  useSessionStatus,
} from '@/features/api/hooks';
import { MascotBubble } from '@/game/mascot-bubble';
import { useReducedMotion } from '@/lib/motion';
import { ChoiceButton } from '@/game/choice-button';
import { IllustrationFrame } from '@/game/illustration-frame';
import { NarrationText } from '@/game/narration-text';
import { OutcomeBeat } from '@/game/outcome-beat';
import { RewardBurst } from '@/game/reward-burst';
import { StoryPanel } from '@/game/story-panel';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { Icon } from '@/ui/icon';
import { IconButton } from '@/ui/icon-button';
import { InlineError } from '@/ui/inline-error';
import { useNotify } from '@/ui/notification-center';
import type { AnswerValue, WorldId } from '@/lib/api/types';

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

  const { speak, cancel: stopSpeaking } = useReadAloud(
    Boolean(settings.data?.read_aloud) && appConfig.features.readAloud,
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
  const pose =
    s.phase !== 'outcome'
      ? 'think'
      : s.outcome === 'correct'
        ? 'cheer'
        : s.outcome === 'erreur_typique'
          ? 'curious'
          : 'amazed';
  const denReady = s.denouementStatus === 'ready' || s.denouementStatus === 'fallback';
  // A fresh line for each moment, never the same one twice in a row
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mascotLine = useMemo(() => pick(`mascot.${pose}`), [pose, s.beat?.id, s.outcome]);

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
      <div className="fixed start-3 top-3 z-20 pt-[env(safe-area-inset-top)]">
        <IconButton label={t('exit.label')} variant="ghost" sound="back" icon={<Icon name="x" />} onClick={() => setExitOpen(true)} />
      </div>
      <div className="fixed end-3 top-3 z-20 pt-[env(safe-area-inset-top)]">
        <IconButton
          label={t('pause')}
          variant="ghost"
          icon={<Icon name="pause" />}
          onClick={() => setPauseOpen(true)}
        />
      </div>

      <StoryPanel
        illustration={<IllustrationFrame world={world} mood={mood} alt={t('illustration')} />}
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
            {showQuestion && (
              <MascotBubble size="sm" pose={pose} className="mt-4">
                {mascotLine}
              </MascotBubble>
            )}
          </>
        }
        question={
          showQuestion && s.beat ? (
            <p className="font-display text-4xl font-bold sm:text-5xl">{s.beat.question.math_text}</p>
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
                          ? s.phase === 'outcome' && s.outcome === 'correct'
                            ? 'success'
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
          <div className="flex flex-col items-start gap-3">
            {answerError && (
              <>
                <InlineError message={te(`${answerError}.title`)} recovery={te(`${answerError}.description`)} />
                <Button onClick={() => s.pendingAnswer && void submit(s.pendingAnswer.value, s.pendingAnswer.key)}>
                  {te('retry')}
                </Button>
              </>
            )}
            {s.phase === 'outcome' && denReady && (
              <div className="nx-rise">
                <Button size="xl" onClick={onContinue}>
                  {t('continue')}
                </Button>
              </div>
            )}
          </div>
        }
      />

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
