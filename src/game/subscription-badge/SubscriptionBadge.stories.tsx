import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SubscriptionBadge, type SubscriptionBadgeProps } from './SubscriptionBadge';

const meta = {
  title: 'game/SubscriptionBadge',
  component: SubscriptionBadge,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'No sound. Icon plus words for every status, so color is never the only signal. `menu` is short, `settings` adds the date.' } },
  }, // sounds-note
  args: { status: 'active', date: '2026-11-12T12:00:00Z' },
} satisfies Meta<typeof SubscriptionBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Trial: Story = { args: { status: 'trial', daysLeft: 9 } };
export const TrialLastDay: Story = { args: { status: 'trial', daysLeft: 0 } };
export const Active: Story = {};
export const Unpaid: Story = { args: { status: 'unpaid' } };
export const Expired: Story = { args: { status: 'expired' } };
export const Canceled: Story = { args: { status: 'canceled', date: '2026-11-12T12:00:00Z' } };
export const Blocked: Story = { args: { status: 'blocked' } };
export const Small: Story = { args: { size: 'sm' } };
export const Menu: Story = { args: { variant: 'menu' } };

const STATUSES: SubscriptionBadgeProps[] = [
  { status: 'trial', daysLeft: 9 },
  { status: 'active', date: '2026-11-12T12:00:00Z' },
  { status: 'unpaid' },
  { status: 'expired' },
  { status: 'canceled', date: '2026-11-12T12:00:00Z' },
  { status: 'blocked' },
];
const all: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      {(['settings', 'menu'] as const).map((variant) =>
        (['md', 'sm'] as const).map((size) => (
          <div key={variant + size} className="flex flex-wrap gap-3">
            {STATUSES.map((s) => (
              <SubscriptionBadge key={s.status} {...s} variant={variant} size={size} />
            ))}
          </div>
        )),
      )}
    </div>
  ),
};
export const AllStatuses: Story = all;
export const Dark: Story = { ...all, globals: { theme: 'dark' } };
export const HighContrast: Story = { ...all, globals: { theme: 'hc' } };
export const ReducedMotion: Story = { ...all, globals: { motion: 'reduced' } };
export const TVScale: Story = { ...all, globals: { display: 'tv' } };
export const French: Story = { ...all, globals: { locale: 'fr-CA' } };
export const English: Story = { ...all, globals: { locale: 'en-CA' } };
