import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ApiError } from '@/data/api/client';
import { Skeleton } from '@/ui/skeleton';
import { ScreenState } from './ScreenState';

const meta = {
  title: 'ui/ScreenState',
  component: ScreenState,
  tags: ['autodocs'],
  args: {
    isLoading: false,
    area: 'play',
    skeleton: <Skeleton height={160} />,
    onRetry: () => {},
    children: <p className="p-4 font-display text-xl">Contenu prêt</p>,
  },
} satisfies Meta<typeof ScreenState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Loading: Story = { args: { isLoading: true } };
/** Slow after 300 ms here so the panel shows quickly. */
export const Slow: Story = { args: { isLoading: true, timeoutMs: 300 } };
export const Failed: Story = { args: { error: new ApiError(500, 'internal_error', 'HTTP 500') } };
export const Offline: Story = { args: { error: new ApiError(0, 'device_offline', 'Device offline') }, globals: { theme: 'dark' } };
export const Empty: Story = { args: { isEmpty: true } };
export const ParentEmpty: Story = { args: { isEmpty: true, area: 'parent' } };
