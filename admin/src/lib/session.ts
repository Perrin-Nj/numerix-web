import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env';

export const COOKIE = 'nx_admin';
export const SESSION_SECONDS = 8 * 60 * 60;

const sign = (p: string) => createHmac('sha256', env().ADMIN_SESSION_SECRET).update(p).digest('base64url');

export function safeEqual(a: string, b: string) {
  const ha = createHmac('sha256', 'cmp').update(a).digest();
  const hb = createHmac('sha256', 'cmp').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function makeToken() {
  const p = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString('base64url');
  return `${p}.${sign(p)}`;
}

export function verifyToken(token: string | undefined) {
  if (!token) return false;
  const [p, s] = token.split('.');
  if (!p || !s || !safeEqual(s, sign(p))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as { exp: number };
    return typeof exp === 'number' && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}
