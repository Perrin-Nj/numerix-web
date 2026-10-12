import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tooltip } from './Tooltip';
import { Button } from '@/ui/button';

const meta = {
  title: 'ui/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: { content: 'Reprendre là où tu en étais', children: <Button variant="secondary">Survole-moi</Button> },
  decorators: [
    (Story) => (
      <div className="p-16">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongText: Story = {
  args: { content: 'Un texte un peu plus long pour vérifier le retour à la ligne dans la bulle d’aide.' },
};
