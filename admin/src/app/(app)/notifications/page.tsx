'use client';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAct, useApi } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import type { BroadcastRow, Page } from '@/lib/types';
import type { Key } from '@/messages/fr';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, PageTitle, Select, fmtDate, type ConfirmSpec } from '@/components/ui';
import { Pager } from '@/components/parts';

type Audience = 'parent' | 'child' | 'all';
const SIZE = 10;

export default function NotificationsPage() {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const act = useAct();
  const [page, setPage] = useState(1);
  const q = useApi<Page<BroadcastRow>>(`notifications?page=${page}&page_size=${SIZE}`);
  const [audience, setAudience] = useState<Audience>('parent');
  const [sub, setSub] = useState('all');
  const [acct, setAcct] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const filter = { ...(sub !== 'all' ? { subscription: sub } : {}), ...(acct !== 'all' ? { status: acct } : {}) };
    const targets: ('parent' | 'child')[] = audience === 'all' ? ['parent', 'child'] : [audience];
    setConfirm({
      title: t('nt.confirm_title'),
      body: t('nt.confirm_body', { who: t(`aud.${audience === 'parent' ? 'parents' : audience === 'child' ? 'children' : 'all'}` as Key) }),
      confirmLabel: t('nt.send'),
      run: async () => {
        await act(
          () => Promise.all(targets.map((a) => api('notifications/broadcast', { method: 'POST', body: { audience: a, title: title.trim(), body: body.trim(), filter } }))),
          t('toast.sent'),
        );
        setTitle('');
        setBody('');
      },
    });
  }

  return (
    <>
      <PageTitle title={t('nav.notifications')} sub={t('nt.sub')} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <Card title={t('nt.compose')}>
          <form onSubmit={submit} className="space-y-3">
            <Select label={t('nt.audience')} value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              <option value="parent">{t('aud.parents')}</option>
              <option value="child">{t('aud.children')}</option>
              <option value="all">{t('aud.all')}</option>
            </Select>
            <Select label={t('nt.f_sub')} value={sub} onChange={(e) => setSub(e.target.value)}>
              <option value="all">{t('common.all')}</option>
              {(['active', 'trial', 'unpaid', 'expired', 'canceled'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`sub.${s}`)}
                </option>
              ))}
            </Select>
            <Select label={t('nt.f_status')} value={acct} onChange={(e) => setAcct(e.target.value)}>
              <option value="all">{t('common.all')}</option>
              <option value="active">{t('acct.active')}</option>
              <option value="blocked">{t('acct.blocked')}</option>
            </Select>
            <Input label={t('nt.title')} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            <div>
              <label htmlFor="nt-body" className="mb-1 block text-sm font-medium text-muted">
                {t('nt.body')}
              </label>
              <textarea
                id="nt-body"
                rows={4}
                maxLength={400}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-xl border border-line bg-elevated p-3 text-sm focus:border-brand"
              />
            </div>
            <Button type="submit" variant="primary" disabled={!title.trim() || !body.trim()}>
              {t('nt.send')}
            </Button>
          </form>
        </Card>
        <Card title={t('nt.history')}>
          <DataState q={q} isEmpty={(d) => !d.items.length} emptyText={t('nt.empty')}>
            {(d) => (
              <>
                <ul className="divide-y divide-line">
                  {d.items.map((n) => (
                    <li key={n.id} className="py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">{t(`nk.${n.kind}` as Key)}</Badge>
                        <Badge>{n.audience === 'child' ? t('aud.child') : t('aud.parent')}</Badge>
                        <Badge tone="info">{t('nt.recipients', { n: n.recipients })}</Badge>
                        <span className="font-semibold">{n.title}</span>
                        <span className="ml-auto text-xs text-muted">{fmtDate(n.created_at, locale)}</span>
                      </div>
                      <p className="mt-1 text-muted">{n.body}</p>
                    </li>
                  ))}
                </ul>
                <Pager page={d.page} total={d.total} size={d.page_size} onPage={setPage} />
              </>
            )}
          </DataState>
        </Card>
      </div>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
