'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { ApiError } from '@/data/api/client';
import { cn } from '@/shared/cn';
import { daysUntil } from '@/features/notify/reminders';
import type { PaymentMethod, Plan, PlanId, Subscription } from '@/data/api/platform-types';
import { useCancelSubscription, useCheckout, usePlans, useSubscription } from '@/data/hooks/platform';
import { ParentPage } from '@/features/parent/ParentPage';
import { SubscriptionBadge } from '@/game/subscription-badge';
import { MascotBubble } from '@/game/mascot-bubble';
import { Button } from '@/ui/button';
import { Dialog } from '@/ui/dialog';
import { Icon } from '@/ui/icon';
import { InlineError } from '@/ui/inline-error';
import { Panel } from '@/ui/panel';
import { Skeleton } from '@/ui/skeleton';

const METHODS: PaymentMethod[] = ['card', 'interac', 'paypal', 'apple_pay', 'google_pay'];
const PAID: PlanId[] = ['family_monthly', 'family_yearly'];
const SHOWN_CODES = new Set(['device_offline', 'server_unreachable', 'backend_unreachable', 'backend_timeout', 'request_failed', 'unauthorized', 'forbidden', 'rate_limited', 'internal_error', 'validation_failed']);

function useErrorText() {
  const t = useTranslations('errors');
  return (error: unknown) => {
    const code = error instanceof ApiError && SHOWN_CODES.has(error.code) ? error.code : 'unknown';
    return { message: t(`${code}.title`), recovery: t(`${code}.description`) };
  };
}

/** A radio that looks like a card. Native input stays in the tab order and carries the checked state. */
function RadioCard({
  name,
  value,
  checked,
  onChange,
  disabled,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        'lift relative flex cursor-pointer flex-col gap-2 rounded-lg border bg-elevated p-4 text-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
        checked ? 'border-brand bg-brand-soft' : 'border-line',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      {children}
      {checked && <Icon name="check" size={22} className="absolute right-3 top-3 text-brand" />}
    </label>
  );
}

function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useTranslations('screens.parent.subscription');
  const text = useErrorText()(error);
  const router = useRouter();
  return (
    <Panel title={t('error.title')} className="border-danger">
      <InlineError message={text.message} recovery={text.recovery} />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={onRetry}>{t('error.retry')}</Button>
        <Button variant="secondary" onClick={() => router.push('/parent')}>
          {t('error.back')}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/')}>
          {t('error.home')}
        </Button>
      </div>
    </Panel>
  );
}

function CurrentPlan({ sub }: { sub: Subscription }) {
  const t = useTranslations('screens.parent.subscription');
  const format = useFormatter();
  const daysLeft = sub.status === 'trial' ? Math.max(0, daysUntil(sub.trial_ends_at, new Date()) || 0) : undefined;
  const date = sub.status === 'trial' ? sub.trial_ends_at : sub.renews_at;
  return (
    <Panel title={t('current.title')} tone="brand">
      <div className="flex flex-wrap items-center gap-3">
        <SubscriptionBadge status={sub.status} daysLeft={daysLeft} date={sub.status === 'trial' ? undefined : date} />
        <span className="font-display text-lg font-semibold">{t(`plans.${sub.plan}.name`)}</span>
      </div>
      <p className="mt-3 text-muted">
        {sub.status === 'active' && date && t('current.renews', { date: format.dateTime(new Date(date), { dateStyle: 'long' }) })}
        {sub.status === 'trial' && t('current.trial')}
        {sub.status === 'unpaid' && t('current.unpaid')}
        {sub.status === 'expired' && t('current.expired')}
        {sub.status === 'canceled' && date && t('current.canceled', { date: format.dateTime(new Date(date), { dateStyle: 'long' }) })}
      </p>
      {sub.marked_by_admin && <p className="mt-2 text-sm text-muted">{t('current.byAdmin')}</p>}
    </Panel>
  );
}

function PlanCard({ id, plan, selected, current, onSelect }: { id: PlanId; plan?: Plan; selected: boolean; current: boolean; onSelect?: () => void }) {
  const t = useTranslations('screens.parent.subscription');
  const format = useFormatter();
  const price = id === 'free' ? 0 : plan?.price_cad;
  const features = t.raw(`plans.${id}.features`) as string[];
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 pr-8">
        <span className="font-display text-lg font-semibold">{t(`plans.${id}.name`)}</span>
        {current && <span className="rounded-full bg-sunken px-2 py-0.5 text-sm font-semibold">{t('plans.current')}</span>}
      </div>
      <p className="font-display text-2xl font-bold">
        {price === undefined ? t('plans.priceUnknown') : price === 0 ? t('plans.priceFree') : format.number(price, { style: 'currency', currency: 'CAD' })}
        {price ? <span className="ml-1 text-base font-normal text-muted">{t(id === 'family_yearly' ? 'plans.perYear' : 'plans.perMonth')}</span> : null}
      </p>
      <ul className="flex flex-col gap-1 text-muted">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Icon name="check" size={18} className="mt-0.5 text-success" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </>
  );
  if (!onSelect) return <div className="relative flex flex-col gap-2 rounded-lg border-2 border-line bg-sunken p-4 text-fg">{body}</div>;
  return (
    <RadioCard name="plan" value={id} checked={selected} onChange={onSelect}>
      {body}
    </RadioCard>
  );
}

