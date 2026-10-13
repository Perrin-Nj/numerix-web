'use client';
import { useState } from 'react';
import { useApi } from '@/lib/hooks';
import { useT, type TFn } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import type { Overview } from '@/lib/types';
import type { Key } from '@/messages/fr';
import { Card, DataState, PageTitle, Skeleton } from '@/components/ui';
import { BarChart, ChartFrame, Delta, Donut, HBars, LineChart, PALETTE, RangeToggle, Spark, type Pt } from '@/components/charts';

const loc = (l: string) => (l === 'fr' ? 'fr-CA' : 'en-CA');
const money = (cents: number, l: string) => new Intl.NumberFormat(loc(l), { style: 'currency', currency: 'CAD' }).format(cents / 100);
const shortDay = (iso: string, l: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(loc(l), { day: 'numeric', month: 'short', timeZone: 'UTC' });
const shortMonth = (m: string, l: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString(loc(l), { month: 'short', timeZone: 'UTC' });
const longMonth = (m: string, l: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString(loc(l), { month: 'long', year: 'numeric', timeZone: 'UTC' });

function summarize(t: TFn, name: string, values: number[], fmt: (n: number) => string) {
  if (!values.length) return t('common.empty');
  const sum = values.reduce((a, b) => a + b, 0);
  return t('ov.sum.series', { name, n: values.length, first: fmt(values[0]), last: fmt(values[values.length - 1]), min: fmt(Math.min(...values)), max: fmt(Math.max(...values)), avg: fmt(Math.round((sum / values.length) * 10) / 10) });
}

function Tile({ label, value, series, now, before, goodWhenDown, suffix, color }: { label: string; value: string; series: number[]; now: number; before: number; goodWhenDown?: boolean; suffix?: string; color?: string }) {
  const t = useT();
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-line bg-elevated p-4 transition-colors hover:border-muted/40">
      <div className="min-h-10 text-sm leading-5 text-muted">{label}</div>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 break-words font-display text-xl font-bold leading-tight sm:text-2xl">{value}</span>
        <Delta now={now} before={before} goodWhenDown={goodWhenDown} suffix={suffix} />
      </div>
      <div className="mt-auto pt-3">
        <Spark data={series} color={color} />
      </div>
      <div className="mt-1 text-xs leading-5 text-muted">{t('ov.vs30')}</div>
    </div>
  );
}

function Charts({ o }: { o: Overview }) {
  const t = useT();
  const l = useUI((s) => s.locale);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [sign, setSign] = useState<'d' | 'm'>('d');
  const num = (n: number) => new Intl.NumberFormat(loc(l)).format(n);
  const days = o.activity_by_day_90.slice(-range);
  const active: Pt[] = days.map((d) => ({ x: shortDay(d.date, l), label: shortDay(d.date, l), y: d.active_kids }));
  const minutes = days.map((d) => ({ x: shortDay(d.date, l), label: shortDay(d.date, l), values: [d.minutes] }));
  const mrr: Pt[] = o.mrr_by_month_12.map((m) => ({ x: longMonth(m.month, l), label: shortMonth(m.month, l), y: m.mrr_cad_cents / 100 }));
  const planName = (p: string) => t(`plan.${p}` as Key);
  const rangeOpts = ([7, 30, 90] as const).map((v) => ({ v, label: t('ov.days', { n: v }) }));

  return (
    <div className="space-y-4">
      <Card title={t('ov.activity')} action={<RangeToggle label={t('ov.range')} value={range} options={rangeOpts} onChange={setRange} />}>
        <ChartFrame
          summary={`${summarize(t, t('ov.s.active_kids'), active.map((p) => p.y), num)} ${summarize(t, t('ov.s.minutes'), days.map((d) => d.minutes), num)}`}
          head={[t('chart.date'), t('ov.s.active_kids'), t('ov.s.minutes'), t('ov.s.sessions')]}
          rows={days.map((d) => [d.date, d.active_kids, d.minutes, d.sessions])}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted">{t('ov.s.active_kids')}</h3>
              <LineChart pts={active} name={t('ov.s.active_kids')} color={PALETTE[0]} fmt={num} />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-muted">{t('ov.s.minutes')}</h3>
              <BarChart data={minutes} names={[t('ov.s.minutes')]} fmt={num} />
            </div>
          </div>
        </ChartFrame>
      </Card>

      <Card title={t('ov.revenue')}>
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted">{t('ov.s.mrr')}</h3>
            <ChartFrame
              summary={summarize(t, t('ov.s.mrr'), mrr.map((p) => p.y), (n) => money(n * 100, l))}
              head={[t('chart.month'), t('ov.s.mrr')]}
              rows={o.mrr_by_month_12.map((m) => [m.month, money(m.mrr_cad_cents, l)])}
            >
              <LineChart pts={mrr} name={t('ov.s.mrr')} color={PALETTE[2]} fmt={(n) => `${num(Math.round(n))} $`} tipValue={(n) => money(n * 100, l)} />
            </ChartFrame>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted">{t('ov.plan_mix')}</h3>
            <ChartFrame
              summary={t('ov.sum.donut', { total: o.parents_total, parts: o.plan_mix.map((p) => `${planName(p.plan)} ${p.count} (${money(p.mrr_cad_cents, l)})`).join(', ') })}
              head={[t('f.plan'), t('chart.count'), t('ov.mrr')]}
              rows={o.plan_mix.map((p) => [planName(p.plan), p.count, money(p.mrr_cad_cents, l)])}
            >
              <Donut slices={o.plan_mix.map((p) => ({ label: planName(p.plan), value: p.count }))} centerLabel={t('ov.parents')} fmt={num} />
            </ChartFrame>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('ov.subs')}>
          <ChartFrame
            summary={t('ov.sum.donut', { total: o.parents_total, parts: o.subscription_mix.map((s) => `${t(`sub.${s.status}` as Key)} ${s.count}`).join(', ') })}
            head={[t('f.subscription'), t('chart.count')]}
            rows={o.subscription_mix.map((s) => [t(`sub.${s.status}` as Key), s.count])}
          >
            <Donut slices={o.subscription_mix.map((s) => ({ label: t(`sub.${s.status}` as Key), value: s.count }))} centerLabel={t('ov.parents')} fmt={num} />
          </ChartFrame>
        </Card>

        <Card
          title={t('ov.signups_title')}
          action={
            <RangeToggle
              label={t('ov.range')}
              value={sign}
              options={[
                { v: 'd', label: t('ov.days', { n: 30 }) },
                { v: 'm', label: t('ov.months', { n: 12 }) },
              ]}
              onChange={setSign}
            />
          }
        >
          {sign === 'd' ? (
            <ChartFrame
              summary={summarize(t, t('ov.s.signups'), o.signups_by_day_30.map((d) => d.count), num)}
              head={[t('chart.date'), t('ov.s.signups')]}
              rows={o.signups_by_day_30.map((d) => [d.date, d.count])}
            >
              <BarChart data={o.signups_by_day_30.map((d) => ({ x: shortDay(d.date, l), label: shortDay(d.date, l), values: [d.count] }))} names={[t('ov.s.signups')]} fmt={num} />
            </ChartFrame>
          ) : (
            <ChartFrame
              summary={summarize(t, t('ov.s.signups'), o.signups_by_month_12.map((d) => d.count), num)}
              head={[t('chart.month'), t('ov.s.signups')]}
              rows={o.signups_by_month_12.map((d) => [d.month, d.count])}
            >
              <BarChart data={o.signups_by_month_12.map((d) => ({ x: longMonth(d.month, l), label: shortMonth(d.month, l), values: [d.count] }))} names={[t('ov.s.signups')]} fmt={num} />
            </ChartFrame>
          )}
        </Card>

        <Card title={t('ov.grades')}>
          <ChartFrame
            summary={t('ov.sum.donut', { total: o.kids_total, parts: o.kids_by_grade.map((g) => `${t('col.grade')} ${g.grade}: ${g.count}`).join(', ') })}
            head={[t('col.grade'), t('chart.count')]}
            rows={o.kids_by_grade.map((g) => [g.grade, g.count])}
          >
            <BarChart data={o.kids_by_grade.map((g) => ({ x: `${t('col.grade')} ${g.grade}`, label: String(g.grade), values: [g.count] }))} names={[t('ov.s.kids')]} fmt={num} />
          </ChartFrame>
        </Card>

        <Card title={t('ov.worlds')}>
          <ChartFrame
            summary={t('ov.sum.donut', { total: o.top_worlds.reduce((a, w) => a + w.sessions_30d, 0), parts: o.top_worlds.map((w) => `${t(`world.${w.world}` as Key)} ${w.sessions_30d}`).join(', ') })}
            head={[t('ov.world'), t('ov.s.sessions')]}
            rows={o.top_worlds.map((w) => [t(`world.${w.world}` as Key), w.sessions_30d])}
          >
            <HBars rows={o.top_worlds.map((w) => ({ label: t(`world.${w.world}` as Key), value: w.sessions_30d }))} fmt={num} color={PALETTE[1]} />
          </ChartFrame>
        </Card>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const t = useT();
  const l = useUI((s) => s.locale);
  const q = useApi<Overview>('overview');
  return (
    <>
      <PageTitle title={t('nav.overview')} sub={t('ov.sub')} />
      <DataState
        q={q}
        skeleton={
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-7">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        {(o) => {
          const tr = o.trend_30;
          const first = tr[0], last = tr[tr.length - 1];
          const pct = (n: number) => `${Math.round(n * 10) / 10} %`;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 2xl:grid-cols-7">
                <Tile label={t('ov.parents')} value={String(o.parents_total)} series={tr.map((x) => x.parents)} now={last.parents} before={first.parents} />
                <Tile label={t('ov.kids')} value={String(o.kids_total)} series={tr.map((x) => x.kids)} now={last.kids} before={first.kids} />
                <Tile label={t('ov.paid')} value={String(o.by_subscription.active)} series={tr.map((x) => x.paid)} now={last.paid} before={first.paid} color={PALETTE[2]} />
                <Tile label={t('ov.mrr')} value={money(o.mrr_cad_cents, l)} series={tr.map((x) => x.mrr_cad_cents)} now={last.mrr_cad_cents} before={first.mrr_cad_cents} color={PALETTE[2]} />
                <Tile label={t('ov.arpu')} value={money(o.arpu_cad_cents, l)} series={tr.map((x) => x.arpu_cad_cents)} now={last.arpu_cad_cents} before={first.arpu_cad_cents} />
                <Tile label={t('ov.churn')} value={String(o.churn_30d)} series={tr.map((x) => x.churn_30d)} now={last.churn_30d} before={first.churn_30d} goodWhenDown color={PALETTE[1]} />
                <Tile label={t('ov.retention')} value={pct(o.retention.pct)} series={tr.map((x) => x.retention_pct)} now={last.retention_pct} before={first.retention_pct} suffix=" pts" color={PALETTE[3]} />
              </div>
              <p className="text-sm text-muted">
                {t('ov.chips', { unpaid: o.by_subscription.unpaid, trial: o.by_subscription.trial, blocked: o.blocked, today: o.active_today })}
              </p>
              <Charts o={o} />
            </div>
          );
        }}
      </DataState>
    </>
  );
}
