/** Hand written from docs/PLAN_V4.md (contract section). Replaced by generated types once the OpenAPI regen lands. */
/** `trial` is never sent to parent or child tokens (a running trial reads `active`). */
export type SubscriptionStatus = 'active' | 'unpaid' | 'expired' | 'canceled';
export type PlanId = 'free' | 'family_monthly' | 'family_yearly';
export type PaymentMethod = 'card' | 'interac' | 'paypal' | 'apple_pay' | 'google_pay';

export type Subscription = {
  status: SubscriptionStatus;
  plan: PlanId;
  method?: PaymentMethod;
  renews_at?: string;
  /** Neutral end of the current access period. The only date the parent view may show. */
  access_until?: string | null;
  marked_by_admin?: boolean;
};

export type Plan = { id: PlanId; price_cad: number; interval?: 'month' | 'year' | null; name?: { fr?: string; en?: string } };

export type CheckoutRequest = { plan: PlanId; method: PaymentMethod };
/** Development completes at once and returns the new subscription. A real provider returns a hosted page URL (BE-24). */
export type CheckoutResult = { subscription?: Subscription; checkout_url?: string };

export type ServerNotificationKind = 'play_reminder' | 'time_limit' | 'subscription_expiring' | 'payment_due' | 'announcement';

export type ServerNotification = {
  id: string;
  kind: ServerNotificationKind;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  audience: 'parent' | 'child';
};

export type PlatformPublic = {
  unpaid_policy: 'block' | 'allow';
  card_threshold_pct: number;
  expiring_warning_days?: number;
  reminder_hour_local?: number;
  daily_time_limit_minutes_default?: number;
};

/** Shown in the bell: server notifications and local reminders share this shape. */
export type AppNotification = {
  id: string;
  kind: ServerNotificationKind;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  local?: boolean;
};
