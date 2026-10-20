'use client';
/** The play loop: start a chapter, beats, answers, pause and resume, finish. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, newIdempotencyKey, unwrap } from '@/data/api/client';
import type { AnswerValue, WorldId } from '@/data/api/types';
import { keys } from './keys';

// ───────── Play ─────────
export function useStartSession(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { world: WorldId; kind: 'chapter' | 'daily_quest' | 'onboarding'; skill_id?: string | null }) =>
      unwrap(
        api.POST('/children/{childId}/sessions', {
          params: { path: { childId }, header: { 'Idempotency-Key': newIdempotencyKey() } },
          body,
        }),
      ),
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.home(childId) }),
  });
}

/**
 * Fetches one play session (GET /sessions/{id}) with its current state and score. Used to resume after a reload.
 */
export function getSession(sessionId: string) {
  return unwrap(api.GET('/sessions/{sessionId}', { params: { path: { sessionId } } }));
}

/**
 * Asks the server for the next story beat (POST .../beats). Uses a new idempotency key per call, so a double tap
 * yields two requests; guard against it in the screen.
 */
export function requestBeat(sessionId: string) {
  return unwrap(api.POST('/sessions/{sessionId}/beats', { params: { path: { sessionId }, header: { 'Idempotency-Key': newIdempotencyKey() } } }));
}

/**
 * Submits the child's answer to a beat and returns the grading, outcome and rewards. The caller supplies the
 * idempotency key so a network retry of the same answer is not counted twice.
 */
export function sendAnswer(sessionId: string, beatId: string, answer: AnswerValue, key: string, variantHistory?: readonly string[]) {
  return unwrap(
    api.POST('/sessions/{sessionId}/beats/{beatId}/answer', {
      params: { path: { sessionId, beatId }, header: { 'Idempotency-Key': key } },
      // the last 30 scene ids the child saw, so the server keeps the no-repeat rule across reloads and devices
      body: { answer, ...(variantHistory?.length ? { variant_history: variantHistory.slice(-30) } : {}) },
    }),
  );
}

/** Pauses a session on the server (POST .../pause). Pair with resumeSession. */
export function pauseSession(sessionId: string) {
  return unwrap(api.POST('/sessions/{sessionId}/pause', { params: { path: { sessionId } } }));
}

/** Resumes a paused session on the server (POST .../resume). */
export function resumeSession(sessionId: string) {
  return unwrap(api.POST('/sessions/{sessionId}/resume', { params: { path: { sessionId } } }));
}

/** Ends a session and returns its final state (POST .../finish). */
export function finishSession(sessionId: string) {
  return unwrap(api.POST('/sessions/{sessionId}/finish', { params: { path: { sessionId } } }));
}
