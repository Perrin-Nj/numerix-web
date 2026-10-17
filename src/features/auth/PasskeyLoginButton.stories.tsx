import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PasskeyLoginButton } from './PasskeyLoginButton';

const meta = {
  title: 'features/auth/PasskeyLoginButton',
  component: PasskeyLoginButton,
  tags: ['autodocs'],
  args: { onClick: () => {} },
} satisfies Meta<typeof PasskeyLoginButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Busy: Story = { args: { busy: true } };
export const Failed: Story = { args: { error: true } };
