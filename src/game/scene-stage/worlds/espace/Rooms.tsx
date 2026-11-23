import type { CSSProperties } from 'react';
import { Layer } from '../../Layer';
import { Motes } from '../../kit/Sprite';
import { ClockFace, Hand, Rocket } from '../../kit/espace';
import { BigStation } from './kit';
import './espace.css';

/** The six rooms of the espace world. Each is two lanes: the far wall with its view (stars, planet, dome) and the mid set (consoles, crates, beds, dunes). Pure CSS shapes, about 30 nodes. */
export const ES_ROOMS = ['control', 'cargo', 'greenhouse', 'quarters', 'exterior', 'surface'] as const;
export type EsRoom = (typeof ES_ROOMS)[number];
export const asRoom = (r: string | undefined): EsRoom => ((ES_ROOMS as readonly string[]).includes(r ?? '') ? (r as EsRoom) : 'control');

const bits = (n: number, f: (k: number) => CSSProperties) => Array.from({ length: n }, (_, k) => <i key={k} style={f(k)} />);

export function RoomLayers({ room, lamp = true, clock = false }: { room: EsRoom; lamp?: boolean; clock?: boolean }) {
  return (
    <>
      <Layer z={-170} par={-0.9} drift="a">
        <div className="rm rm-far" data-room={room}>
          <i className="rm-wall" />
          <i className="rm-view">
            <i className="rm-stars" />
            <i className="rm-orb" />
            <i className="rm-orb2" />
          </i>
          {room === 'control' && <i className="rm-screen" />}
          {room === 'control' && clock && <div className="rm-clock"><ClockFace /><Hand kind="hour" angle={0} /><Hand kind="min" angle={0} /></div>}
          {room === 'cargo' && <i className="rm-door" />}
          {room === 'greenhouse' && <i className="rm-dome" />}
          {room === 'quarters' && <i className="rm-bunk" />}
          {room === 'exterior' && <i className="rm-earth" />}
          {room === 'exterior' && <div className="rm-bigstation"><BigStation /></div>}
          {room === 'surface' && <i className="rm-dune" />}
        </div>
      </Layer>
      <Layer z={-80} par={-0.4} drift="b">
        <div className="rm rm-mid" data-room={room}>
          <i className="rm-floor" />
          {room === 'control' && <><i className="rm-desk" /><span className="rm-lights">{bits(6, (k) => ({ '--k': k } as CSSProperties))}</span><i className="rm-strip" /></>}
          {room === 'cargo' && <><i className="rm-stack rm-s1" /><i className="rm-stack rm-s2" /><i className="rm-stack rm-s3" /><i className="rm-rail" /><i className="rm-beacon" /></>}
          {room === 'greenhouse' && <><i className="rm-bed rm-b1" /><i className="rm-bed rm-b2" />{[0, 1, 2, 3, 4, 5, 6].map((k) => <b key={k} className="rm-leaf" style={{ '--k': k } as CSSProperties} />)}<i className="rm-grow" /></>}
          {room === 'quarters' && <><i className="rm-locker" /><i className="rm-hang rm-h1" /><i className="rm-hang rm-h2" /><i className="rm-lamp" /></>}
          {room === 'exterior' && <i className="rm-tether" />}
          {room === 'surface' && <><i className="rm-base" /><i className="rm-mast" /><i className="rm-rover" /><div className="rm-rocket"><Rocket /></div></>}
        </div>
      </Layer>
      {lamp && <Layer z={-30} par={0.2} lite={false}><Motes n={5} colour="rgb(255 240 200 / 0.8)" /></Layer>}
    </>
  );
}
