'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/platform/motion';
import type { JourneyNode as JourneyNodeData, MediaRef, SkillId, WorldId } from '@/data/api/types';
import { JourneyNode } from '@/game/journey-node';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';

export type JourneyPathProps = {
  nodes: JourneyNodeData[];
  world: WorldId;
  currentSkillId?: SkillId | null;
  onSelectNode: (node: JourneyNodeData) => void;
  onPlay: () => void;
  accent?: string;
  /** Scene photos of the world. Nodes without their own quest icon take one, in turn, as a thumbnail. */
  scenes?: MediaRef[];
};

const ROW_H = 168; // px
const COLS = 5;

export function JourneyPath({ nodes, world, currentSkillId, onSelectNode, onPlay, accent, scenes = [] }: JourneyPathProps) {
  const t = useTranslations('game.journeyPath');
  const reduced = useReducedMotion();
  const currentRef = useRef<HTMLDivElement>(null);

  // Row order, then column. Row numbers may have gaps, so rank them.
  const placed = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => a.position.row - b.position.row || a.position.col - b.position.col);
    const rows = [...new Set(sorted.map((n) => n.position.row))];
    return sorted.map((n) => ({
      node: n,
      x: ((Math.max(0, Math.min(COLS - 1, n.position.col)) + 0.5) / COLS) * 100,
      y: rows.indexOf(n.position.row) * ROW_H + ROW_H / 2,
    }));
  }, [nodes]);

  const height = (new Set(nodes.map((n) => n.position.row)).size || 1) * ROW_H;

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }, [reduced, currentSkillId]);

  return (
    <div data-world={world} className="relative mx-auto w-full max-w-2xl pb-28">
      <div className="relative w-full" style={{ height }}>
        <svg
          aria-hidden
          className="absolute inset-0 size-full"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
        >
          {placed.slice(1).map((p, i) => {
            const a = placed[i];
            const mid = (a.y + p.y) / 2;
            const ahead = p.node.state === 'locked';
            const d = `M ${a.x} ${a.y} C ${a.x} ${mid}, ${p.x} ${mid}, ${p.x} ${p.y}`;
            const common = {
              d,
              fill: 'none',
              strokeWidth: 6,
              strokeLinecap: 'round' as const,
              vectorEffect: 'non-scaling-stroke' as const,
            };
            // Dashed when the next stop is locked, solid (and drawn in, 600 ms) otherwise: shape, not color alone.
            return ahead ? (
              <path key={p.node.skill_id} {...common} strokeDasharray="2 10" className="stroke-line" />
            ) : (
              <motion.path
                key={p.node.skill_id}
                {...common}
                className="stroke-brand"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
              />
            );
          })}
        </svg>
        <ol className="m-0 list-none p-0">
          {placed.map(({ node, x, y }, i) => {
            const isCurrent = node.skill_id === currentSkillId;
            const thumb = node.media ?? (scenes.length ? scenes[i % scenes.length] : undefined);
            return (
              <li
                key={node.skill_id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: y }}
              >
                <motion.div
                  ref={isCurrent ? currentRef : undefined}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                >
                  <JourneyNode node={node} current={isCurrent} accent={accent} thumb={thumb} onSelect={onSelectNode} />
                </motion.div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="pointer-events-none sticky bottom-24 mt-6 flex justify-center">
        <Button size="xl" className="pointer-events-auto shadow-3" iconLeft={<Icon name="play" size={24} />} onClick={onPlay}>
          {t('play')}
        </Button>
      </div>
    </div>
  );
}
