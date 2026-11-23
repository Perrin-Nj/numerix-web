'use client';
import { Item } from './kit';
import { Frame, Plate, css, defOf, nums } from './parts';
import type { ArchetypeProps } from '../../registry';
import './espace.css';

/**
 * espace.hop-line: a rocket that hops along a line (the number line of the seed, or a route in kilometres, or a span of time).
 * Modes (setting `es:hop:<glyph>:<room>:<mode>`): line (min and max and an optional marked value from the question's number line; a fallen card between two
 * numbers when there is no mark), route (two legs of a trip, or a trip with a done part and a part still to go, drawn in proportion to the bound numbers),
 * span (a bar from a start hour to an end hour, or a length of minutes or hours, with unlabelled hour ticks so nothing is solved on the picture).
 * Right: the rocket hops to the answer in an arc and its tick lights. Gentle miss: the two nearest marks glow and the rocket nods between them.
 */
const pct = (v: number, lo: number, hi: number) => `${(Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * 100).toFixed(2)}%`;
const pad = (m: number) => String(m).padStart(2, '0');

export default function HopLine({ scene }: ArchetypeProps) {
  const d = defOf(scene);
  const v = scene.visual?.data as { min?: number; max?: number; step?: number; labels?: number[]; arrow?: number } | undefined;
  const N = nums(scene);
  const R = scene.revealed;
  const ans = scene.values.ans;
  const rocket = d.g;
  const glyphs = [rocket, 'star', 'crew'];
  let body;
  if (d.x === 'line' && v?.min !== undefined && v.max !== undefined) {
    const { min, max } = v;
    const steps = v.step ? Math.round((max - min) / v.step) : 10;
    const marked = v.arrow ?? (N.length === 1 ? N[0] : undefined);
    const lo = N[0];
    const hi = N[1];
    const gap = marked === undefined && lo !== undefined && hi !== undefined;
    const at = marked ?? (gap ? (lo! + hi!) / 2 : min);
    body = (
      <div className="hl-line" style={css({ '--steps': steps })}>
        <i className="hl-track" />
        <i className="hl-ticks" style={css({ '--steps': steps })} />
        {(v.labels ?? [min, max]).map((l) => (
          <b key={l} className="hl-lab" style={{ left: pct(l, min, max) }}>{l}</b>
        ))}
        {gap && (
          <>
            <b className="es-card hl-card" style={{ left: pct(lo!, min, max) }}>{lo}</b>
            <b className="es-card hl-card" style={{ left: pct(hi!, min, max) }}>{hi}</b>
            <b className="es-card hl-card hl-fallen" style={{ left: pct(at, min, max) }}>{R && ans !== undefined ? ans : '?'}</b>
          </>
        )}
        {!gap && marked !== undefined && (
          <div className="hl-mark" style={{ left: pct(marked, min, max) }}>
            <Plate v={marked} tone="n" />
            <i className="hl-pin" />
          </div>
        )}
        {marked !== undefined && (
          <>
            <i className="hl-end mv-pulse" style={{ left: '0%', '--i': 0 } as never} />
            <i className="hl-end mv-pulse" style={{ left: '100%', '--i': 1 } as never} />
          </>
        )}
        {!gap && (
        <div className={`hl-rocket ${R && ans !== undefined ? 'hl-go' : ''}`} style={css({ '--from': pct(at, min, max), '--to': pct(R && ans !== undefined ? ans : at, min, max) })}>
          <div className="hl-hop"><Item g={rocket} i={1} /></div>
        </div>
        )}
        {R && ans !== undefined && !gap && <div className="hl-mark hl-ans" style={{ left: pct(ans, min, max) }}><Plate v={ans} tone="n" /></div>}
        {R && ans !== undefined && <b className="hl-land" style={{ left: pct(ans, min, max) }}><svg viewBox="0 0 10 10" width="1em" height="1em" aria-hidden="true" fill="currentColor"><path d="M5 .6l1.3 2.9 3.1.3-2.3 2.1.7 3.1L5 7.4 2.2 9l.7-3.1L.6 3.8l3.1-.3z" /></svg></b>}
      </div>
    );
  } else if (d.x === 'two') {
    const [far = 1, near = 0] = N;
    const f = Math.max(0.1, Math.min(0.9, near / far));
    body = (
      <div className="hl-route" style={css({ '--f': f })}>
        <i className="hl-earth" />
        <i className="hl-bar hl-leg1" />
        <i className="hl-bar hl-leg2 hl-dash" />
        <b className="hl-km hl-k1"><span>{near}</span> km</b>
        <b className="hl-km hl-k2"><span>{far}</span> km</b>
        <div className="hl-probe" style={css({ '--f': f })}>
          <div className="hl-hop"><Item g="module" i={1} /></div>
        </div>
        <div className="hl-probe hl-far">
          <div className="hl-hop"><Item g={rocket} i={2} /></div>
        </div>
      </div>
    );
  } else if (d.x === 'two') {
    const [far = 1, near = 0] = N;
    const f = Math.max(0.1, Math.min(0.9, near / far));
    body = (
      <div className="hl-route" style={css({ '--f': f })}>
        <i className="hl-earth" />
        <i className="hl-bar hl-leg1" />
        <i className="hl-bar hl-leg2 hl-dash" />
        <b className="hl-km hl-k1"><span>{near}</span> km</b>
        <b className="hl-km hl-k2"><span>{far}</span> km</b>
        <div className="hl-probe" style={css({ '--f': f })}>
          <div className="hl-hop"><Item g="module" i={1} /></div>
        </div>
        <div className="hl-probe hl-far">
          <div className="hl-hop"><Item g={rocket} i={2} /></div>
        </div>
      </div>
    );
  } else if (d.x.startsWith('route')) {
    const remain = d.x === 'route-remain';
    const [x0 = 0, x1 = 0] = N;
    const total = remain ? x0 : x0 + x1;
    const first = remain ? x1 : x0;
    const f = Math.max(0.12, Math.min(0.88, first / total));
    body = (
      <div className="hl-route" style={css({ '--f': f })}>
        <i className="hl-earth" />
        <i className="hl-bar hl-leg1" />
        <i className={`hl-bar hl-leg2 ${remain ? 'hl-dash' : ''}`} />
        <i className="hl-dest" />
        <b className="hl-km hl-k1"><span>{remain ? x1 : x0}</span> km</b>
        <b className="hl-km hl-k2"><span>{remain ? '?' : x1}</span> km</b>
        <div className="hl-probe" style={css({ '--f': f })}>
          <div className="hl-hop"><Item g={rocket} i={2} /></div>
        </div>
        {remain && <b className="hl-km hl-kt"><span>{x0}</span> km</b>}
        {R && <Plate v={remain ? `${x0 - x1}` : `${x0 + x1}`} tone="n" className="es-total" />}
      </div>
    );
  } else {
    const [h0 = 0, m0 = 0, h1, m1] = N;
    const dur = d.x === 'span-dur';
    const clockSpan = d.x === 'span-clock' && h1 !== undefined;
    const lenH = dur ? (h1 ?? 0) / 60 : clockSpan ? h1! + (m1 ?? 0) / 60 - (h0 + m0 / 60) : d.x === 'span-min' ? h0 / 60 : h0 + (m0 && m0 <= 59 && d.x === 'span-hm' ? m0 / 60 : 0);
    const hours = Math.max(1, Math.ceil(lenH));
    const label = dur ? `${h0} h ${pad(m0)} → ${h1} min` : clockSpan ? `${h0} h ${pad(m0)}` : d.x === 'span-hm' ? `${h0} h ${pad(m0)}` : d.x === 'span-min' ? `${h0} min` : `${h0} h`;
    // reveal: hour hops along a clock span (and the duration), or one badge per message of an "every k minutes" span (and the count)
    const every = d.x === 'span-h' && N[1] ? N[1] : 0;
    const spanMin = every ? 0 : Math.round(lenH * 60); // every span with a length hops hour by hour at the reveal, not only a clock span
    const hops = spanMin > 0 ? [...Array.from({ length: Math.floor(spanMin / 60) }, (_, k) => ({ at: (k + 0.5) / hours, t: '+1 h' })), ...(spanMin % 60 ? [{ at: (Math.floor(spanMin / 60) + (spanMin % 60) / 120) / hours, t: `+${spanMin % 60} min` }] : [])] : [];
    const msgs = every ? Array.from({ length: Math.floor((h0 * 60) / every) }, (_, k) => ((k + 1) * every) / 60 / hours) : [];
    body = (
      <div className="hl-span" style={css({ '--hours': hours, '--len': lenH / hours })}>
        {R && hops.map((h, k) => <b key={`h${k}`} className="ch-step hl-hopchip" style={css({ '--at': h.at, '--i': k })}>{h.t}</b>)}
        {R && msgs.map((at, k) => (
          <i key={`m${k}`} className="hl-msg" style={css({ '--at': at, '--i': k })}><b>{k + 1}</b></i>
        ))}
        {R && (hops.length > 0 || msgs.length > 0) && (
          <div className="hl-probe hl-bot hl-arrive">
            <div className="hl-hop"><Item g={rocket} i={3} /></div>
          </div>
        )}
        {every > 0 && <b className="hl-km hl-every"><span>{every} min</span></b>}
        {R && (clockSpan || (every > 0 && ans !== undefined)) && <Plate v={clockSpan ? `${Math.floor(spanMin / 60)} h ${pad(spanMin % 60)}` : `= ${ans}`} tone="n" className="es-total" />}
        <i className="hl-span-track" />
        <i className="hl-span-bar" />
        <i className="hl-ticks hl-hourticks" style={css({ '--steps': hours })} />
        <div className={`hl-probe hl-bot ${R && (hops.length > 0 || msgs.length > 0) ? 'hl-gone' : ''}`} style={css({ '--f': 0 })}>
          <div className="hl-hop"><Item g={rocket} i={3} /></div>
        </div>
        {clockSpan || dur ? (
          <>
            <b className="hl-km hl-k1"><span>{h0} h {pad(m0)}</span></b>
            <b className="hl-km hl-k2"><span>{dur ? `${h1} min` : `${h1} h ${pad(m1 ?? 0)}`}</span></b>
          </>
        ) : (
          <b className="hl-km hl-k1 hl-ksolo"><span>{label}</span></b>
        )}
        <i className="hl-dest" />
      </div>
    );
  }
  return (
    <Frame scene={scene} glyphs={[...glyphs, 'module']}>
      {body}
    </Frame>
  );
}
