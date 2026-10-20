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

/** Admin name for the audit log: letters, digits and . _ @ - only, max 40; the shared password has no user list, so the name is self-declared. */
export const cleanActor = (v: unknown) => (typeof v === 'string' ? v.replace(/[^\w.@ -]/g, '').trim().slice(0, 40) : '') || 'admin';

export function makeToken(actor?: string) {
  const p = Buffer.from(JSON.stringify({ actor: cleanActor(actor), exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString('base64url');
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

/** The actor stored in a session token ('admin' when none). */
export function tokenActor(token: string | undefined) {
  try {
    return cleanActor((JSON.parse(Buffer.from(token!.split('.')[0], 'base64url').toString('utf8')) as { actor?: string }).actor);
  } catch {
    return 'admin';
  }
}
