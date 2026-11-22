'use client';
import type { CSSProperties } from 'react';
import { Layer } from '../Layer';
import { ClockFace, Drone, Hand, Rocket, Station } from '../kit/espace';
import { Glyph, GlyphDefs } from '../kit/glyphs';
import { Motes, Sprite } from '../kit/Sprite';
import type { ArchetypeProps } from '../registry';
import './control-clock.css';

/**
 * espace.control-clock: a huge wall clock in a mission control room, a tall window with a white rocket on its pad (steam plume curling behind the clock)
 * and a small supply drone crossing (brief espace.horloge.001). The hands come from the question's clock data for ANY hh:mm: nothing time-like is typed here.
 * Right: the hour hand glows, chime rings leave the clock, the rocket rises a few metres and settles, the drone smiles.
 * Gentle miss: the hands dim, the long hand pulses, then the short one is ringed, with two tag icons (short bar, long bar) pulsing in turn.
 */
export default function ControlClock({ scene }: ArchetypeProps) {
  const hour = scene.values.hour;
  const minute = scene.values.minute ?? 0;
  if (hour === undefined) throw new Error('espace.control-clock needs an hour');
  const hourA = ((hour % 12) + minute / 60) * 30;
  const minA = minute * 6;
  const t = ((hour % 12) * 30 * Math.PI) / 180;
  const numStyle = { left: `${50 + Math.sin(t) * 31}%`, top: `${50 - Math.cos(t) * 31}%` } as CSSProperties;
  // the window view comes from the scene setting: a cargo rocket approaching or docked at the station (night control room), or the pad by day
  const view = scene.spec.archetype === 'medecine.clinic-clock' ? 'clinic' : /approach/.test(scene.spec.setting) ? 'approach' : /dock/.test(scene.spec.setting) ? 'docked' : 'pad';
  const space = view === 'approach' || view === 'docked';
  return (
    <div className="ck-root" data-view={view}>
      <Layer z={-170} par={-1} drift="a">
        <div className="ck-sky">
          {space ? (
            <>
              <i className="ck-planet" />
              <Station />
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
              <div className="ck-rocket-wrap nx-anim">
                <Rocket />
                <i className="ck-flame" />
              </div>
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
        <div className="ck-frame" />
        <div className="ck-console">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <i key={k} className="nx-twinkle" style={{ '--k': k, '--d': `${k * 0.9}s` } as CSSProperties} />
          ))}
        </div>
      </Layer>
      <Layer z={0}>
        <Sprite x={-14} y={-1} w={36}>
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
            <div className="ck-tag ck-tag-a mv-pulse" style={{ '--i': 0 } as CSSProperties}>
              <b />
            </div>
            <div className="ck-tag ck-tag-b mv-pulse" style={{ '--i': 1 } as CSSProperties}>
              <b />
            </div>
          </div>
        </Sprite>
        <Motes n={5} colour="rgb(255 240 200 / 0.9)" />
      </Layer>
    </div>
  );
}
