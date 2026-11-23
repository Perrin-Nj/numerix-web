import type { Question } from '@/data/api/types';
import { sceneStageFor } from '@/features/play/sceneStageFor';
import { resolveScene } from '@/game/scene-stage/bind';
import type { RawQuestion } from '@/game/scene-stage/route';
import type { SceneSpec } from '@/game/scene-stage';
import { entryOf } from '@/game/scene-stage/delivery';

/** Why a routed question would show the photo instead of its scene (no stage, or the binding the play screen builds does not resolve), or null. Needs NEXT_PUBLIC_FEATURE_SCENES=true. */
export function photoFallback(q: RawQuestion, spec: SceneSpec): string | null {
  const fr = (l?: { fr?: string }) => l?.fr ?? '';
  const it = q.items;
  const tx = (l: { id: string; text: { fr?: string } }[]) => l.map((x) => ({ id: x.id, text: fr(x.text) }));
  const items = Array.isArray(it) ? { cards: tx(it) } : it ? { left: tx(it.left), right: tx(it.right) } : undefined;
  const choices = (q.choices ?? []).map((c) => { const t = fr(c.text).replace(',', '.'); return t.trim() !== '' && !isNaN(Number(t)) ? Number(t) : fr(c.text); });
  const quest = { kind: 'numeric', math_text: fr(q.math_text) || fr(q.prompt), choices, ...(items ? { items } : {}), prompt: fr(q.prompt), story: fr(q.story), ...(q.visual ? { visual: q.visual } : {}), scene: entryOf(spec).question } as unknown as Question;
  const reveal = entryOf(spec).reveal as unknown as Record<string, unknown>;
  const el = sceneStageFor(quest, 'question', null, null, true, q.id) as { props: { spec: SceneSpec; source: Parameters<typeof resolveScene>[1] } } | null;
  if (!el) return 'photo-fallback: sceneStageFor returned no stage';
  const ans = q.answer;
  const t = ans.kind === 'choice' ? q.choices?.find((c) => c.id === ans.correct)?.text.fr : undefined;
  const a = ans.value ?? (t !== undefined && t.trim() !== '' && !isNaN(Number(t.replace(',', '.'))) ? Number(t.replace(',', '.')) : t);
  const ok = sceneStageFor(quest, 'ok', ans.kind === 'order' ? ans.sequence : ans.kind === 'match' ? ans.pairs : a, null, true, q.id, reveal) as typeof el;
  try {
    resolveScene(el.props.spec, el.props.source);
    resolveScene(ok!.props.spec, { ...ok!.props.source }, { reveal: true });
  } catch (e) {
    return `photo-fallback: ${(e as Error).message.slice(0, 80)}`;
  }
  return null;
}
