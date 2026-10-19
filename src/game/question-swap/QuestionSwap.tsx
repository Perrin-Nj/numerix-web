'use client';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '@/platform/motion';

export type QuestionSwapProps = {
  /** Changes with each question (the beat id). The old content leaves, the new one enters. */
  id: string;
  children: ReactNode;
  className?: string;
};

/**
 * Enter and exit between questions: the old card fades up and out (160 ms), the new one rises in with a spring
 * (about 350 ms). Under reduced motion both are a 150 ms fade, with no movement.
 */
export function QuestionSwap({ id, children, className }: QuestionSwapProps) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        className={className}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, y: -12, transition: { duration: 0.16 } }}
        transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 32 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
