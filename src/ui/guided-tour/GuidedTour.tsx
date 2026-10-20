'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import 'driver.js/dist/driver.css';
import './GuidedTour.css';
import { useReducedMotion } from '@/platform/motion';
import { useSound } from '@/platform/audio';

export type GuidedTourStep = {
  /** CSS selector of the element to highlight. Without it the popover is centered. */
  target?: string;
  title: string;
  description: string;
};

export type GuidedTourProps = {
  steps: GuidedTourStep[];
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
};

/** Step-by-step highlight tour (driver.js) that reports close and finish. */
export function GuidedTour({ steps, open, onClose, onFinish }: GuidedTourProps) {
  const t = useTranslations('ui.guidedTour');
  const reduced = useReducedMotion();
  const { play } = useSound();
  const playRef = useRef(play);
  const latest = useRef({ steps, onClose, onFinish });
  useEffect(() => {
    latest.current = { steps, onClose, onFinish };
    playRef.current = play;
  });

  const labels = {
    next: t('next'),
    back: t('back'),
    skip: t('skip'),
    done: t('done'),
    progress: t('progress', { current: '{{current}}', total: '{{total}}' }),
  };
  const { next, back, skip, done, progress } = labels;

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let finished = false;
    let instance: { destroy: () => void } | undefined;
    // A step without a target makes driver stand in a dummy div and put button-only aria attributes on it (axe: aria-allowed-attr)
    const ATTRS = ['aria-haspopup', 'aria-expanded', 'aria-controls'];
    const clean = () => {
      const el = document.getElementById('driver-dummy-element');
      if (el) for (const a of ATTRS) el.removeAttribute(a);
    };
    const mo = new MutationObserver(clean);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ATTRS });

    void import('driver.js').then(({ driver }) => {
      if (disposed) return;
      const d = driver({
        animate: !reduced,
        smoothScroll: !reduced,
        allowKeyboardControl: true,
        showProgress: true,
        progressText: progress,
        nextBtnText: next,
        prevBtnText: back,
        doneBtnText: done,
        closeBtnLabel: skip,
        overlayOpacity: 0.85,
        stagePadding: 8,
        stageRadius: 12,
        popoverClass: 'nx-tour',
        onPopoverRender: (popover) => {
          popover.wrapper.setAttribute('role', 'dialog');
          popover.wrapper.setAttribute('aria-label', popover.title.textContent ?? '');
          popover.closeButton.setAttribute('aria-label', skip);
        },
        onNextClick: () => {
          playRef.current('switch');
          d.moveNext();
        },
        onPrevClick: () => {
          playRef.current('back');
          d.movePrevious();
        },
        onDoneClick: () => {
          finished = true;
          latest.current.onFinish();
          d.destroy();
        },
        onCloseClick: () => {
          if (!finished) {
            finished = true;
            latest.current.onClose();
          }
          d.destroy();
        },
        onDestroyed: () => {
          if (!finished && !disposed) latest.current.onClose();
        },
        steps: latest.current.steps.map((s) => ({
          element: s.target,
          popover: { title: s.title, description: s.description },
        })),
      });
      instance = d;
      d.drive();
    });

    return () => {
      disposed = true;
      mo.disconnect();
      instance?.destroy();
    };
  }, [open, reduced, next, back, skip, done, progress]);

  return null;
}
