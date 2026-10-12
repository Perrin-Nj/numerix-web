'use client';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { reportError } from '@/lib/errors/bridge';
import type { SkillId, WorldId } from '@/lib/api/types';
import { useStartSession } from '@/features/api/hooks';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';

/**
 * Starts a chapter and routes to the story screen. Consent and daily-limit answers are explained
 * in a dialog (they are normal situations, not failures); everything else is reported.
 */
export function useStartChapter(childId: string | null) {
  const t = useTranslations('errors');
  const router = useRouter();
  const start = useStartSession(childId ?? '');
  const [notice, setNotice] = useState<'consent_missing' | 'daily_limit_reached' | 'session_active' | null>(null);

  const begin = useCallback(
    async (world: WorldId, opts?: { skillId?: SkillId | null; kind?: 'chapter' | 'daily_quest' | 'onboarding' }) => {
      if (!childId) return;
      try {
        const session = await start.mutateAsync({ world, kind: opts?.kind ?? 'chapter', skill_id: opts?.skillId ?? null });
        router.push(`/play/session/${session.id}`);
      } catch (e) {
        if (e instanceof ApiError && (e.code === 'consent_missing' || e.code === 'daily_limit_reached' || e.code === 'session_active')) {
          setNotice(e.code);
        } else reportError(e);
      }
    },
    [childId, router, start],
  );

  const dialog = (
    <Dialog
      open={notice !== null}
      onOpenChange={(open) => !open && setNotice(null)}
      title={notice ? t(`${notice}.title`) : ''}
      description={notice ? t(`${notice}.description`) : undefined}
      footer={<Button onClick={() => setNotice(null)}>{t('ok')}</Button>}
    />
  );

  return { begin, starting: start.isPending, dialog };
}
