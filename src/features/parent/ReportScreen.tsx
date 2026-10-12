'use client';
import { useFormatter, useTranslations } from 'next-intl';
import { useWeeklyReport } from '@/features/api/hooks';
import { ParentPage } from './ParentPage';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';

export function ReportScreen({ childId }: { childId: string }) {
  const t = useTranslations('screens.parent.report');
  const format = useFormatter();
  const report = useWeeklyReport(childId);
  const r = report.data;

  return (
    <ParentPage title={t('title')} backHref={`/parent/children/${childId}`}>
      {report.isLoading && <Skeleton height={200} />}
      {r && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <Panel title={t('week', { date: format.dateTime(new Date(r.week_start), { dateStyle: 'long' }) })}>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-sunken p-3">
                <dt className="text-sm text-muted">{t('sessions')}</dt>
                <dd className="font-display text-3xl font-bold">{r.sessions}</dd>
              </div>
              <div className="rounded-md bg-sunken p-3">
                <dt className="text-sm text-muted">{t('days')}</dt>
                <dd className="font-display text-3xl font-bold">{r.days_played ?? 0}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title={t('growth')}>
            <p>{t('growthLine', { now: r.growth.current.chapters_completed, before: r.growth.previous.chapters_completed })}</p>
          </Panel>
          <Panel title={t('stuck')}>
            {(r.stuck_points ?? []).length === 0 && <p className="text-muted">{t('stuckNone')}</p>}
            <ul className="flex flex-col gap-2">
              {(r.stuck_points ?? []).map((m) => (
                <li key={m.code} className="rounded-md bg-sunken p-3 font-display font-semibold">
                  {m.description}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </ParentPage>
  );
}
