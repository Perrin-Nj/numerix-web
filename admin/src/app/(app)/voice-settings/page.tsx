'use client';
import { useT } from '@/lib/i18n';
import type { VoiceCfg } from '@/lib/types';
import { Button, Input, Select, Switch } from '@/components/ui';
import { ConfigEditor } from '@/components/cfgeditor';

export default function VoicePage() {
  const t = useT();
  return (
    <ConfigEditor<VoiceCfg> ns="voice" title={t('nav.voicecfg')} sub={t('voice.sub')}>
      {(d, patch) => {
        const setClip = (i: number, p: Partial<VoiceCfg['clips'][number]>) => patch({ clips: d.clips.map((x, j) => (j === i ? { ...x, ...p } : x)) });
        return (
          <div className="space-y-4">
            <Switch label={t('voice.human_default')} checked={d.human_enabled_default} onChange={(v) => patch({ human_enabled_default: v })} />
            <Switch label={t('voice.computer_allowed')} checked={d.computer_voice_allowed} onChange={(v) => patch({ computer_voice_allowed: v })} />
            <h3 className="font-display text-base font-semibold">{t('voice.clips')}</h3>
            {d.clips.length === 0 && <p className="text-sm text-muted">{t('voice.no_clips')}</p>}
            <ul className="space-y-3">
              {d.clips.map((c, i) => (
                <li key={i} className="grid items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_8rem_2fr_auto_auto]">
                  <Input label={t('voice.line_id')} value={c.line_id} onChange={(e) => setClip(i, { line_id: e.target.value })} />
                  <Select label={t('voice.locale')} value={c.locale} onChange={(e) => setClip(i, { locale: e.target.value as 'fr-CA' | 'en-CA' })}>
                    <option value="fr-CA">FR (CA)</option>
                    <option value="en-CA">EN (CA)</option>
                  </Select>
                  <Input label={t('voice.url')} value={c.url} onChange={(e) => setClip(i, { url: e.target.value })} />
                  <Switch label={t('voice.on')} checked={c.enabled} onChange={(v) => setClip(i, { enabled: v })} />
                  <Button small onClick={() => patch({ clips: d.clips.filter((_, j) => j !== i) })}>
                    {t('cfg.remove')}
                  </Button>
                </li>
              ))}
            </ul>
            <Button onClick={() => patch({ clips: [...d.clips, { line_id: '', locale: 'fr-CA', url: '/voice/', enabled: true }] })}>{t('voice.add')}</Button>
          </div>
        );
      }}
    </ConfigEditor>
  );
}
