import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResetPasswordForm } from './ResetPasswordForm';

const meta = {
  title: 'features/auth/ResetPasswordForm',
  component: ResetPasswordForm,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [(Story) => <div style={{ width: 'min(28rem, 100%)' }}><Story /></div>],
  args: { view: 'form', supportEmail: 'aide@numerix.example', onSubmit: () => {}, onSignIn: () => {} },
} satisfies Meta<typeof ResetPasswordForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Form: Story = {};
export const FormNoSupportAddress: Story = { args: { supportEmail: '' } };
export const Saving: Story = { args: { pending: true } };
export const CodeInvalid: Story = { args: { error: { kind: 'codeInvalid' } } };
export const PolicyError: Story = { args: { error: { kind: 'policy' } } };
export const RateLimited: Story = { args: { error: { kind: 'rateLimited', minutes: 10 } } };
export const RateLimitedNoWait: Story = { args: { error: { kind: 'rateLimited', minutes: null } } };
export const NetworkError: Story = { args: { error: { kind: 'network' } } };
export const Success: Story = { args: { view: 'success' } };
