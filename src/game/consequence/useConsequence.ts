'use client';
import { useEffect, useMemo } from 'react';
import { pickScene, mergeHistory, HISTORY_CAP } from './picker';
import { familyOf } from './catalog';

const key = (sessionId: string) => `nx.variants.${sessionId}`;
function load(sessionId: string): string[] {
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
  sessionId: string;
  beatId?: string;
  outcome: string | null;
  skillId?: string;
  visualKind?: string | null;
  sceneKey?: string | null;
  /** Server `variant_history` when it sends one. */
  serverHistory?: readonly string[] | null;
};

/** Scene id for the current outcome. Picked once per beat and answer, recorded in sessionStorage (and merged with the server list). */
export function useConsequence(i: ConsequenceInput): string | null {
  const { sessionId, beatId, outcome, skillId, visualKind, sceneKey, serverHistory } = i;
  const id = useMemo(() => {
    if (!beatId || !outcome) return null;
    const history = mergeHistory(load(sessionId), serverHistory);
    const family = familyOf({ sceneKey, visualKind, skillId });
    return pickScene(family, outcome === 'correct', history, `${sessionId}|${beatId}`).id;
    // history is read once per beat and answer on purpose: the pick must not change when the effect below saves it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, beatId, outcome]);
  useEffect(() => {
    if (!id) return;
    const h = load(sessionId);
    if (h[h.length - 1] !== id) save(sessionId, [...mergeHistory(h, serverHistory), id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sessionId]);
  return id;
}
