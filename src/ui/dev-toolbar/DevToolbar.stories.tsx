import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { DevToolbar } from './DevToolbar';

const meta = {
  title: 'ui/DevToolbar',
  component: DevToolbar,
  tags: ['autodocs'],
  args: { scenario: 'none', onScenarioChange: () => {} },
  render: (args) => {
    const [scenario, setScenario] = useState(args.scenario);
    return <DevToolbar scenario={scenario} onScenarioChange={setScenario} />;
  },
} satisfies Meta<typeof DevToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithScenario: Story = { args: { scenario: 'network-error' } };
