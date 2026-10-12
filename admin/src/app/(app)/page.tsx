'use client';
import { useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import type { Overview } from '@/lib/types';
import { Card, DataState, PageTitle, Skeleton } from '@/components/ui';

function Tile({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-elevated p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

function Sparkline({ data, label }: { data: number[]; label: string }) {
  const w = 600;
  const h = 120;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - 8 - (v / max) * (h - 16)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full" role="img" aria-label={label} preserveAspectRatio="none">
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill="var(--brand-soft)" />
      <polyline points={pts.join(' ')} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function OverviewPage() {
  const t = useT();
  const q = useApi<Overview>('overview');
  return (
    <>
      <PageTitle title={t('nav.overview')} sub={t('ov.sub')} />
      <DataState
        q={q}
        skeleton={
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        }
      >
        {(o) => {
          const series = (o.signups_30d ?? []).map((x) => x.count);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Tile label={t('ov.parents')} value={o.parents_total} />
                <Tile label={t('ov.kids')} value={o.kids_total} />
                <Tile label={t('ov.paid')} value={o.by_subscription.active} tone="text-success" />
                <Tile label={t('ov.unpaid')} value={o.by_subscription.unpaid} tone="text-warning" />
                <Tile label={t('ov.trial')} value={o.by_subscription.trial} tone="text-info" />
                <Tile label={t('ov.blocked')} value={o.blocked} tone="text-danger" />
                <Tile label={t('ov.mrr')} value={`${(o.mrr_cad_cents / 100).toFixed(2)} $`} />
                <Tile label={t('ov.active_today')} value={o.active_today} />
              </div>
              <Card title={t('ov.signups')} action={<span className="text-sm text-muted">{t('ov.signups_total', { n: o.signups_30d_total })}</span>}>
                {series.length ? <Sparkline data={series} label={t('ov.signups')} /> : <p className="text-sm text-muted">{t('common.empty')}</p>}
              </Card>
            </div>
          );
        }}
      </DataState>
    </>
  );
}
