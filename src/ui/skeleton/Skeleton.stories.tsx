import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton } from './Skeleton';

const meta = { title: 'ui/Skeleton', component: Skeleton, tags: ['autodocs'] } satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};
export const Block: Story = { args: { shape: 'block' } };
export const Circle: Story = { args: { shape: 'circle' } };
export const CustomSize: Story = { args: { width: 200, height: 32, shape: 'block' } };
export const TextLines: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Skeleton />
      <Skeleton width="80%" />
      <Skeleton width="60%" />
    </div>
  ),
};
