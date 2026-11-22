'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDeleteChild } from '@/data/hooks';
import { useNotify } from '@/ui/notification-center';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { FormField } from '@/ui/form-field';
import { Input } from '@/ui/input';

/** Delete a child profile after the parent types the child's name. Shared by the child card, the overview and the settings. */
export function DeleteChildDialog({ childId, name, open, onOpenChange, onDeleted }: { childId: string; name: string; open: boolean; onOpenChange: (open: boolean) => void; onDeleted?: () => void }) {
  const t = useTranslations('screens.parent.settings');
  const { notify } = useNotify();
  const del = useDeleteChild();
  const [typed, setTyped] = useState('');

  async function onDelete() {
    await del.mutateAsync(childId);
    onOpenChange(false);
    setTyped('');
    notify({ kind: 'success', title: t('deleted') });
    onDeleted?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped('');
        onOpenChange(o);
      }}
      tone="danger"
      title={t('confirm.title')}
      description={t('confirm.description')}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('confirm.cancel')}
          </Button>
          <Button variant="danger" loading={del.isPending} disabled={typed.trim() !== name} onClick={onDelete}>
            {t('confirm.confirm')}
          </Button>
        </>
      }
    >
      <FormField label={t('confirm.type', { name })} htmlFor="confirm-name">
        <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </FormField>
    </Dialog>
  );
}
