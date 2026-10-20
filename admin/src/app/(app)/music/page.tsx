'use client';
import { useT } from '@/lib/i18n';
import type { MusicCfg } from '@/lib/types';
import { Button, Input, Switch } from '@/components/ui';
import { ConfigEditor } from '@/components/cfgeditor';

export default function MusicPage() {
  const t = useT();
  return (
    <ConfigEditor<MusicCfg> ns="music" title={t('nav.music')} sub={t('music.sub')}>
      {(d, patch) => {
        const setTrack = (i: number, p: Partial<MusicCfg['tracks'][number]>) => patch({ tracks: d.tracks.map((x, j) => (j === i ? { ...x, ...p } : x)) });
        return (
          <div className="space-y-4">
            <Switch label={t('music.enabled')} checked={d.enabled} onChange={(v) => patch({ enabled: v })} />
            <Input label={t('music.default_volume')} type="number" min={0} max={100} value={d.default_volume} onChange={(e) => patch({ default_volume: Number(e.target.value) })} className="max-w-xs" />
            <h3 className="font-display text-base font-semibold">{t('music.tracks')}</h3>
            <ul className="space-y-3">
              {d.tracks.map((tr, i) => (
                <li key={i} className="grid items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
                  <Input label={t('music.track_id')} value={tr.id} onChange={(e) => setTrack(i, { id: e.target.value })} />
                  <Input label={t('music.track_fr')} value={tr.title.fr} onChange={(e) => setTrack(i, { title: { ...tr.title, fr: e.target.value } })} />
                  <Input label={t('music.track_en')} value={tr.title.en} onChange={(e) => setTrack(i, { title: { ...tr.title, en: e.target.value } })} />
                  <Switch label={t('music.track_on')} checked={tr.enabled} onChange={(v) => setTrack(i, { enabled: v })} />
                  <Button small onClick={() => patch({ tracks: d.tracks.filter((_, j) => j !== i) })}>
                    {t('cfg.remove')}
                  </Button>
                </li>
              ))}
            </ul>
            <Button onClick={() => patch({ tracks: [...d.tracks, { id: '', title: { fr: '', en: '' }, enabled: true }] })}>{t('music.add')}</Button>
          </div>
        );
      }}
    </ConfigEditor>
  );
}
