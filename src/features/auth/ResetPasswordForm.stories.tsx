import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResetPasswordForm } from './ResetPasswordForm';

const meta = {
  title: 'features/auth/ResetPasswordForm',
  component: ResetPasswordForm,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: 'min(28rem, 100%)' }}><Story /></div>],
  args: { view: 'form', onSubmit: () => {}, onRetry: () => {}, onRequestNewLink: () => {}, onSignIn: () => {} },
} satisfies Meta<typeof ResetPasswordForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Form: Story = {};
export const Saving: Story = { args: { pending: true } };
export const InvalidLink: Story = { args: { view: 'invalid' } };
export const Success: Story = { args: { view: 'success' } };
export const PolicyError: Story = { args: { error: { kind: 'policy' } } };
export const RateLimited: Story = { args: { error: { kind: 'rateLimited', minutes: 10 } } };
export const NetworkError: Story = { args: { error: { kind: 'network' } } };
