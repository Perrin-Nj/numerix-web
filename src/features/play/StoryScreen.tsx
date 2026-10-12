'use client';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';
import { ApiError, newIdempotencyKey } from '@/lib/api/client';
import { streamNarration } from '@/lib/api/narration';
import { reportError } from '@/lib/errors/bridge';
import { initialStoryState, storyReducer } from '@/lib/session/machine';
import { useReadAloud } from '@/lib/speech';
import { getSession, pauseSession, requestBeat, resumeSession, sendAnswer, useChildSettings, useSessionStatus } from '@/features/api/hooks';
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

const KNOWN = new Set(['network', 'unauthorized', 'session_completed', 'session_paused', 'beat_answered', 'rate_limited', 'internal_error', 'not_found']);

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

  const { speak, cancel: stopSpeaking } = useReadAloud(
    Boolean(settings.data?.read_aloud) && appConfig.features.readAloud,
    () => notify({ id: 'no-voice', kind: 'info', title: t('noVoice.title'), description: t('noVoice.description') }),
  );

  const fail = useCallback((e: unknown) => {
    const code = e instanceof ApiError && KNOWN.has(e.code) ? e.code : 'unknown';
    if (e instanceof ApiError && e.code === 'session_completed') {
      router.replace(`/play/session/${sessionId}/done`);
      return;
    }
    dispatch({ type: 'FAILED', code, message: code });
  }, [router, sessionId]);

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
        dispatch({ type: 'FAILED', code: 'narrationFailed', message: 'narrationFailed' });
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
    if ((s.sceneStatus === 'ready' || s.sceneStatus === 'fallback') && s.sceneText && spoken.current !== `${beatId}:scene`) {
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
      onError: () => dispatch({ type: 'FAILED', code: 'narrationFailed', message: 'narrationFailed' }),
    });
  }, [s.phase, beatId, sessionId]);

  const denSpoken = useRef<string | null>(null);
  useEffect(() => {
    if ((s.denouementStatus === 'ready' || s.denouementStatus === 'fallback') && s.denouementText && denSpoken.current !== beatId) {
      denSpoken.current = beatId ?? null;
      speak(s.denouementText);
    }
  }, [s.denouementStatus, s.denouementText, beatId, speak]);

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
  const mood = s.phase === 'outcome' ? (s.outcome === 'correct' ? 'success' : s.outcome === 'erreur_typique' ? 'detour' : 'surprise') : 'idle';
  const sameChoice = (a: AnswerValue | null, b: AnswerValue) => a !== null && JSON.stringify(a) === JSON.stringify(b);
  const answerError = s.phase === 'answering' && s.error ? s.error.code : null;
  const denReady = s.denouementStatus === 'ready' || s.denouementStatus === 'fallback';

  if (s.phase === 'error') {
    const code = s.error?.code ?? 'unknown';
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-4">
        <h1 className="font-display text-3xl font-bold">{te(`${code}.title`)}</h1>
        <p className="text-lg text-muted">{te(`${code}.description`)}</p>
        <div className="flex gap-3">
          <Button onClick={retryAfterError}>{te('network.retry')}</Button>
          <Button variant="ghost" onClick={() => router.replace('/play/home')}>
            {te('back')}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh">
      <div className="fixed end-3 top-3 z-20 pt-[env(safe-area-inset-top)]">
        <IconButton label={t('pause')} variant="ghost" icon={<Icon name="pause" />} onClick={() => setPauseOpen(true)} />
      </div>

      <StoryPanel
        illustration={<IllustrationFrame world={world} mood={mood} alt={t('illustration')} />}
        narration={
          s.phase === 'outcome' && s.outcome ? (
            <OutcomeBeat outcome={s.outcome}>
              <NarrationText text={s.denouementText} status={s.denouementStatus} />
            </OutcomeBeat>
          ) : (
            <>
              <NarrationText text={s.sceneText} status={s.sceneStatus} slow={s.sceneSlow} onRetry={() => setAttempt((a) => a + 1)} />
              {s.phase === 'narrating' && s.sceneSlow && s.beat && (
                <div className="mt-3">
                  <Button variant="secondary" onClick={() => dispatch({ type: 'SHOW_QUESTION' })}>
                    {t('showQuestion')}
                  </Button>
                </div>
              )}
            </>
          )
        }
        question={showQuestion && s.beat ? <p className="font-display text-4xl font-bold sm:text-5xl">{s.beat.question.math_text}</p> : undefined}
        choices={
          showQuestion && s.beat ? (
            <>
              {s.beat.question.choices.map((c, i) => (
                <ChoiceButton
                  key={JSON.stringify(c)}
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
              ))}
            </>
          ) : undefined
        }
        footer={
          <div className="flex flex-col items-start gap-3">
            {answerError && (
              <>
                <InlineError message={te(`${answerError}.title`)} recovery={te(`${answerError}.description`)} />
                <Button
                  onClick={() => s.pendingAnswer && void submit(s.pendingAnswer.value, s.pendingAnswer.key)}
                >
                  {te('network.retry')}
                </Button>
              </>
            )}
            {s.phase === 'outcome' && denReady && (
              <Button size="xl" onClick={onContinue}>
                {t('continue')}
              </Button>
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
