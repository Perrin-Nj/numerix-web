'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAct } from '@/lib/hooks';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import { TYPES, clientIssues, newQuestion, problemOf, retype, type Issue, type QStatus, type QType, type Question, type QuestRow, type QuestionView, type WorldRow } from '@/lib/qtypes';
import { Badge, Button, Card, ConfirmDialog, DataState, Input, PageTitle, Select, Skeleton, errText, type ConfirmSpec } from '@/components/ui';
import { Area, IssueLines, LocPair, issuesFor, statusTone } from '@/components/qfields';
import { AnswerEditor } from '@/components/qanswer';
import { ChildPreview } from '@/components/qpreview';
import { MediaList, MediaPicker } from '@/components/qmedia';
import { History } from '@/components/qhistory';

function TagsInput({ tags, onChange, label, error }: { tags: string[]; onChange: (t: string[]) => void; label: string; error?: Issue[] }) {
  const parse = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const [txt, setTxt] = useState(tags.join(', '));
  // external change (restore, reload): resync during render, only when the parsed text differs
  const [seen, setSeen] = useState(tags.join('|'));
  if (seen !== tags.join('|')) {
    setSeen(tags.join('|'));
    if (parse(txt).join('|') !== tags.join('|')) setTxt(tags.join(', '));
  }
  return (
    <div>
      <Input
        label={label}
        value={txt}
        onChange={(e) => {
          setTxt(e.target.value);
          onChange(parse(e.target.value));
        }}
      />
      <IssueLines issues={error ?? []} />
    </div>
  );
}

function VisualEditor({ q, set }: { q: Question; set: (fn: (q: Question) => Question) => void }) {
  const t = useT();
  const v = q.visual ?? { kind: 'bars', data: {} };
  const [txt, setTxt] = useState(JSON.stringify(v.data, null, 1));
  const [err, setErr] = useState('');
  const [seen, setSeen] = useState(JSON.stringify(v.data));
  if (seen !== JSON.stringify(v.data)) {
    setSeen(JSON.stringify(v.data));
    let same = false;
    try {
      same = JSON.stringify(JSON.parse(txt)) === JSON.stringify(v.data);
    } catch {
      /* mid-edit: keep the user's text */
      same = true;
    }
    if (!same) setTxt(JSON.stringify(v.data, null, 1));
  }
  return (
    <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
      <Select label={t('q.visual_kind')} value={v.kind} onChange={(e) => set((x) => ({ ...x, visual: { kind: e.target.value, data: v.data } }))}>
        {['bars', 'pictograph', 'clock', 'numberline', 'grid', 'fraction', 'dice'].map((k) => (
          <option key={k}>{k}</option>
        ))}
      </Select>
      <div>
        <Area
          label={t('q.visual_data')}
          rows={6}
          value={txt}
          spellCheck={false}
          className="font-mono"
          onChange={(e) => {
            setTxt(e.target.value);
            try {
              const data = JSON.parse(e.target.value);
              setErr('');
              set((x) => ({ ...x, visual: { kind: v.kind, data } }));
            } catch (x) {
              setErr((x as Error).message);
            }
          }}
          issues={err ? [{ code: 'json', field: 'visual', message: err }] : []}
        />
      </div>
    </div>
  );
}

