'use client';
import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { Button, Modal } from '@/components/ui';

export interface ResetCode {
  code: string;
  email: string;
}

/** 12345678 -> 1234-5678 */
export const showCode = (c: string) => {
  const d = c.replace(/\D/g, '');
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4)}` : c;
};

/** Shows a reset code once. Closing the dialog drops it from memory (nothing is stored anywhere). */
export function ResetCodeDialog({ reset, onClose }: { reset: ResetCode | null; onClose: () => void }) {
  const t = useT();
  const [copy, setCopy] = useState<'idle' | 'ok' | 'fail'>('idle');
  const close = () => {
    setCopy('idle');
    onClose();
  };
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(showCode(reset!.code));
      setCopy('ok');
    } catch {
      setCopy('fail');
    }
  }
  return (
    <Modal open={!!reset} onClose={close} title={t('rp.title')}>
      {reset && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            {t('rp.for')}: <span className="font-semibold text-fg">{reset.email}</span>
          </p>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-sunken p-4">
            <output aria-label={t('rp.code')} data-testid="reset-code" className="font-mono text-3xl font-bold tracking-widest">
              {showCode(reset.code)}
            </output>
            <Button variant="primary" onClick={doCopy}>
              {copy === 'ok' ? t('rp.copied') : t('rp.copy')}
            </Button>
          </div>
          <p role="status" aria-live="polite" className="text-sm text-danger">
            {copy === 'fail' ? t('rp.copy_failed') : ''}
          </p>
          <p className="text-sm font-medium">{t('rp.valid')}</p>
          <p className="rounded-xl border border-danger/40 bg-danger-soft p-3 text-sm text-danger">{t('rp.warn')}</p>
          <p className="text-sm text-muted">{t('rp.how')}</p>
          <p className="text-xs text-muted">{t('rp.audit')}</p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={close}>
              {t('rp.done')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
