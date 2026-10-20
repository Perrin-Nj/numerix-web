'use client';
import { useEffect, useMemo } from 'react';
import { pickScene, mergeHistory, sceneOff, HISTORY_CAP, type SceneRules } from './picker';
import { familyOf } from './catalog';
import { amountOf, rightAmount, type Amount } from './amounts';

const key = (sessionId: string) => `nx.variants.${sessionId}`;
/** Scene ids this tab showed in the session, oldest first (also what the client sends as `variant_history`). */
export function loadVariantHistory(sessionId: string): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(key(sessionId)) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function save(sessionId: string, h: string[]) {
  try {
    sessionStorage.setItem(key(sessionId), JSON.stringify(h.slice(-HISTORY_CAP)));
  } catch {
    /* private window: the picker still works for this page load */
  }
}

export type ConsequenceInput = {
  /** Admin scene rules from the public config; null/undefined: every scene allowed. */
  rules?: SceneRules | null;
  sessionId: string;
  beatId?: string;
  outcome: string | null;
  skillId?: string;
  visualKind?: string | null;
  sceneKey?: string | null;
  /** The right answer and the child's answer (from the answer result). */
  correct?: unknown;
  chosen?: unknown;
  /** Server `variant_history` when it sends one. */
  serverHistory?: readonly string[] | null;
};
export type Consequence = { sceneId: string; amount: Amount };

/** Scene for the current outcome, sized by the real numbers. Picked once per beat and answer, recorded in sessionStorage (and merged with the server list). */
export function useConsequence(i: ConsequenceInput): Consequence | null {
  const { sessionId, beatId, outcome, skillId, visualKind, sceneKey, serverHistory, correct, chosen, rules } = i;
  const result = useMemo(() => {
    if (!beatId || !outcome) return null;
    const good = outcome === 'correct';
    const salt = hashSalt(beatId);
    const amount = good ? rightAmount(correct) : amountOf(correct, chosen, salt);
    const history = mergeHistory(loadVariantHistory(sessionId), serverHistory);
    const family = familyOf({ sceneKey, visualKind, skillId });
    const scene = pickScene(family, good, history, `${sessionId}|${beatId}`, good ? null : amount.over, (s) => sceneOff(rules, s));
    return scene ? { sceneId: scene.id, amount } : null;
    // history is read once per beat and answer on purpose: the pick must not change when the effect below saves it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, beatId, outcome]);
  const id = result?.sceneId;
  useEffect(() => {
    if (!id) return;
    const h = loadVariantHistory(sessionId);
    if (h[h.length - 1] !== id) save(sessionId, [...mergeHistory(h, serverHistory), id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sessionId]);
  return result;
}
const hashSalt = (s: string) => Array.from(s).reduce((n, c) => n + c.charCodeAt(0), 0);
