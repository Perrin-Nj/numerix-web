// Library of hook, right-answer and wrong-answer moves. Each id is implemented once (kit/moves.css and the world kits) and reviewed once;
// a spec only picks ids. Wrong-answer moves must be as visible as the right ones: instructive, gentle, never red, never a shake.
export const HOOK_IDS = ['breathe-gaps', 'thought-cloud', 'plume-curl', 'sweep-hands', 'drop-in', 'pop-in', 'light-sweep', 'ghost-finger'] as const;
export const OK_IDS = ['flags-pop', 'fill-hop', 'chime-rocket', 'hop-wave', 'regroup-glow'] as const;
export const KO_IDS = ['step-back-count', 'ghost-sum', 'check-hands', 'recount', 'nod-count'] as const;
export type HookId = (typeof HOOK_IDS)[number];
export type OkId = (typeof OK_IDS)[number];
export type KoId = (typeof KO_IDS)[number];
