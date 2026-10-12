import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Icon, ICON_NAMES } from './Icon';

const meta = {
  title: 'ui/Icon',
  component: Icon,
  tags: ['autodocs'],
  args: { name: 'star', size: 24 },
} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Titled: Story = { args: { name: 'info', title: 'Information' } };

export const AllIcons: Story = {
  render: () => (
    <ul className="grid grid-cols-4 gap-4 sm:grid-cols-6">
      {ICON_NAMES.map((n) => (
        <li key={n} className="flex flex-col items-center gap-1 text-sm text-muted">
          <Icon name={n} size={28} className="text-fg" />
          <span>{n}</span>
        </li>
      ))}
    </ul>
  ),
};
