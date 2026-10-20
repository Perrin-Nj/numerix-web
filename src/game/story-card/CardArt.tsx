import type { Art } from './art';

const METAL = {
  gold: ['#fff3b0', '#d99a1e', '#b9770e'],
  silver: ['#ffffff', '#9aa5b1', '#6b7785'],
  bronze: ['#ffd9b0', '#b8672a', '#8a4a1a'],
} as const;
export const metalGradient = (m: Art['metal']) => `conic-gradient(from 20deg, ${METAL[m][0]}, ${METAL[m][1]}, ${METAL[m][0]}, ${METAL[m][2]}, ${METAL[m][0]})`;
