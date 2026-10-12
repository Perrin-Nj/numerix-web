import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card, CardHeader, CardBody, CardFooter } from './Card';
import { Button } from '@/ui/button';

const meta = {
  title: 'ui/Card',
  component: Card,
  tags: ['autodocs'],
  args: {
    children: (
      <>
        <CardHeader>Les volcans</CardHeader>
        <CardBody>Découvre comment la lave remonte jusqu’à la surface.</CardBody>
        <CardFooter>
          <Button size="sm">Explorer</Button>
        </CardFooter>
      </>
    ),
  },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Brand: Story = { args: { tone: 'brand' } };
export const Sunken: Story = { args: { tone: 'sunken' } };
export const InteractiveButton: Story = {
  args: {
    interactive: true,
    asChild: true,
    children: (
      <button type="button">
        <CardHeader>Carte cliquable</CardHeader>
        <CardBody>Appuie n’importe où sur la carte.</CardBody>
      </button>
    ),
  },
};
export const InteractiveLink: Story = {
  args: {
    interactive: true,
    asChild: true,
    children: (
      <a href="#carte">
        <CardHeader>Carte lien</CardHeader>
        <CardBody>Ouvre une autre page.</CardBody>
      </a>
    ),
  },
};
