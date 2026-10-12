'use client';
import { api } from '@/lib/api';
import { useAct, useApi, useDraft } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import type { Method, PlanDef, Plans } from '@/lib/types';
import { Badge, Button, Card, DataState, Input, PageTitle, Switch } from '@/components/ui';

const METHODS: Method[] = ['card', 'interac', 'paypal', 'apple_pay', 'google_pay'];
const DEFAULT_LABEL: Record<Method, { fr: string; en: string }> = {
  card: { fr: 'Carte de crédit', en: 'Credit card' },
  interac: { fr: 'Interac', en: 'Interac' },
  paypal: { fr: 'PayPal', en: 'PayPal' },
  apple_pay: { fr: 'Apple Pay', en: 'Apple Pay' },
  google_pay: { fr: 'Google Pay', en: 'Google Pay' },
};
const lines = (s: string) => s.split('\n');

export default function PlansPage() {
  const t = useT();
  const act = useAct();
  const q = useApi<Plans>('subscriptions/plans');
  const { cur, set, dirty, reset } = useDraft(q.data);

  return (
    <>
      <PageTitle title={t('nav.plans')} sub={t('plans.sub')} action={dirty ? <Badge tone="warn">{t('common.unsaved')}</Badge> : <Badge tone="ok">{t('common.saved')}</Badge>} />
      <DataState q={q}>
        {(server) => {
          const d = cur ?? server;
          const setPlan = (i: number, p: Partial<PlanDef>) => set({ ...d, plans: d.plans.map((x, j) => (j === i ? { ...x, ...p } : x)) });
          const on = (m: Method) => d.methods.some((x) => x.id === m);
          const toggle = (m: Method, v: boolean) =>
            set({ ...d, methods: v ? [...d.methods, { id: m, label: server.methods.find((x) => x.id === m)?.label ?? DEFAULT_LABEL[m] }] : d.methods.filter((x) => x.id !== m) });
          return (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {d.plans.map((p, i) => (
                  <Card key={p.id} title={t(`plan.${p.id}`)}>
                    <Input
                      label={t('plans.price')}
                      type="number"
                      min={0}
                      step={0.01}
                      value={p.price_cad_cents / 100}
                      onChange={(e) => setPlan(i, { price_cad_cents: Math.round(Number(e.target.value) * 100) })}
                    />
                    {(['fr', 'en'] as const).map((l) => (
                      <div key={l} className="mt-3">
                        <Input label={`${t('plans.name')} (${l.toUpperCase()})`} value={p.name[l]} onChange={(e) => setPlan(i, { name: { ...p.name, [l]: e.target.value } })} />
                        <label className="mb-1 mt-2 block text-sm font-medium text-muted" htmlFor={`f-${p.id}-${l}`}>
                          {t('plans.features')} ({l.toUpperCase()})
                        </label>
                        <textarea
                          id={`f-${p.id}-${l}`}
                          rows={4}
                          value={p.features[l].join('\n')}
                          onChange={(e) => setPlan(i, { features: { ...p.features, [l]: lines(e.target.value) } })}
                          className="w-full rounded-xl border border-line bg-elevated p-3 text-sm focus:border-brand"
                        />
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
              <Card title={t('plans.methods')}>
                <p className="mb-2 text-sm text-muted">{t('plans.methods_hint')}</p>
                <div className="grid gap-x-8 sm:grid-cols-2">
                  {METHODS.map((m) => (
                    <Switch key={m} label={t(`method.${m}`)} checked={on(m)} onChange={(v) => toggle(m, v)} />
                  ))}
                </div>
              </Card>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  disabled={!dirty || d.methods.length === 0}
                  onClick={() =>
                    act(
                      () =>
                        api('subscriptions/plans', {
                          method: 'PUT',
                          body: {
                            ...d,
                            plans: d.plans.map((p) => ({ ...p, features: { fr: p.features.fr.map((f) => f.trim()).filter(Boolean), en: p.features.en.map((f) => f.trim()).filter(Boolean) } })),
                          },
                        }),
                      t('toast.saved'),
                    ).catch(() => undefined)
                  }
                >
                  {t('common.save')}
                </Button>
                <Button disabled={!dirty} onClick={reset}>
                  {t('common.discard')}
                </Button>
              </div>
            </div>
          );
        }}
      </DataState>
    </>
  );
}
