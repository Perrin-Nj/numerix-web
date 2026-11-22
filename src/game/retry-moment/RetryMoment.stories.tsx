import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RetryMoment } from './RetryMoment';

const meta = {
  title: 'game/RetryMoment',
  component: RetryMoment,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'Kind moment after a first answer that was not right. Sound: `question` when Numa starts thinking. The tried card stays disabled in QuestionInput (see its RetryChoice story).' } },
  }, // sounds-note
  decorators: [
    (Story) => (
      <div className="max-w-lg p-4">
        <Story />
      </div>
    ),
  ],
  args: { hint: 'Compte encore les deux plaques, une par une.' },
} satisfies Meta<typeof RetryMoment>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithHint: Story = {};
export const WaitingForHint: Story = { args: { hint: null } };
export const LongHint: Story = { args: { hint: 'Quand on additionne des dizaines et des unités, on garde les dizaines ensemble et on ajoute les unités à part. '.repeat(2) } };
export const Phone: Story = { globals: { viewport: { value: 'phone' } } };
export const Dark: Story = { globals: { theme: 'dark' } };
export const HighContrast: Story = { globals: { theme: 'hc' } };
export const ReducedMotion: Story = { globals: { motion: 'reduced' } };
export const TVScale: Story = { globals: { display: 'tv' } };
export const French: Story = { globals: { locale: 'fr-CA' } };
export const English: Story = { args: { hint: 'Count the two plates again, one by one.' }, globals: { locale: 'en-CA' } };
