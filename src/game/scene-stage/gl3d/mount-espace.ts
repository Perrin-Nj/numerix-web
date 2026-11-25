// The lazy chunk: three.js, the engine and the scene builders. Host.tsx imports this only when a 3D scene is actually drawn.
import type { Ctx } from './engine';
import { mountWith } from './mount-core';
import type { BayPlan } from './plan';
import { tags, tanks } from './scenes/bay';
import { gauge } from './scenes/gauge';
import { wing } from './scenes/wing';
import { chain, cols } from './scenes/chain';
import { route, span } from './scenes/route';
import { clock } from './scenes/clock';
import { pile } from './scenes/pile';
import { track } from './scenes/track';
import { bigClock, heapShare, map2d, packets, rooms, stones, tank1 } from './scenes/story';

function build(c: Ctx, p: BayPlan) {
  c.focus = true; // every space scene is a focused picture: the gantry and the window never compete with the objects
  switch (p.kind) {
    case 'tanks': return tank1(c, p);
    case 'tags': return tags(c, p);
    case 'share': return heapShare(c, p);
    case 'pile': return p.mode === 'packs' ? packets(c, p) : p.mode === 'pairs' ? packets(c, { ...p, mode: 'packs', b: 2, c: 0 }) : pile(c, p);
    case 'track': return p.mark !== null && p.gap === null && (p.hi - p.lo) / p.steps <= 1.5 ? stones(c, p) : track(c, p);
    case 'clock': return p.view === 'pad' || p.dur ? bigClock(c, p) : clock(c, p);
    case 'grid': return p.rows === 1 && p.cols >= 2 && p.mode !== 'rover' ? rooms(c, p) : map2d(c, p);
    case 'gauge': return gauge(c, p);
    case 'wing': return wing(c, p);
    case 'chain': return chain(c, p);
    case 'cols': return cols(c, p);
    case 'route': return route(c, p);
    case 'span': return span(c, p);
  }
}

export const mountScene = mountWith(build);
