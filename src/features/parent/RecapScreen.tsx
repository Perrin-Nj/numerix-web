'use client';
import { useTranslations } from 'next-intl';
import { useSessionSummary } from '@/features/api/hooks';
import { ParentPage } from './ParentPage';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';

export function RecapScreen({ childId, sessionId }: { childId: string; sessionId: string }) {
  const t = useTranslations('screens.parent.recap');
  const summary = useSessionSummary(sessionId, childId);
  const s = summary.data;

  return (
    <ParentPage title={t('title')} backHref={`/parent/children/${childId}`}>
      {summary.isLoading && <Skeleton height={200} />}
      {s && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <Panel title={s.session.story_title ?? t('untitled')}>
            <p className="text-lg">{s.story_recap}</p>
            <p className="mt-2 text-muted">{t('duration', { minutes: Math.max(1, Math.round(s.duration_seconds / 60)) })}</p>
          </Panel>
          <Panel title={t('skills')}>
            <ul className="flex flex-col gap-3">
              {s.skills.map((k) => (
                <li key={k.skill_id} className="flex items-center justify-between gap-3 rounded-md bg-sunken p-3">
                  <div>
                    <p className="font-display font-semibold">{k.label}</p>
                    {k.reason && <p className="text-sm text-muted">{t(`reason.${k.reason}`)}</p>}
                  </div>
                  <p className="font-display text-lg">{t('score', { correct: k.correct, attempts: k.attempts })}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={t('stuck')}>
            {(s.stuck_points ?? []).length === 0 && <p className="text-muted">{t('stuckNone')}</p>}
            <ul className="flex flex-col gap-3">
              {(s.stuck_points ?? []).map((m) => (
                <li key={m.code} className="rounded-md bg-sunken p-3">
                  <p className="font-display font-semibold">{m.description}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </ParentPage>
  );
}
