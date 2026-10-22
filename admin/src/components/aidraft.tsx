'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import { TYPES, type QuestRow, type WorldRow } from '@/lib/qtypes';
import { Button, ErrorPanel, Input, Modal, Select, errText } from './ui';

/** The server saves the AI result as a DRAFT (ai_drafted, author ai:<model>); a human edits it, and someone other than the author publishes it. */
export function AiDraft({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const locale = useUI((s) => s.locale);
  const worlds = useQuery({ queryKey: ['api', 'worlds'], queryFn: () => api<{ items: WorldRow[] }>('worlds') });
  const quests = useQuery({ queryKey: ['api', 'quests'], queryFn: () => api<{ items: QuestRow[] }>('quests') });
  const [f, setF] = useState({ world: '', quest: '', type: 'numeric', difficulty: '3', topic_hint: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const list = (quests.data?.items ?? []).filter((q) => !f.world || q.world === f.world);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value, ...(k === 'world' ? { quest: '' } : {}) });
  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ question: { id: string }; valid: boolean }>('questions/ai-draft', { method: 'POST', body: { quest: f.quest, type: f.type, difficulty: Number(f.difficulty), topic_hint: f.topic_hint, language_primary: locale } });
      onClose();
      router.push(`/questions/${r.question.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e : new ApiError('network_error', 0));
    } finally {
      setBusy(false);
    }
  }
  const notConfigured = err?.status === 503 && (err.body as { code?: string } | undefined)?.code === 'not_configured';
  return (
    <Modal open={open} onClose={onClose} title={t('q.ai_title')}>
      <p className="mb-3 text-sm text-muted">{t('q.ai_body')}</p>
      {notConfigured ? (
        <div role="alert" className="mb-3 rounded-xl border border-warning/50 bg-warning-soft p-3 text-sm text-warning">
          <b>{t('q.ai_off')}</b> {t('q.ai_off_body')}
        </div>
      ) : (
        err && <ErrorPanel message={errText(err, t)} />
      )}
      <div className="grid gap-3">
        <Select label={t('q.world')} value={f.world} onChange={set('world')}>
          <option value="">{t('common.all')}</option>
          {worlds.data?.items.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name[locale]}
            </option>
          ))}
        </Select>
        <Select label={t('q.quest')} value={f.quest} onChange={set('quest')}>
          <option value="">{t('q.pick_quest')}</option>
          {list.map((q) => (
            <option key={q.id} value={q.id}>
              {q.id} ({q.name[locale]})
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select label={t('q.type')} value={f.type} onChange={set('type')}>
            {TYPES.map((k) => (
              <option key={k} value={k}>
                {t(`q.type.${k}` as 'q.type.numeric')}
              </option>
            ))}
          </Select>
          <Select label={t('q.difficulty')} value={f.difficulty} onChange={set('difficulty')}>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </div>
        <Input label={t('q.topic_hint')} value={f.topic_hint} maxLength={200} onChange={set('topic_hint')} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" disabled={busy || !f.quest} onClick={go}>
          {busy ? t('common.working') : t('q.ai_go')}
        </Button>
      </div>
    </Modal>
  );
}
