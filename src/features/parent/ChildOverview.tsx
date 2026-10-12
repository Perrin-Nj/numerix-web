'use client';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useCountUp } from '@/lib/motion';
import { useGrowth, useProgress, useSessionList } from '@/features/api/hooks';
import { ParentPage } from './ParentPage';
import { Card, CardBody } from '@/ui/card';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';
import type { Growth } from '@/lib/api/types';

function Figure({ value }: { value: number }) {
  return <>{useCountUp(value)}</>;
}

function GrowthPanel({ growth }: { growth: Growth }) {
  const t = useTranslations('screens.parent.overview.growth');
  const rows = [
    ['chapters_completed', t('chapters')],
    ['skills_mastered', t('skills')],
    ['minutes_played', t('minutes')],
  ] as const;
  return (
    <Panel title={t('title')}>
      <p className="mb-3 text-muted">{t('explain', { days: growth.window_days })}</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {rows.map(([key, label]) => (
          <div key={key} className="rounded-md bg-sunken p-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-display text-3xl font-bold"><Figure value={growth.current[key]} /></dd>
            <dd className="text-sm text-muted">{t('before', { value: growth.previous[key] })}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export function ChildOverview({ childId }: { childId: string }) {
  const t = useTranslations('screens.parent.overview');
  const format = useFormatter();
  const growth = useGrowth(childId);
  const progress = useProgress(childId);
  const sessions = useSessionList(childId);

  return (
    <ParentPage title={t('title')} backHref="/parent">
      <nav aria-label={t('links')} className="flex flex-wrap gap-2">
        {(['settings', 'report'] as const).map((k) => (
          <Link
            key={k}
            href={`/parent/children/${childId}/${k}`}
            className="lift inline-flex min-h-12 items-center rounded-md border-2 border-line bg-elevated px-5 font-display font-semibold"
          >
            {t(`link.${k}`)}
          </Link>
        ))}
      </nav>

      {growth.isLoading ? <Skeleton height={140} /> : growth.data && <GrowthPanel growth={growth.data} />}

      <Panel title={t('stuck.title')}>
        {progress.isLoading && <Skeleton height={80} />}
        {progress.data && progress.data.misconceptions.length === 0 && <p className="text-muted">{t('stuck.none')}</p>}
        {progress.data && progress.data.misconceptions.length > 0 && (
          <ul className="flex flex-col gap-3">
            {progress.data.misconceptions.map((m) => (
              <li key={m.code} className="rounded-md bg-sunken p-3">
                <p className="font-display font-semibold">{m.description}</p>
                <p className="text-sm text-muted">{t('stuck.skills', { count: m.skill_ids.length })}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t('sessions.title')}>
        {sessions.isLoading && <Skeleton height={80} />}
        {sessions.data && sessions.data.length === 0 && <p className="text-muted">{t('sessions.none')}</p>}
        {sessions.data && sessions.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {sessions.data.map((s) => (
              <li key={s.id}>
                <Card asChild interactive>
                  <Link href={`/parent/children/${childId}/sessions/${s.id}`}>
                    <CardBody>
                      <p className="font-display text-lg font-semibold">{s.story_title ?? t('sessions.untitled')}</p>
                      <p className="text-sm text-muted">
                        {format.dateTime(new Date(s.started_at), { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </CardBody>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ParentPage>
  );
}
