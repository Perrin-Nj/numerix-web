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

const LONG_FR =
  "Zoé arrive devant le grand arbre de la clairière. Quarante-huit pommes rouges sont tombées pendant la nuit, et elle doit les partager entre les quatre écureuils qui l'attendent sur la branche la plus basse, sans en oublier une seule. Le plus petit écureuil regarde déjà le panier.";
const LONG_EN =
  'Zoe reaches the big tree in the clearing. Forty-eight red apples fell during the night, and she has to share them between the four squirrels waiting on the lowest branch, without forgetting a single one. The smallest squirrel is already eyeing the basket.';

/** A long French story: the rule on the left and the larger type keep it apart from the question. */
export const LongFrench: Story = { args: { text: LONG_FR, status: 'ready' } };
export const LongEnglish: Story = { args: { text: LONG_EN, status: 'ready' } };
