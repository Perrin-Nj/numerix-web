'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, asList } from './api';
import { useUI } from './store';
import { errText, type ConfirmSpec } from '@/components/ui';
import { useT } from './i18n';
import type { Parent } from './types';

export const useApi = <T,>(path: string) => useQuery({ queryKey: ['api', path], queryFn: () => api<T>(path) });

/** Runs a mutation, toasts the success text or the server message, refreshes every query. Rethrows so dialogs stay open. */
export function useAct() {
  const qc = useQueryClient();
  const toast = useUI((s) => s.toast);
  const t = useT();
  return async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      const r = await fn();
      toast('ok', okMsg);
      await qc.invalidateQueries({ queryKey: ['api'] });
      return r;
    } catch (e) {
      toast('err', errText(e, t));
      throw e;
    }
  };
}

/** Local editable copy of server data; resets when the server copy changes (after save or refetch). */
export function useDraft<T>(server: T | undefined) {
  const base = JSON.stringify(server ?? null);
  const [draft, setDraft] = useState<T | undefined>();
  const [seen, setSeen] = useState(base);
  if (seen !== base) {
    setSeen(base);
    setDraft(undefined);
  }
  const cur = draft ?? server;
  const dirty = draft !== undefined && JSON.stringify(draft) !== base;
  return { cur, set: setDraft, dirty, reset: () => setDraft(undefined) };
}

export function useParentActions(ask: (s: ConfirmSpec) => void) {
  const act = useAct();
  const t = useT();
  const patch = (id: string, body: unknown, msg: string) => act(() => api(`parents/${id}`, { method: 'PATCH', body }), msg);
  const paidPlan = (p: Parent) => (p.subscription.plan === 'free' ? 'family_monthly' : p.subscription.plan);
  return {
    patch,
    paid: (p: Parent) =>
      ask({
        title: t('act.paid.title', { name: p.name }),
        body: t('act.paid.body'),
        confirmLabel: t('act.paid'),
        run: () => patch(p.id, { subscription: { status: 'active', plan: paidPlan(p) } }, t('toast.paid')),
      }),
    unpaid: (p: Parent) =>
      ask({
        title: t('act.unpaid.title', { name: p.name }),
        body: t('act.unpaid.body'),
        confirmLabel: t('act.unpaid'),
        danger: true,
        run: () => patch(p.id, { subscription: { status: 'unpaid' } }, t('toast.unpaid')),
      }),
    block: (p: Parent) =>
      ask({
        title: t('act.block.title', { name: p.name }),
        body: t('act.block.body'),
        confirmLabel: t('act.block'),
        danger: true,
        reason: { label: t('act.block.reason'), required: true },
        run: (reason) => patch(p.id, { status: 'blocked', blocked_reason: reason }, t('toast.blocked')),
      }),
    unblock: (p: Parent) =>
      ask({
        title: t('act.unblock.title', { name: p.name }),
        confirmLabel: t('act.unblock'),
        run: () => patch(p.id, { status: 'active' }, t('toast.unblocked')),
      }),
  };
}

export { asList };
