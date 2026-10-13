export type SubStatus = 'trial' | 'active' | 'unpaid' | 'expired' | 'canceled';
export type Plan = 'free' | 'family_monthly' | 'family_yearly';
export type Method = 'card' | 'interac' | 'paypal' | 'apple_pay' | 'google_pay';

export interface Subscription {
  status: SubStatus;
  plan: Plan;
  method?: Method;
  renews_at?: string;
  trial_ends_at?: string;
  marked_by_admin?: boolean;
}
export interface Parent {
  id: string;
  email: string;
  name: string;
  created_at: string;
  locale: string;
  status: 'active' | 'blocked';
  blocked_reason?: string;
  subscription: Subscription;
  children_count: number;
  children?: { id: string; display_name: string; grade: number; last_seen_at?: string }[];
}
export interface ChildSettings {
  daily_goal_chapters: number;
  daily_time_limit_minutes: number | null;
  enabled_worlds: string[];
  read_aloud: boolean;
  sound: boolean;
  kid_can_change_language: boolean;
}
export interface Child {
  id: string;
  parent_id: string;
  parent_name?: string | null;
  parent?: { id: string; name: string; email: string } | null;
  display_name: string;
  grade: number;
  avatar_id?: string;
  created_at?: string;
  last_seen_at?: string;
  minutes_today: number;
  sessions_total: number;
  cards_total: number;
  skills_mastered: number;
  settings: ChildSettings;
}
export interface Activity {
  sessions: { id: string; world: string; skill_name: string; started_at: string; status: string; correct: number; total: number; card_awarded: boolean }[];
  cards: { id: string; world: string; name: string; earned_at: string }[];
  skills: { skill_id: string; name: string; mastery_pct: number }[];
}
export interface PlatformConfig {
  card_threshold_pct: number;
  unpaid_policy: 'block' | 'allow';
  trial_days: number;
  daily_time_limit_minutes_default: number | null;
  reminder_hour_local: number;
  expiring_warning_days: number;
  default_locale: string;
  features: Record<string, boolean>;
}
export interface Bi {
  fr: string;
  en: string;
}
export interface PlanDef {
  id: Plan;
  price_cad_cents: number;
  period: 'none' | 'month' | 'year';
  name: Bi;
  features: { fr: string[]; en: string[] };
}
export interface MethodDef {
  id: Method;
  label: Bi;
}
export interface Plans {
  currency?: string;
  plans: PlanDef[];
  methods: MethodDef[];
}
export interface DayVal {
  date: string;
  value: number;
}
export interface Trend {
  date: string;
  parents: number;
  kids: number;
  paid: number;
  mrr_cad_cents: number;
  arpu_cad_cents: number;
  churn_30d: number;
  retention_pct: number;
}
export interface Overview {
  parents_total: number;
  by_subscription: Record<SubStatus, number>;
  blocked: number;
  kids_total: number;
  active_today: number;
  mrr_cad_cents: number;
  signups_30d_total: number;
  signups_by_day_30: { date: string; count: number }[];
  signups_by_month_12: { month: string; count: number }[];
  active_kids_by_day_30: DayVal[];
  minutes_by_day_30: DayVal[];
  sessions_by_day_30: DayVal[];
  activity_by_day_90: { date: string; active_kids: number; minutes: number; sessions: number }[];
  subscription_mix: { status: SubStatus; count: number }[];
  plan_mix: { plan: Plan; count: number; mrr_cad_cents: number }[];
  mrr_by_month_12: { month: string; mrr_cad_cents: number }[];
  kids_by_grade: { grade: number; count: number }[];
  retention: { pct: number; eligible: number; active: number };
  churn_30d: number;
  arpu_cad_cents: number;
  top_worlds: { world: string; sessions_30d: number }[];
  trend_30: Trend[];
}
export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  detail?: unknown;
}
export interface BroadcastRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
  audience: 'parent' | 'child';
  recipients: number;
  broadcast: boolean;
  parent_id: string | null;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
