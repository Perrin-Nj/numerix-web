'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/ui/button';
import { InlineError } from '@/ui/inline-error';
import { Chip } from '@/ui/chip';
import { Panel } from '@/ui/panel';

export type SecurityDevice = { id: string; label: string; last_used_at: string; current: boolean };
export type SecurityPasskey = { id: string; nickname: string; created_at: string };

export type SecurityPanelProps = {
  devices: SecurityDevice[];
  passkeys: SecurityPasskey[];
  /** False when the browser cannot create passkeys: the add button is replaced by a note. */
  passkeysSupported: boolean;
  /** A request is running (disables the buttons). */
  busy?: boolean;
  /** Shown under the passkey section when adding failed. */
  passkeyError?: boolean;
  onForgetDevice: (id: string) => void;
  onAddPasskey: () => void;
  onRemovePasskey: (id: string) => void;
};

/** One panel on the parent account screen: known devices and the passkeys. Presentation only, no data fetching. */
export function SecurityPanel({
  devices,
  passkeys,
  passkeysSupported,
  busy,
  passkeyError,
  onForgetDevice,
  onAddPasskey,
  onRemovePasskey,
}: SecurityPanelProps) {
  const t = useTranslations('screens.parent.account.security');
  const locale = useLocale();
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));

  return (
    <Panel title={t('title')} icon="shield">
      <div className="flex flex-col gap-6">
        <section aria-labelledby="sec-devices" className="flex flex-col gap-2">
          <h3 id="sec-devices" className="font-display text-lg font-semibold">
            {t('devices.title')}
          </h3>
          <p className="text-muted">{t('devices.hint')}</p>
          {devices.length === 0 ? (
            <p className="text-muted">{t('devices.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {devices.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 rounded-md border-2 border-line bg-sunken p-3">
                  <span>
                    <span className="block font-medium">
                      {d.label}
                      {d.current && <Chip tone="brand" className="ms-2">{t('devices.current')}</Chip>}
                    </span>
                    <span className="block text-sm text-muted">{t('devices.lastUsed', { date: date(d.last_used_at) })}</span>
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    aria-label={t('devices.forgetLabel', { name: d.label })}
                    onClick={() => onForgetDevice(d.id)}
                  >
                    {t('devices.forget')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="sec-passkeys" className="flex flex-col gap-2">
          <h3 id="sec-passkeys" className="font-display text-lg font-semibold">
            {t('passkeys.title')}
          </h3>
          <p className="text-muted">{t('passkeys.hint')}</p>
          {passkeys.length === 0 ? (
            <p className="text-muted">{t('passkeys.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {passkeys.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-md border-2 border-line bg-sunken p-3">
                  <span>
                    <span className="block font-medium">{p.nickname}</span>
                    <span className="block text-sm text-muted">{t('passkeys.added', { date: date(p.created_at) })}</span>
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    aria-label={t('passkeys.removeLabel', { name: p.nickname })}
                    onClick={() => onRemovePasskey(p.id)}
                  >
                    {t('passkeys.remove')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {passkeyError && <InlineError message={t('passkeys.error')} />}
          {passkeysSupported ? (
            <div>
              <Button variant="primary" loading={busy} onClick={onAddPasskey}>
                {t('passkeys.add')}
              </Button>
            </div>
          ) : (
            <p className="text-muted">{t('passkeys.unsupported')}</p>
          )}
        </section>
      </div>
    </Panel>
  );
}
