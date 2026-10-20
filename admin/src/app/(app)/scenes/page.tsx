'use client';
import { useT } from '@/lib/i18n';
import type { ScenesCfg } from '@/lib/types';
import { Input, Switch } from '@/components/ui';
import { ConfigEditor } from '@/components/cfgeditor';

const FAMILIES = ['number', 'add_sub', 'mult_div', 'fractions', 'geometry', 'measure', 'data', 'time'] as const;

export default function ScenesPage() {
  const t = useT();
  return (
    <ConfigEditor<ScenesCfg> ns="scenes" title={t('nav.scenes')} sub={t('scenes.sub')}>
      {(d, patch) => {
        const setFam = (f: string, p: Partial<ScenesCfg['families'][string]>) =>
          patch({ families: { ...d.families, [f]: { ...(d.families[f] ?? { enabled: true, disabled_variants: [] }), ...p } } });
        return (
          <div className="space-y-4">
            <Switch label={t('scenes.physics')} hint={t('scenes.physics_hint')} checked={d.physics_enabled} onChange={(v) => patch({ physics_enabled: v })} />
            <ul className="space-y-3">
              {FAMILIES.map((f) => {
                const fam = d.families[f] ?? { enabled: true, disabled_variants: [] };
                return (
                  <li key={f} className="grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[14rem_1fr]">
                    <Switch label={t(`scenes.f.${f}`)} hint={t('scenes.family_on')} checked={fam.enabled} onChange={(v) => setFam(f, { enabled: v })} />
                    <Input
                      label={t('scenes.variants')}
                      value={fam.disabled_variants.join(', ')}
                      onChange={(e) => setFam(f, { disabled_variants: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }}
    </ConfigEditor>
  );
}