/** Subscription page: current plan, plan choice and the billing portal. */
export function ManageSubscription() {
  const t = useTranslations('screens.parent.subscription');
  const format = useFormatter();
  const errorText = useErrorText();
  const router = useRouter();
  const subQ = useSubscription();
  const plansQ = usePlans();
  const checkout = useCheckout();
  const cancel = useCancelSubscription();
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [done, setDone] = useState<'subscribed' | 'canceled' | null>(null);

  const sub = subQ.data;
  const chosen: PlanId = plan ?? (sub && PAID.includes(sub.plan) ? sub.plan : 'family_monthly');
  const byId = useMemo(() => new Map((plansQ.data ?? []).map((p) => [p.id, p])), [plansQ.data]);
  const sameAsCurrent = sub?.status === 'active' && sub.plan === chosen;
  const hasPlan = sub?.status === 'active' || sub?.status === 'trial' || sub?.status === 'unpaid';

  function subscribe() {
    checkout.mutate(
      { plan: chosen, method },
      {
        onSuccess: (r) => {
          // A real provider answers with its hosted page; payment never happens inside this app.
          if (r.checkout_url && /^https:\/\//.test(r.checkout_url)) window.location.assign(r.checkout_url);
          else setDone('subscribed');
        },
      },
    );
  }

  function doCancel() {
    cancel.mutate(undefined, {
      onSuccess: () => {
        setConfirmCancel(false);
        setDone('canceled');
      },
    });
  }

  if (done === 'subscribed') {
    return (
      <ParentPage title={t('title')} backHref="/parent">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <Panel tone="brand" className="nx-pop">
            <MascotBubble pose="cheer" size="lg">
              <p className="font-display text-xl font-semibold" role="status">
                {t('success.title')}
              </p>
              <p className="text-muted">{t('success.text')}</p>
            </MascotBubble>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => router.push('/parent')}>{t('success.done')}</Button>
            </div>
          </Panel>
        </div>
      </ParentPage>
    );
  }

  return (
    <ParentPage title={t('title')} backHref="/parent">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        {subQ.isLoading && <Skeleton shape="block" className="h-[252px] sm:h-[188px]" />}
        {subQ.error && <ErrorPanel error={subQ.error} onRetry={() => void subQ.refetch()} />}
        {sub && (
          <>
            <CurrentPlan sub={sub} />
            {done === 'canceled' && (
              <p role="status" className="rounded-md border-2 border-info bg-sunken p-3 font-semibold">
                {t('canceledNote')}
              </p>
            )}

            <Panel title={t('plans.title')}>
              {plansQ.error && <ErrorPanel error={plansQ.error} onRetry={() => void plansQ.refetch()} />}
              {plansQ.isLoading && <Skeleton shape="block" className="h-[640px] sm:h-[270px]" />}
              {plansQ.data && (
                <fieldset className="grid gap-3 sm:grid-cols-3">
                  <legend className="sr-only">{t('plans.title')}</legend>
                  <PlanCard id="free" selected={false} current={sub.plan === 'free'} />
                  {PAID.map((id) => (
                    <PlanCard key={id} id={id} plan={byId.get(id)} selected={chosen === id} current={sub.plan === id && sub.status === 'active'} onSelect={() => setPlan(id)} />
                  ))}
                </fieldset>
              )}
            </Panel>

            <Panel title={t('method.title')}>
              <p className="mb-3 text-muted">{t('method.secure')}</p>
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">{t('method.title')}</legend>
                {METHODS.map((m) => (
                  <RadioCard key={m} name="method" value={m} checked={method === m} onChange={() => setMethod(m)}>
                    <span className="font-display font-semibold">{t(`method.${m}.name`)}</span>
                    <span className="text-sm text-muted">{t(`method.${m}.hint`)}</span>
                  </RadioCard>
                ))}
              </fieldset>
              <p className="mt-3 flex items-start gap-2 text-sm text-muted">
                <Icon name="lock" size={16} className="mt-0.5" />
                <span>{t('method.testNote')}</span>
              </p>
            </Panel>

            {checkout.error && (
              <InlineError message={errorText(checkout.error).message} recovery={errorText(checkout.error).recovery} />
            )}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" loading={checkout.isPending} disabled={sameAsCurrent || !plansQ.data} onClick={subscribe}>
                {checkout.error ? t('actions.retry') : sub.status === 'active' ? t('actions.change') : t('actions.subscribe')}
              </Button>
              {hasPlan && sub.status !== 'unpaid' && (
                <Button size="lg" variant="secondary" onClick={() => setConfirmCancel(true)}>
                  {t('actions.cancel')}
                </Button>
              )}
            </div>
            {sameAsCurrent && <p className="text-sm text-muted">{t('actions.samePlan')}</p>}
          </>
        )}
      </div>

      <Dialog
        open={confirmCancel}
        onOpenChange={(o) => !cancel.isPending && setConfirmCancel(o)}
        title={t('cancelDialog.title')}
        description={
          sub?.renews_at
            ? t('cancelDialog.textUntil', { date: format.dateTime(new Date(sub.renews_at), { dateStyle: 'long' }) })
            : t('cancelDialog.text')
        }
        tone="danger"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)} disabled={cancel.isPending}>
              {t('cancelDialog.keep')}
            </Button>
            <Button variant="danger" loading={cancel.isPending} onClick={doCancel}>
              {cancel.error ? t('actions.retry') : t('cancelDialog.confirm')}
            </Button>
          </>
        }
      >
        {cancel.error && <InlineError message={errorText(cancel.error).message} recovery={errorText(cancel.error).recovery} />}
      </Dialog>
    </ParentPage>
  );
}
