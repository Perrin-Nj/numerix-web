'use client';
import { reportError } from '@/platform/errors/bridge';
import { postPushSubscription } from '@/data/hooks/platform';

export type Permission = NotificationPermission | 'unsupported';

export const browserNotificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;
export const getPermission = (): Permission => (browserNotificationsSupported() ? Notification.permission : 'unsupported');

/** Must be called from a tap. Never call it on load. */
export async function requestPermission(): Promise<Permission> {
  if (!browserNotificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

const SEEN_KEY = 'nx:notified';
const memory = new Set<string>();

/** Each id is shown once per browser. Falls back to memory when storage is blocked. */
function firstTime(id: string): boolean {
  if (memory.has(id)) return false;
  memory.add(id);
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
    if (seen.includes(id)) return false;
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id].slice(-200)));
  } catch {
    // storage blocked: the memory set above still stops repeats during this visit
  }
  return true;
}

/** Shows a system notification when permission was granted. No-op otherwise (the in-app list always has it). */
export async function showBrowserNotification(n: { id: string; title: string; body: string }) {
  if (getPermission() !== 'granted' || !firstTime(n.id)) return;
  const options: NotificationOptions = { body: n.body, tag: n.id, icon: '/icons/icon-192.png', data: { url: '/parent' } };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(n.title, options);
    else new Notification(n.title, options);
  } catch (e) {
    reportError(e);
  }
}

export type PushFailure = 'unsupported' | 'permission' | 'no_key' | 'no_endpoint' | 'failed';
/**
 * Error raised when push subscription fails. The reason says why: unsupported browser, permission not granted,
 * missing VAPID key, backend without the subscribe endpoint, or any other failure; the original cause is
 * attached.
 */
export class PushError extends Error {
  readonly reason: PushFailure;
  constructor(reason: PushFailure, cause?: unknown) {
    super(reason, { cause });
    this.name = 'PushError';
    this.reason = reason;
  }
}

function keyBytes(base64Url: string) {
  const pad = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Registers this browser for background push and sends the subscription to POST /v1/push/subscribe (BE-26).
 * Throws PushError with a reason the caller shows to the user. Needs permission already granted and a VAPID public key.
 */
export async function subscribeToPush(vapidPublicKey: string | undefined): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new PushError('unsupported');
  if (getPermission() !== 'granted') throw new PushError('permission');
  if (!vapidPublicKey) throw new PushError('no_key');
  let sub: PushSubscription;
  try {
    const reg = await navigator.serviceWorker.ready;
    sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) as BufferSource }));
  } catch (e) {
    throw new PushError('failed', e);
  }
  try {
    await postPushSubscription(sub.toJSON());
  } catch (e) {
    const status = (e as { status?: number }).status;
    throw new PushError(status === 404 || status === 405 || status === 501 ? 'no_endpoint' : 'failed', e);
  }
}
