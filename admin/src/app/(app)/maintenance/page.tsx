'use client';
import { useT } from '@/lib/i18n';
import type { MaintenanceCfg } from '@/lib/types';
import { Input, Select, Switch } from '@/components/ui';
import { ConfigEditor } from '@/components/cfgeditor';

export default function MaintenancePage() {
  const t = useT();
  return (
    <ConfigEditor<MaintenanceCfg>
      ns="maintenance"
      title={t('nav.maintenance')}
      sub={t('maint.sub')}
      riskyBody={(d, server) => (d.enabled && d.block_play && !(server.enabled && server.block_play) ? t('maint.block_confirm') : null)}
    >
      {(d, patch) => (
        <div className="space-y-4">
          <Switch label={t('maint.enabled')} checked={d.enabled} onChange={(v) => patch({ enabled: v })} />
          <Select label={t('maint.level')} value={d.level} onChange={(e) => patch({ level: e.target.value as MaintenanceCfg['level'] })} className="max-w-xs">
            <option value="info">{t('maint.level_info')}</option>
            <option value="warning">{t('maint.level_warning')}</option>
            <option value="critical">{t('maint.level_critical')}</option>
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('maint.message_fr')} value={d.message.fr} maxLength={280} onChange={(e) => patch({ message: { ...d.message, fr: e.target.value } })} />
            <Input label={t('maint.message_en')} value={d.message.en} maxLength={280} onChange={(e) => patch({ message: { ...d.message, en: e.target.value } })} />
          </div>
          <Switch label={t('maint.block')} hint={t('maint.block_hint')} checked={d.block_play} onChange={(v) => patch({ block_play: v })} />
        </div>
      )}
    </ConfigEditor>
  );
}
