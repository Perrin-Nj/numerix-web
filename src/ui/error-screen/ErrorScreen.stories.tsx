import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ApiError } from '@/lib/api/client';
import { ErrorPanel, ErrorScreen } from './ErrorScreen';

const meta = {
  title: 'ui/ErrorScreen',
  component: ErrorScreen,
  tags: ['autodocs'],
  args: { area: 'play', onRetry: () => {} },
} satisfies Meta<typeof ErrorScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Generic: Story = { args: { error: new ApiError(500, 'internal_error', 'HTTP 500') } };
export const Offline: Story = { args: { error: new ApiError(0, 'device_offline', 'Device offline') } };
export const Timeout: Story = { args: { error: new ApiError(504, 'backend_timeout', 'Backend timeout') } };
export const NotFound: Story = { args: { kind: 'notfound', onRetry: undefined } };
export const Permission: Story = { args: { error: new ApiError(403, 'forbidden', 'Forbidden'), onRetry: undefined } };
export const SessionEnded: Story = { args: { error: new ApiError(401, 'unauthorized', 'Unauthorized'), area: 'parent' } };

export const ParentTone: Story = { args: { error: new ApiError(502, 'backend_unreachable', 'Backend unreachable'), area: 'parent' } };
export const ParentNotFound: Story = { args: { kind: 'notfound', area: 'parent', onRetry: undefined } };

export const Dark: Story = { ...Generic, globals: { theme: 'dark' } };
export const HighContrast: Story = { ...Offline, globals: { theme: 'hc' } };
export const ReducedMotion: Story = { ...NotFound, globals: { motion: 'reduced' } };
export const TV: Story = { ...Timeout, globals: { display: 'tv' } };
export const English: Story = { ...Offline, globals: { locale: 'en-CA' } };
export const French: Story = { ...Offline, globals: { locale: 'fr-CA' } };

export const Panel: Story = {
  render: (args) => <ErrorPanel {...args} />,
  args: { error: new ApiError(0, 'device_offline', 'Device offline') },
};
export const SlowPanel: Story = {
  render: (args) => <ErrorPanel {...args} />,
  args: { kind: 'timeout', code: 'backend_timeout', title: 'This is taking longer than usual', description: 'Nothing is lost. Wait a little, try again, or go back.', hideDetails: true, calm: true },
};
