'use client';
import { useFormatter, useTranslations } from 'next-intl';
import { useWeeklyReport } from '@/data/hooks';
import { ParentPage } from './ParentPage';
import { EmptyState } from '@/ui/empty-state';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';
import { StatTile } from '@/ui/stat-tile';
import { ScreenState } from '@/game/screen-state';

export function ReportScreen({ childId }: { childId: string }) {
  const t = useTranslations('screens.parent.report');
  const format = useFormatter();
  const report = useWeeklyReport(childId);
  const r = report.data;

  return (
    <ParentPage title={t('title')} backHref={`/parent/children/${childId}`}>
      <ScreenState isLoading={report.isLoading} error={report.error} isEmpty={!r} onRetry={() => void report.refetch()} area="parent" skeleton={<Skeleton shape="block" className="nx-skeleton-card" height={200} />}>
      {r && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <Panel title={t('week', { date: format.dateTime(new Date(r.week_start), { dateStyle: 'long' }) })} icon="book">
            <dl className="grid grid-cols-2 gap-3">
              <StatTile label={t('sessions')} icon="book" value={r.sessions} />
              <StatTile label={t('days')} icon="flame" value={r.days_played ?? 0} />
            </dl>
          </Panel>
          <Panel title={t('growth')} icon="trophy">
            <p>{t('growthLine', { now: r.growth.current.chapters_completed, before: r.growth.previous.chapters_completed })}</p>
          </Panel>
          <Panel title={t('stuck')} icon="alert">
            {(r.stuck_points ?? []).length === 0 && <EmptyState icon="check" title={t('stuckNone')} />}
            <ul className="flex flex-col gap-2">
              {(r.stuck_points ?? []).map((m) => (
                <li key={m.code} className="rounded-md border-2 border-line bg-sunken p-3 font-display font-semibold">
                  {m.description}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
      </ScreenState>
    </ParentPage>
  );
}