export default function QuestionEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const act = useAct();
  const toast = useUI((s) => s.toast);
  const locale = useUI((s) => s.locale);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [draft, setDraft] = useState<Question | null>(null);
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [pick, setPick] = useState(false);
  const [server, setServer] = useState<{ issues: Issue[]; at: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'preview' | 'history'>('preview');

  const view = useQuery({ queryKey: ['api', 'questions', id], queryFn: () => api<QuestionView>(`questions/${id}`), enabled: !isNew });
  const quests = useQuery({ queryKey: ['api', 'quests'], queryFn: () => api<{ items: QuestRow[] }>('quests') });
  const worlds = useQuery({ queryKey: ['api', 'worlds'], queryFn: () => api<{ items: WorldRow[] }>('worlds') });

  const base: Question | undefined = isNew ? undefined : view.data?.question;
  const initial = useMemo(() => base ?? newQuestion(), [base]);
  const q = draft ?? initial;
  const dirty = isNew ? draft !== null : draft !== null && JSON.stringify(draft) !== JSON.stringify(base);
  const set = (fn: (q: Question) => Question) => setDraft(fn(q));
  const quest = quests.data?.items.find((x) => x.id === q.quest);
  const status = (view.data?.status ?? 'draft') as QStatus;
  const mine = useMemo(() => clientIssues(q, quest), [q, quest]);
  const all = useMemo(() => {
    const seen = new Set<string>();
    return [...mine, ...(server?.issues ?? []), ...(!dirty ? (view.data?.issues ?? []) : [])].filter((i) => {
      const k = `${i.field}|${i.message}`;
      return seen.has(k) ? false : (seen.add(k), true);
    });
  }, [mine, server, view.data, dirty]);
  const errors = all.filter((i) => !i.warning);
  const warnings = all.filter((i) => i.warning);
  const f = (name: string) => issuesFor(all, name);
  const editable = status !== 'retired';

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      const p = problemOf(e);
      if (p.errors?.length) setServer({ at: Date.now(), issues: p.errors.map((x) => ({ code: 'server', field: x.field, message: x.message })) });
      toast('err', p.errors?.length ? t('q.n_errors', { n: p.errors.length }) : errText(e, t));
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      const body = { ...q, status: undefined };
      const r = isNew
        ? await api<QuestionView>('questions', { method: 'POST', body })
        : await api<QuestionView>(`questions/${id}`, { method: 'PUT', body, headers: { 'If-Match': String(view.data?.version) } });
      setDraft(null);
      setServer({ at: Date.now(), issues: r.issues ?? [] });
      await qc.invalidateQueries({ queryKey: ['api'] });
      toast('ok', t(r.issues?.some((i) => !i.warning) ? 'q.saved_issues' : 'q.saved'));
      if (isNew) router.replace(`/questions/${r.id}`);
    });

  const validate = () =>
    run(async () => {
      const r = await api<{ ok: boolean; issues: Issue[]; unverified: boolean }>('questions/validate', { method: 'POST', body: { ...q, status: 'draft' } });
      setServer({ at: Date.now(), issues: r.issues });
      toast(r.ok ? 'ok' : 'err', r.ok ? t('q.valid_ok') : t('q.n_errors', { n: r.issues.filter((i) => !i.warning).length }));
    });

  const transition = (to: QStatus, label: string, danger = false) =>
    setConfirm({
      title: label,
      body: dirty ? t('q.save_first') : t('q.transition_body', { id, to: t(`q.status.${to}` as 'q.status.draft') }),
      confirmLabel: label,
      danger,
      reason: { label: t('q.comment') },
      run: async (comment) => {
        if (dirty) throw new Error(t('q.save_first'));
        await act(() => api(`questions/${id}/transition`, { method: 'POST', body: { to, comment } }), t('q.moved', { to: t(`q.status.${to}` as 'q.status.draft') }));
        setServer(null);
      },
    });

  const duplicate = () =>
    run(async () => {
      const r = await api<QuestionView>('questions', { method: 'POST', body: { ...q, id: undefined, status: undefined, version: undefined } });
      await qc.invalidateQueries({ queryKey: ['api'] });
      toast('ok', t('q.duplicated', { id: r.id }));
      router.push(`/questions/${r.id}`);
    });

  const restore = (version: number) =>
    setConfirm({
      title: t('q.restore_title', { n: version }),
      body: t('q.restore_body'),
      confirmLabel: t('q.restore'),
      run: async () => {
        await act(() => api(`questions/${id}/restore`, { method: 'POST', body: { version } }), t('q.restored', { n: version }));
        setDraft(null);
      },
    });

  const header = (
    <PageTitle
      title={isNew ? t('q.new') : id}
      sub={isNew ? t('q.new_sub') : undefined}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && <Badge tone={statusTone[status]}>{t(`q.status.${status}` as 'q.status.draft')}</Badge>}
          {!isNew && <Badge>v{view.data?.version}</Badge>}
          {view.data?.ai_drafted && <Badge tone="info">{t('q.ai_chip')}</Badge>}
          {dirty && <Badge tone="warn">{t('q.unsaved')}</Badge>}
        </div>
      }
    />
  );

  const body = (
    <>
      <p className="mb-3">
        <Link href="/questions" className="text-sm font-semibold text-brand underline">
          {t('common.back_to', { where: t('nav.questions') })}
        </Link>
      </p>
      {header}
      <div className="sticky top-12 z-10 -mx-1 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-bg/95 p-2 backdrop-blur lg:top-0">
        <Button variant="primary" disabled={busy || !dirty || !editable || (!isNew && status === 'published' && false)} onClick={save}>
          {busy ? t('common.working') : t('common.save')}
        </Button>
        <Button disabled={busy} onClick={validate}>
          {t('q.validate_server')}
        </Button>
        {!isNew && (
          <>
            <Button disabled={busy} onClick={duplicate}>
              {t('q.duplicate')}
            </Button>
            <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
            {status === 'draft' && <Button onClick={() => transition('review', t('q.to_review'))}>{t('q.to_review')}</Button>}
            {(status === 'draft' || status === 'review') && (
              <Button variant="soft" onClick={() => transition('published', t('q.publish'))}>
                {t('q.publish')}
              </Button>
            )}
            {status === 'review' && <Button onClick={() => transition('draft', t('q.to_draft'))}>{t('q.to_draft')}</Button>}
            {status === 'published' && <Button onClick={() => transition('draft', t('q.unpublish'), true)}>{t('q.unpublish')}</Button>}
            {status === 'retired' && <Button onClick={() => transition('draft', t('q.unarchive'))}>{t('q.unarchive')}</Button>}
            {status !== 'retired' && (
              <Button variant="danger" className="ml-auto" onClick={() => transition('retired', t('q.archive'), true)}>
                {t('q.archive')}
              </Button>
            )}
          </>
        )}
      </div>
      {status === 'published' && !isNew && <p className="mb-3 rounded-xl bg-warning-soft p-3 text-sm text-warning">{t('q.published_edit_note')}</p>}
      {status === 'retired' && <p className="mb-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">{t('q.retired_note')}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <fieldset disabled={!editable} className="min-w-0 space-y-4">
          <Card title={t('q.section_meta')}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label={t('q.quest')}
                value={q.quest}
                disabled={!isNew}
                onChange={(e) => {
                  const nq = quests.data?.items.find((x) => x.id === e.target.value);
                  set((x) => ({ ...x, quest: e.target.value, skill: nq?.skill ?? '', grade: nq ? Math.min(Math.max(x.grade, nq.grade_min), nq.grade_max) : x.grade }));
                }}
              >
                <option value="">{t('q.pick_quest')}</option>
                {worlds.data?.items.map((w) => (
                  <optgroup key={w.id} label={w.name[locale]}>
                    {quests.data?.items
                      .filter((x) => x.world === w.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.id} ({x.name[locale]})
                        </option>
                      ))}
                  </optgroup>
                ))}
              </Select>
              <Select label={t('q.type')} value={q.type} onChange={(e) => set((x) => retype(x, e.target.value as QType))}>
                {TYPES.map((k) => (
                  <option key={k} value={k}>
                    {t(`q.type.${k}` as 'q.type.numeric')}
                  </option>
                ))}
              </Select>
              <Input label={t('q.skill')} value={q.skill} readOnly aria-readonly />
              <Select label={t('q.grade')} value={q.grade} onChange={(e) => set((x) => ({ ...x, grade: Number(e.target.value) }))}>
                {[1, 2, 3, 4, 5, 6].filter((g) => !quest || (g >= quest.grade_min && g <= quest.grade_max)).map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
              <Select label={t('q.difficulty')} value={q.difficulty} onChange={(e) => set((x) => ({ ...x, difficulty: Number(e.target.value) }))}>
                {[1, 2, 3, 4, 5].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
              <TagsInput label={t('q.tags')} tags={q.tags} onChange={(tags) => set((x) => ({ ...x, tags }))} error={f('tags')} />
            </div>
            <IssueLines issues={[...f('quest'), ...f('skill'), ...f('grade'), ...f('difficulty')]} />
          </Card>

          <Card title={t('q.section_text')}>
            <LocPair label={t('q.story')} field="story" value={q.story} onChange={(story) => set((x) => ({ ...x, story }))} issues={all} />
            <LocPair label={t('q.prompt')} field="prompt" value={q.prompt} onChange={(prompt) => set((x) => ({ ...x, prompt }))} issues={all} />
            <Input label={t('q.math_text')} value={q.math_text ?? ''} onChange={(e) => set((x) => ({ ...x, math_text: e.target.value || undefined }))} className="mb-3 max-w-md" />
            <IssueLines issues={f('math_text')} />
            <LocPair label={t('q.hint')} field="hint" value={q.hint} onChange={(hint) => set((x) => ({ ...x, hint }))} issues={all} />
            <LocPair label={t('q.explain')} field="explain" value={q.explain} onChange={(explain) => set((x) => ({ ...x, explain }))} issues={all} rows={3} />
          </Card>

          {q.type === 'visual' && (
            <Card title={t('q.section_visual')}>
              <VisualEditor q={q} set={set} />
            </Card>
          )}

          <Card title={t('q.section_answer')}>
            <AnswerEditor q={q} set={set} issues={all} />
          </Card>

          <Card title={t('q.section_media')} action={<Button small disabled={q.media.length >= 3} onClick={() => setPick(true)}>{t('q.media_add')}</Button>}>
            <MediaList media={q.media} onRemove={(i) => set((x) => ({ ...x, media: x.media.filter((_, k) => k !== i) }))} />
            {q.media.length === 0 && <p className="text-sm text-muted">{t('q.media_empty')}</p>}
            <IssueLines issues={f('media')} />
          </Card>
        </fieldset>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-16 lg:self-start">
          <Card>
            <div role="tablist" aria-label={t('q.side')} className="mb-3 flex gap-1">
              {(['preview', 'history'] as const).map((k) => (
                <Button key={k} small role="tab" aria-selected={tab === k} variant={tab === k ? 'soft' : 'ghost'} onClick={() => setTab(k)} disabled={k === 'history' && isNew}>
                  {t(k === 'preview' ? 'q.preview' : 'q.history')}
                </Button>
              ))}
            </div>
            {tab === 'preview' || isNew || !view.data ? <ChildPreview q={q} lang={lang} onLang={setLang} /> : <History view={view.data} onRestore={restore} dirty={dirty} />}
          </Card>
          <Card title={t('q.issues')} action={server ? <Badge tone="info">{t('q.server_checked')}</Badge> : <Badge>{t('q.live_checked')}</Badge>}>
            <div aria-live="polite">
              {errors.length === 0 ? <p className="text-sm text-success">{t('q.no_errors')}</p> : <p className="text-sm font-semibold text-danger">{t('q.n_errors', { n: errors.length })}</p>}
              <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto text-xs">
                {[...errors, ...warnings].map((i, k) => (
                  <li key={k} className={i.warning ? 'text-warning' : 'text-danger'}>
                    <b>{i.warning ? t('q.warning') : t('q.error')}</b> <code>{i.field}</code> {i.message}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </aside>
      </div>
      <MediaPicker key={String(pick)} open={pick} onClose={() => setPick(false)} world={quest?.world ?? ''} grade={q.grade} roles={['scene', 'object', 'visual', ...(q.choices ?? []).map((c) => `choice:${c.id}`)]} onPick={(m) => set((x) => ({ ...x, media: [...x.media, m] }))} />
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  );

  if (isNew) return body;
  return (
    <DataState q={view} skeleton={<Skeleton className="h-64 w-full" />}>
      {() => body}
    </DataState>
  );
}
