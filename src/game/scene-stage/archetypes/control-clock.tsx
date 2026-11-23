'use client';
import type { CSSProperties } from 'react';
import { Layer } from '../Layer';
import { ClockFace, Drone, Hand, Rocket } from '../kit/espace';
import { BigStation, Crew } from '../worlds/espace/kit';
import { Glyph, GlyphDefs } from '../kit/glyphs';
import { Motes, Sprite } from '../kit/Sprite';
import type { ArchetypeProps } from '../registry';
import '../worlds/espace/espace.css';
import './control-clock.css';

/**
 * espace.control-clock: a huge wall clock in a mission control room, a tall window with a white rocket on its pad (steam plume curling behind the clock)
 * and a small supply drone crossing (brief espace.horloge.001). The hands come from the question's clock data for ANY hh:mm: nothing time-like is typed here.
 * Right: the hour hand glows, chime rings leave the clock, the rocket rises a few metres and settles, the drone smiles.
 * Gentle miss: the hands dim, the long hand pulses, then the short one is ringed, with two tag icons (short bar, long bar) pulsing in turn.
 */
export default function ControlClock({ scene }: ArchetypeProps) {
  // a question asking the finishing time moves the hour hand to it at the reveal (values.endHour is answer-bound)
  const hour = (scene.revealed ? scene.values.endHour : undefined) ?? scene.values.hour;
  const spanEnd = scene.revealed ? scene.values.spanEnd : undefined; // a meeting that ends at a stated hour: the reveal shows start to end
  const minute = scene.revealed && scene.values.endHour !== undefined ? 0 : (scene.values.minute ?? 0);
  if (hour === undefined) throw new Error('espace.control-clock needs an hour');
  const hourA = ((hour % 12) + minute / 60) * 30;
  const minA = minute * 6;
  const t = ((hour % 12) * 30 * Math.PI) / 180;
  const numStyle = { left: `${50 + Math.sin(t) * 31}%`, top: `${50 - Math.cos(t) * 31}%` } as CSSProperties;
  // the window view comes from the scene setting: a cargo rocket approaching or docked at the station (night control room), or the pad by day
  const view = scene.spec.archetype === 'medecine.clinic-clock' ? 'clinic' : /approach/.test(scene.spec.setting) ? 'approach' : /dock/.test(scene.spec.setting) ? 'docked' : 'pad';
  const space = view === 'approach' || view === 'docked';
  const rockets = Math.max(1, Math.min(6, scene.props.rockets?.count ?? 1));
  return (
    <div className="ck-root" data-view={view}>
      <Layer z={-170} par={-1} drift="a">
        <div className="ck-sky">
          {space ? (
            <>
              <i className="ck-planet" />
              <BigStation />
            </>
          ) : (
            <>
              <i className="ck-sun" />
              <i className="ck-hills" />
              <i className="ck-tower" />
              <i className="ck-pad" />
            </>
          )}
        </div>
      </Layer>
      <Layer z={-110} par={-0.7} drift="b">
        <div className="ck-clip">
          {space ? (
            <div className="ck-cargo nx-anim">
              <div className="ck-cargo-in nx-float">
                <Rocket />
                <i className="ck-flame ck-thrust" />
              </div>
            </div>
          ) : (
            <>
              {view === 'clinic' ? (
                <div className="ck-pet nx-anim">
                  <GlyphDefs names={['dog']} />
                  <div className="nx-float"><Glyph g="dog" /></div>
                </div>
              ) : (
              <>
                {Array.from({ length: rockets }, (_, k) => (
                  <div key={k} className="ck-rocket-wrap nx-anim" style={{ '--rk': k, '--rn': rockets } as CSSProperties}>
                    <Rocket />
                    <i className="ck-flame" />
                  </div>
                ))}
              </>
              )}
              {[0, 1, 2, 3, 4].map((k) => (
                <i key={k} className="ck-puff nx-anim" style={{ '--k': k } as CSSProperties} />
              ))}
              <div className="ck-drone nx-anim">
                <div className="ck-drone-in nx-float">
                  <Drone />
                </div>
              </div>
            </>
          )}
        </div>
      </Layer>
      <Layer z={-60} par={-0.35}>
        <div className="ck-wall" />
        <GlyphDefs names={[view === 'clinic' ? 'cat' : 'astronaut']} />
        <div className="ck-radar nx-anim" aria-hidden><i /></div>
        <div className="ck-monitors" aria-hidden>
          {[0, 1, 2].map((k) => (
            <i key={k} className="nx-twinkle" style={{ '--d': `${k * 1.3}s` } as CSSProperties} />
          ))}
        </div>
        <div className="ck-frame" />
        <div className="ck-console">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <i key={k} className="nx-twinkle" style={{ '--k': k, '--d': `${k * 0.9}s` } as CSSProperties} />
          ))}
        </div>
      </Layer>
      <Layer z={0}>
        <Sprite x={-20} y={-1} w={36}>
          <div className="nx-shadow ck-shadow" />
          <div className="ck-clock">
            <ClockFace />
            <div className="nx-gloss ck-gloss" />
            <i className="mv-ring ck-ring" style={{ '--i': 0 } as CSSProperties} />
            <i className="mv-ring ck-ring" style={{ '--i': 1 } as CSSProperties} />
            <i className="ck-num" style={numStyle} />
            <Hand kind="hour" angle={hourA} />
            <Hand kind="min" angle={minA} />
            <i className="ck-cap" />
            {scene.revealed && <b className="ck-digital">{hour}:{String(minute).padStart(2, '0')}{spanEnd !== undefined ? ` → ${spanEnd}:00` : ''}</b>}
          </div>
        </Sprite>
        <Sprite x={32} y={23.5} w={11} anchor="feet" className="ck-crew-sprite">
          <div className="ck-crew nx-anim">
            <div className="nx-shadow ck-crew-shadow" />
            <div className="ck-crew-in nx-float">
              {view === 'clinic' ? <Glyph g="cat" i={1} /> : <Crew i={1} className="ck-crew-fig" />}
            </div>
          </div>
        </Sprite>
        <Motes n={5} colour="rgb(255 240 200 / 0.9)" />
      </Layer>
    </div>
  );
}
