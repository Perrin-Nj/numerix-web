'use client';
import { useT } from '@/lib/i18n';
import type { FeedCfg } from '@/lib/types';
import { Input, Switch } from '@/components/ui';
import { ConfigEditor } from '@/components/cfgeditor';

export default function FeedPage() {
  const t = useT();
  return (
    <ConfigEditor<FeedCfg> ns="feed" title={t('nav.feed')} sub={t('feed.sub')}>
      {(d, patch) => (
        <div className="space-y-4">
          <Switch label={t('feed.discover')} checked={d.discover_enabled} onChange={(v) => patch({ discover_enabled: v })} />
          <Switch label={t('feed.board')} checked={d.family_board_visible} onChange={(v) => patch({ family_board_visible: v })} />
          <div>
            <Input label={t('feed.stretch')} type="number" min={0} max={2} value={d.max_grade_stretch} onChange={(e) => patch({ max_grade_stretch: Number(e.target.value) })} className="max-w-xs" />
            <p className="mt-1 text-xs text-muted">{t('feed.stretch_hint')}</p>
          </div>
          <div>
            <label htmlFor="hidden" className="mb-1 block text-sm font-medium text-muted">
              {t('feed.hidden')}
            </label>
            <textarea
              id="hidden"
              rows={6}
              value={d.hidden_item_ids.join('\n')}
              onChange={(e) => patch({ hidden_item_ids: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
              className="w-full rounded-xl border-2 border-line bg-elevated p-3 font-mono text-sm text-fg focus:border-brand"
            />
            <p className="mt-1 text-xs text-muted">{t('feed.hidden_hint')}</p>
          </div>
        </div>
      )}
    </ConfigEditor>
  );
}
