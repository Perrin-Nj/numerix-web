import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Sheet, type SheetProps } from './Sheet';
import { Button } from '@/ui/button';

function Demo(props: Omit<SheetProps, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Ouvrir</Button>
      <Sheet {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

const meta = {
  title: 'ui/Sheet',
  component: Sheet,
  tags: ['autodocs'],
  args: { open: true, onOpenChange: () => {}, title: 'Choisis ton animal', children: <p className="text-muted">Huit amis t’attendent.</p> },
  render: (args) => <Demo title={args.title} side={args.side}>{args.children}</Demo>,
} satisfies Meta<typeof Sheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Bottom: Story = {};
export const Right: Story = { args: { side: 'right' } };
