'use client';
import dynamic from 'next/dynamic';

// Client only: the outcome line is picked at random on mount, so a server render would not match
export const QaQuestionClient = dynamic(() => import('./QaQuestion').then((m) => m.QaQuestion), { ssr: false });
