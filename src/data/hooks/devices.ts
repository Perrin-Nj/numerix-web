'use client';
/** Known devices and passkeys of the parent (BE-64, BE-65, BE-66). Only the Go backend serves these routes. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/data/api/client';
import type { components } from '@/data/api/schema';
import { apiOn } from './keys';

export type KnownDevice = components['schemas']['Device'];
export type PasskeyInfo = components['schemas']['Passkey'];

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

/** Query for GET /account/devices. Off unless the server owns state (the mock backend has no such route). */
export function useDevices() {
  return useQuery({
    queryKey: deviceKeys.devices,
    enabled: apiOn,
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
    enabled: apiOn,
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
