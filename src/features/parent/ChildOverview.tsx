'use client';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useCountUp } from '@/platform/motion';
import { useChallenges, useChildren, useGrowth, useProgress, useSessionList } from '@/data/hooks';
import { Progress } from '@/ui/progress';
import { ParentPage } from './ParentPage';
import { Avatar } from '@/game/avatar';
import { Card, CardBody } from '@/ui/card';
import { Chip } from '@/ui/chip';
import { EmptyState } from '@/ui/empty-state';
import { Icon } from '@/ui/icon';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';
import { StatTile } from '@/ui/stat-tile';
import { ScreenState } from '@/game/screen-state';
import type { Growth } from '@/data/api/types';

function Figure({ value }: { value: number }) {
  return <>{useCountUp(value)}</>;
}

const LINK =
  'inline-flex min-h-12 items-center gap-2 rounded-md bg-brand-soft px-4 font-display font-semibold text-brand-strong shadow-[var(--shadow-press-neutral)] transition-[transform,filter] duration-[var(--dur-1)] hover:brightness-95 active:scale-[0.97]';

function GrowthPanel({ growth }: { growth: Growth }) {
  const t = useTranslations('screens.parent.overview.growth');
  const rows = [
    ['chapters_completed', t('chapters'), 'book'],
    ['skills_mastered', t('skills'), 'star'],
    ['minutes_played', t('minutes'), 'flame'],
  ] as const;
  return (
    <Panel title={t('title')} icon="trophy" className="lg:col-span-2">
      <p className="mb-4 text-muted">{t('explain', { days: growth.window_days })}</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {rows.map(([key, label, icon]) => (
          <StatTile
            key={key}
            label={label}
            icon={icon}
            value={<Figure value={growth.current[key]} />}
            compare={{ current: growth.current[key], previous: growth.previous[key], previousLabel: t('before', { value: growth.previous[key] }) }}
          />
        ))}
      </dl>
    </Panel>
  );
}

/** One child at a glance: stats, sessions, skills in progress, stuck skills and growth. */
export function ChildOverview({ childId }: { childId: string }) {
  const t = useTranslations('screens.parent.overview');
  const tg = useTranslations('screens.parent.home');
  const tc = useTranslations('screens.parent.overview.challenges');
  const format = useFormatter();
  const growth = useGrowth(childId);
  const progress = useProgress(childId);
  const sessions = useSessionList(childId);
  const challenges = useChallenges(childId);
  const child = useChildren().data?.find((c) => c.id === childId);

  return (
    <ParentPage title={t('title')} backHref="/parent" wide>
      <Card tone="brand">
        <CardBody>
          <div className="flex min-h-20 flex-wrap items-center gap-4">
            {child ? <Avatar avatarId={child.avatar_id} name={child.display_name} size="lg" /> : <span aria-hidden className="size-20 shrink-0" />}
            <div className="min-w-0 flex-1">
              {child && (
                <>
                  <p className="truncate font-display text-3xl font-bold leading-tight">{child.display_name}</p>
                  <p className="text-muted">{tg('grade', { grade: child.grade })}</p>
                </>
              )}
            </div>
            <nav aria-label={t('links')} className="flex flex-wrap gap-2">
              {(['report', 'settings'] as const).map((k) => (
                <Link key={k} href={`/parent/children/${childId}/${k}`} className={LINK}>
                  <Icon name={k === 'report' ? 'book' : 'settings'} size={18} />
                  {t(`link.${k}`)}
                </Link>
              ))}
            </nav>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {growth.isLoading || growth.error ? (
          <div className="lg:col-span-2">
            <ScreenState isLoading={growth.isLoading} error={growth.error} onRetry={() => void growth.refetch()} area="parent" skeleton={<Skeleton shape="block" className="nx-skeleton-card h-[640px] sm:h-[290px] lg:h-[230px]" />}>
              {null}
            </ScreenState>
          </div>
        ) : (
          growth.data && <GrowthPanel growth={growth.data} />
        )}

        <Panel title={t('stuck.title')} icon="alert">
          {(progress.isLoading || progress.error) && (
            <ScreenState isLoading={progress.isLoading} error={progress.error} onRetry={() => void progress.refetch()} area="parent" skeleton={<Skeleton shape="block" className="nx-skeleton-card h-[200px]" />}>
              {null}
            </ScreenState>
          )}
          {progress.data && progress.data.misconceptions.length === 0 && <EmptyState icon="check" title={t('stuck.none')} />}
          {progress.data && progress.data.misconceptions.length > 0 && (
            <ul className="flex flex-col gap-3">
              {progress.data.misconceptions.map((m) => (
                <li key={m.code} className="rounded-md border-2 border-line bg-sunken p-3">
                  <p className="font-display font-semibold">{m.description}</p>
                  <p className="text-sm text-muted">{t('stuck.skills', { count: m.skill_ids.length })}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* after the stuck-skills panel: late challenges fill the empty column instead of pushing it aside (CLS) */}
        {challenges.data && challenges.data.length > 0 && (
          <Panel title={tc('title')} icon="trophy">
            <ul className="flex flex-col gap-3">
              {challenges.data.map((c) => (
                <li key={c.id} className="rounded-md border-2 border-line bg-sunken p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-elevated text-brand shadow-1">
                      <Icon name="flame" size={20} />
                    </span>
                    <p className="min-w-[9rem] flex-1 font-display font-semibold">{c.title}</p>
                    <Chip tone={c.status === 'done' ? 'success' : c.status === 'active' ? 'info' : 'neutral'} icon={c.status === 'done' ? 'check' : undefined}>
                      {tc(c.status)}
                    </Chip>
                  </div>
                  {c.status !== 'available' && (
                    <div className="mt-3">
                      <Progress value={c.progress} max={c.target} label={`${c.progress}/${c.target}`} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title={t('sessions.title')} icon="book" className="lg:col-span-2">
          {(sessions.isLoading || sessions.error) && (
            <ScreenState isLoading={sessions.isLoading} error={sessions.error} onRetry={() => void sessions.refetch()} area="parent" skeleton={<Skeleton shape="block" className="nx-skeleton-card h-[260px]" />}>
              {null}
            </ScreenState>
          )}
          {sessions.data && sessions.data.length === 0 && <EmptyState icon="book" title={t('sessions.none')} description={t('sessions.noneHint')} />}
          {sessions.data && sessions.data.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
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
      </div>
    </ParentPage>
  );
}
