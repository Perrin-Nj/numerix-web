'use client';
import { apiOn, passkeysSupported, useAddPasskey, useDeletePasskey, useDevices, usePasskeys, useRevokeDevice } from '@/data/hooks';
import { SecurityPanel } from './SecurityPanel';

/** Connects SecurityPanel to the data hooks. Renders nothing unless the Go backend owns the data. */
export function AccountSecurity() {
  const devices = useDevices();
  const passkeys = usePasskeys();
  const revoke = useRevokeDevice();
  const remove = useDeletePasskey();
  const add = useAddPasskey();
  if (!apiOn) return null;
  return (
    <SecurityPanel
      devices={devices.data ?? []}
      passkeys={passkeys.data ?? []}
      passkeysSupported={passkeysSupported()}
      busy={revoke.isPending || remove.isPending || add.isPending}
      passkeyError={add.isError}
      onForgetDevice={(id) => revoke.mutate(id)}
      onAddPasskey={() => add.mutate(undefined)}
      onRemovePasskey={(id) => remove.mutate(id)}
    />
  );
}
