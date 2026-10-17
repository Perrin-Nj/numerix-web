import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SecurityPanel } from './SecurityPanel';

const meta = {
  title: 'features/parent/SecurityPanel',
  component: SecurityPanel,
  tags: ['autodocs'],
  args: {
    devices: [
      { id: 'd1', label: 'Chrome on Windows', last_used_at: '2026-10-17T14:00:00Z', current: true },
      { id: 'd2', label: 'Safari on iOS', last_used_at: '2026-10-10T09:30:00Z', current: false },
    ],
    passkeys: [{ id: 'p1', nickname: 'Portable', created_at: '2026-09-30T12:00:00Z' }],
    passkeysSupported: true,
    onForgetDevice: () => {},
    onAddPasskey: () => {},
    onRemovePasskey: () => {},
  },
} satisfies Meta<typeof SecurityPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { devices: [], passkeys: [] } };
export const Busy: Story = { args: { busy: true } };
export const PasskeyError: Story = { args: { passkeyError: true } };
export const PasskeysUnsupported: Story = { args: { passkeys: [], passkeysSupported: false } };
