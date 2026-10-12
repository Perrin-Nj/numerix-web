import { useCallback, useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { VirtualFeed } from './VirtualFeed';
import { Icon } from '@/ui/icon';
import { Mascot, type MascotConfig } from '@/game/mascot';

type Entry = { id: string; title: string; world: string; day: string; stars: number };

const WORLDS = ['Nature', 'Espace', 'Cuisine', 'Sport', 'Science'];
const DAYS = ['Aujourd’hui', 'Hier', 'Cette semaine', 'Le mois dernier', 'Plus tôt'];

const makeEntries = (from: number, count: number): Entry[] =>
  Array.from({ length: count }, (_, i) => {
    const n = from + i;
    return {
      id: `e${n}`,
      title: `Chapitre ${n + 1}`,
      world: WORLDS[n % WORLDS.length],
      day: DAYS[Math.min(DAYS.length - 1, Math.floor(n / 12))],
      stars: (n % 3) + 1,
    };
  });

const on: MascotConfig = { enabled: true, kind: 'emoji', emoji: '🦊', src: '' };
const off: MascotConfig = { ...on, enabled: false };

function Row({ entry, mascot }: { entry: Entry; mascot?: MascotConfig }) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-md border-2 border-line bg-elevated p-3 text-fg shadow-1">
      {mascot && <Mascot config={mascot} size="sm" />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-semibold">{entry.title}</p>
        <p className="text-sm text-muted">{entry.world}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm">
        <Icon name="star" size={16} /> {entry.stars}
      </span>
    </div>
  );
}

const getKey = (e: Entry) => e.id;
const groupBy = (e: Entry) => e.day;

/** Simulates a cursor-paged API: 500 ms latency, pages of 20, `total` entries. */
function Paged({ total, mascot, grouped, failAt }: { total: number; mascot?: MascotConfig; grouped?: boolean; failAt?: number }) {
  const [items, setItems] = useState<Entry[]>(() => makeEntries(0, Math.min(20, total)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const recovered = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const count = useRef(items.length);
  useEffect(() => {
    count.current = items.length;
  }, [items.length]);

  const loadMore = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(false);
    timer.current = setTimeout(() => {
      busy.current = false;
      setLoading(false);
      if (failAt !== undefined && count.current >= failAt && !recovered.current) {
        recovered.current = true;
        setError(true);
        return;
      }
      setItems((cur) => [...cur, ...makeEntries(cur.length, Math.min(20, total - cur.length))]);
    }, 500);
  }, [total, failAt]);

  return (
    <VirtualFeed
      ariaLabel="Mes chapitres"
      items={items}
      getKey={getKey}
      estimateSize={80}
      hasMore={items.length < total}
      loadMore={loadMore}
      loading={loading}
      error={error}
      onRetry={() => {
        setError(false);
        loadMore();
      }}
      groupBy={grouped ? groupBy : undefined}
      renderItem={(e) => <Row entry={e} mascot={mascot} />}
    />
  );
}

const meta = {
  title: 'ui/VirtualFeed',
  component: VirtualFeed<Entry>,
  tags: ['autodocs'],
  args: {
    ariaLabel: 'Mes chapitres',
    items: makeEntries(0, 30),
    getKey,
    estimateSize: 80,
    hasMore: false,
    loadMore: () => {},
    renderItem: (e: Entry) => <Row entry={e} />,
  },
} satisfies Meta<typeof VirtualFeed<Entry>>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongListWithInfiniteLoad: Story = { render: () => <Paged total={400} /> };
export const StickyGroupHeaders: Story = { render: () => <Paged total={60} grouped /> };
export const WithMascot: Story = { render: () => <Paged total={40} mascot={on} /> };
export const WithoutMascot: Story = { render: () => <Paged total={40} mascot={off} /> };
export const Loading: Story = { args: { items: [], loading: true, hasMore: true } };
export const LoadingMore: Story = { args: { loading: true, hasMore: true } };
export const Empty: Story = { args: { items: [] } };
export const CustomEmpty: Story = {
  args: { items: [], emptySlot: <p className="font-display text-xl text-fg">Aucune carte pour le moment.</p> },
};
export const ErrorOnFirstLoad: Story = { args: { items: [], error: true, onRetry: () => {} } };
export const ErrorWhileLoadingMore: Story = { args: { error: true, hasMore: true, onRetry: () => {} } };
export const ErrorAfterSecondPage: Story = { render: () => <Paged total={200} failAt={40} /> };
export const ReducedMotion: Story = { render: () => <Paged total={100} grouped />, globals: { motion: 'reduced' } };
export const TvScale: Story = { render: () => <Paged total={100} grouped />, globals: { display: 'tv' } };
