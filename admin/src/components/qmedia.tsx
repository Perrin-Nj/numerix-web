'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, qs } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useUI } from '@/lib/store';
import { thumb, thumbById, type AssetRow, type Media, type WorldRow } from '@/lib/qtypes';
import { Badge, Button, DataState, Input, Modal, Select } from './ui';

interface Hit {
  score: number;
  asset: AssetRow;
}
const KINDS = ['', 'photo', 'sprite', 'vocab', 'illustration'];

/** Search assets by criteria (world, topic, object, mood, setting, kind, grade) and pick one explicitly or keep the criteria. */
export function MediaPicker({ open, onClose, world, grade, roles, onPick }: { open: boolean; onClose: () => void; world: string; grade: number; roles: string[]; onPick: (m: Media) => void }) {
  const t = useT();
  const locale = useUI((s) => s.locale);
  const [c, setC] = useState({ world, topic: '', object: '', mood: '', setting: '', kind: '', grade: String(grade) });
  const [run, setRun] = useState(c);
  const [role, setRole] = useState(roles[0] ?? 'scene');
  const worlds = useQuery({ queryKey: ['api', 'worlds'], queryFn: () => api<{ items: WorldRow[] }>('worlds') });
  const q = useQuery({ queryKey: ['api', 'assets/search', run], queryFn: () => api<{ items: Hit[] }>(`assets/search${qs(run)}`), enabled: open });
  const set = (k: keyof typeof c) => (e: { target: { value: string } }) => setC({ ...c, [k]: e.target.value });
  const criteria = () => Object.fromEntries(Object.entries({ world: c.world, topic: c.topic, object: c.object, mood: c.mood, kind: c.kind, setting: c.setting }).filter(([, v]) => v));
  return (
    <Modal open={open} onClose={onClose} title={t('q.media_title')} wide>
      <form
        className="mb-3 grid gap-2 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setRun(c);
        }}
      >
        <Select label={t('q.world')} value={c.world} onChange={set('world')}>
          <option value="">{t('common.all')}</option>
          {worlds.data?.items.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name[locale]}
            </option>
          ))}
        </Select>
        <Input label={t('q.topic')} value={c.topic} onChange={set('topic')} />
        <Input label={t('q.object')} value={c.object} onChange={set('object')} />
        <Input label={t('q.mood')} value={c.mood} onChange={set('mood')} />
        <Input label={t('q.setting')} value={c.setting} onChange={set('setting')} />
        <Select label={t('q.kind')} value={c.kind} onChange={set('kind')}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k || t('common.all')}
            </option>
          ))}
        </Select>
        <Select label={t('q.media_role')} value={role} onChange={(e) => setRole(e.target.value)}>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="primary">
            {t('common.search')}
          </Button>
        </div>
      </form>
      <div className="mb-3 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted">{t('q.media_hint')}</span>
        <Button small onClick={() => (onPick({ role, criteria: criteria() }), onClose())}>
          {t('q.media_criteria')}
        </Button>
      </div>
      <div className="max-h-[50dvh] overflow-y-auto">
        <DataState q={q} isEmpty={(d) => !d.items.length} emptyText={t('q.media_none')}>
          {(d) => (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {d.items.map(({ asset: a, score }) => (
                <li key={a.id} className="flex flex-col rounded-xl border border-line bg-sunken/40 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(a)} alt={locale === 'fr' ? a.alt_fr : a.alt_en} loading="lazy" className="h-24 w-full rounded-lg bg-sunken object-contain" />
                  <p className="mt-1 line-clamp-2 text-xs">{locale === 'fr' ? a.alt_fr : a.alt_en}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge tone="info">{a.licence}</Badge>
                    <Badge>{a.kind}</Badge>
                    <Badge>{score}</Badge>
                  </div>
                  <Button small className="mt-2" onClick={() => (onPick({ role, asset: a.id }), onClose())}>
                    {t('q.media_use')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DataState>
      </div>
    </Modal>
  );
}

export function MediaList({ media, onRemove }: { media: Media[]; onRemove: (i: number) => void }) {
  const t = useT();
  return (
    <ul className="mb-3 space-y-2">
      {media.map((m, i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl border border-line p-2">
          {m.asset ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbById(m.asset)} alt="" className="size-14 rounded-lg bg-sunken object-cover" />
          ) : (
            <span className="grid size-14 place-items-center rounded-lg bg-sunken text-xs text-muted">{t('q.media_crit_short')}</span>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <Badge tone="brand">{m.role}</Badge>
            <p className="truncate font-mono text-xs text-muted">{m.asset ?? JSON.stringify(m.criteria)}</p>
          </div>
          <Button small onClick={() => onRemove(i)} aria-label={`${t('q.remove')} ${m.role}`}>
            {t('q.remove')}
          </Button>
        </li>
      ))}
    </ul>
  );
}
