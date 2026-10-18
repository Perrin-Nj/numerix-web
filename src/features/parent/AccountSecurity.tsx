'use client';
import { useSyncExternalStore } from 'react';
import { passkeysSupported, useAddPasskey, useDeletePasskey, useDevices, usePasskeys, useRevokeDevice } from '@/data/hooks';
import { SecurityPanel } from './SecurityPanel';

/** Connects SecurityPanel to the data hooks. Renders nothing unless the Go backend owns the data. */
export function AccountSecurity() {
  const devices = useDevices();
  const passkeys = usePasskeys();
  const revoke = useRevokeDevice();
  const remove = useDeletePasskey();
  const add = useAddPasskey();
  // false while hydrating, then the browser's real answer, so server and client markup match
  const canPasskey = useSyncExternalStore(() => () => {}, passkeysSupported, () => false);
  return (
    <SecurityPanel
      devices={devices.data ?? []}
      passkeys={passkeys.data ?? []}
      passkeysSupported={canPasskey}
      busy={revoke.isPending || remove.isPending || add.isPending}
      passkeyError={add.isError}
      onForgetDevice={(id) => revoke.mutate(id)}
      onAddPasskey={() => add.mutate(undefined)}
      onRemovePasskey={(id) => remove.mutate(id)}
    />
  );
}
