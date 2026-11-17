import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ForgotPasswordForm } from './ForgotPasswordForm';

const meta = {
  title: 'features/auth/ForgotPasswordForm',
  component: ForgotPasswordForm,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: 'min(28rem, 100%)' }}><Story /></div>],
  args: { view: 'form', onSubmit: () => {}, onResend: () => {}, onBack: () => {} },
} satisfies Meta<typeof ForgotPasswordForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Form: Story = {};
export const Sending: Story = { args: { pending: true } };
export const Sent: Story = { args: { view: 'sent' } };
export const SentCooldown: Story = { args: { view: 'sent', cooldown: 24 } };
export const RateLimited: Story = { args: { error: { kind: 'rateLimited', minutes: 15 } } };
export const RateLimitedNoWait: Story = { args: { error: { kind: 'rateLimited', minutes: null } } };
export const NetworkError: Story = { args: { error: { kind: 'network' } } };
export const EmailDisabled: Story = { args: { view: 'unavailable', supportEmail: 'aide@numerix.example' } };
export const EmailDisabledNoAddress: Story = { args: { view: 'unavailable' } };
