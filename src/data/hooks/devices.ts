'use client';
/** Known devices and passkeys of the parent (BE-64, BE-65, BE-66). Only the Go backend serves these routes. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/data/api/client';
import type { components } from '@/data/api/schema';
import { keys } from './keys';

export type KnownDevice = components['schemas']['Device'];
export type PasskeyInfo = components['schemas']['Passkey'];

/** React Query keys for the parent device and passkey lists. */
export const deviceKeys = {
  devices: ['account-devices'] as const,
  passkeys: ['account-passkeys'] as const,
};

/** True when this browser can create passkeys (the JSON helpers shipped in 2024 and 2025 browsers). */
export function passkeysSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PublicKeyCredential' in window &&
    typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function'
  );
}

/** Query for GET /account/devices. Off unless the server owns state. */
export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.devices,
    queryFn: () => unwrap(api.GET('/account/devices')).then((r) => r.items),
  });
}

/** Mutation for DELETE /account/devices/{id}: forgets a device, then refreshes the list. */
export function useRevokeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => unwrap(api.DELETE('/account/devices/{deviceId}', { params: { path: { deviceId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: deviceKeys.devices }),
  });
}

/** Query for GET /account/passkeys. */
export function usePasskeys() {
  return useQuery({
    queryKey: deviceKeys.passkeys,
    queryFn: () => unwrap(api.GET('/account/passkeys')).then((r) => r.items),
  });
}

/** Mutation for DELETE /account/passkeys/{id}. */
export function useDeletePasskey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (passkeyId: string) => unwrap(api.DELETE('/account/passkeys/{passkeyId}', { params: { path: { passkeyId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: deviceKeys.passkeys }),
  });
}

/**
 * Adds a passkey: begin on the server, ask the browser (fingerprint, face or device code), finish on the server.
 * Resolves to null when the parent cancels the browser prompt (not an error).
 */
export function useAddPasskey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nickname?: string): Promise<PasskeyInfo | null> => {
      const begin = await unwrap(api.POST('/auth/passkeys/register/begin'));
      const options = (begin.options as { publicKey: PublicKeyCredentialCreationOptionsJSON }).publicKey;
      let credential: PublicKeyCredential | null;
      try {
        credential = (await navigator.credentials.create({
          publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
        })) as PublicKeyCredential | null;
      } catch (e) {
        if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return null; // cancelled
        throw e;
      }
      if (!credential) return null;
      return unwrap(
        api.POST('/auth/passkeys/register/finish', {
          body: { session_id: begin.session_id, nickname, credential: credential.toJSON() as Record<string, unknown> },
        }),
      );
    },
    meta: { handled: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: deviceKeys.passkeys }),
  });
}

/**
 * Opens the app on a known device (POST /auth/device, BE-64). The proxy turns the answer into the session
 * cookies. Resolves to false when this browser is not known (204 from the proxy, or 401), which is the normal case, not an error.
 */
export function useDeviceLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      const { response } = await api.POST('/auth/device');
      return response.ok && response.status !== 204;
    },
    meta: { handled: true },
    onSuccess: (opened) => {
      if (opened) qc.invalidateQueries({ queryKey: keys.session });
    },
  });
}

/**
 * Signs in with a passkey: begin on the server, ask the browser, finish on the server (the proxy sets the
 * session cookies). Resolves to false when the parent cancels the browser prompt.
 */
export function usePasskeyLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      const begin = await unwrap(api.POST('/auth/passkeys/login/begin'));
      const options = (begin.options as { publicKey: PublicKeyCredentialRequestOptionsJSON }).publicKey;
      let credential: PublicKeyCredential | null;
      try {
        credential = (await navigator.credentials.get({
          publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
        })) as PublicKeyCredential | null;
      } catch (e) {
        if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return false; // cancelled
        throw e;
      }
      if (!credential) return false;
      await unwrap(
        api.POST('/auth/passkeys/login/finish', {
          body: { session_id: begin.session_id, credential: credential.toJSON() as Record<string, unknown> },
        }),
      );
      return true;
    },
    meta: { handled: true },
    onSuccess: (done) => {
      if (done) qc.invalidateQueries({ queryKey: keys.session });
    },
  });
}
