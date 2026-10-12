import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NarrationText } from './NarrationText';

const TEXT =
  'Zoé arrive devant le grand arbre. Quarante-huit pommes sont tombées, et elle doit les partager entre quatre écureuils.';

const meta = {
  title: 'game/NarrationText',
  component: NarrationText,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Sound: one soft `tick` when streaming completes.',
      },
    },
  }, // sounds-note
  args: { text: TEXT, status: 'ready' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NarrationText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const Pending: Story = { args: { text: null, status: 'pending' } };
export const Streaming: Story = {
  args: { text: TEXT.slice(0, 70), status: 'streaming' },
};
export const Fallback: Story = { args: { status: 'fallback' } };
export const Slow: Story = {
  args: { text: null, status: 'pending', slow: true, onRetry: () => {} },
};
