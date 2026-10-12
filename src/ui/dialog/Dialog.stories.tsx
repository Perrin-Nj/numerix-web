import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Dialog, type DialogProps } from './Dialog';
import { Button } from '@/ui/button';

function Demo(props: Omit<DialogProps, 'open' | 'onOpenChange'> & { startOpen?: boolean }) {
  const { startOpen = true, ...rest } = props;
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Ouvrir</Button>
      <Dialog {...rest} open={open} onOpenChange={setOpen} footer={rest.footer ?? <Button onClick={() => setOpen(false)}>D’accord</Button>} />
    </>
  );
}

const meta = {
  title: 'ui/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  args: { open: true, onOpenChange: () => {}, title: 'Quitter la partie ?', description: 'Tu pourras reprendre plus tard.' },
  render: (args) => <Demo title={args.title} description={args.description} tone={args.tone} dismissible={args.dismissible} />,
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Danger: Story = { args: { tone: 'danger', title: 'Supprimer ce profil ?', description: 'Cette action est définitive.' } };
export const NotDismissible: Story = { args: { dismissible: false } };
export const NoDescription: Story = { args: { description: undefined } };
