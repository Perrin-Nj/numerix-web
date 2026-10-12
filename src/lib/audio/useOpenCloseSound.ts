'use client';
import { useEffect, useRef } from 'react';
import { useSound } from './provider';

/** Plays `open` when `open` turns true and `close` when it turns false. */
export function useOpenCloseSound(open: boolean) {
  const { play } = useSound();
  const prev = useRef(false);
  useEffect(() => {
    if (prev.current === open) return;
    prev.current = open;
    play(open ? 'open' : 'close');
  }, [open, play]);
}
