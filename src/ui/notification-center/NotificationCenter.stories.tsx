import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NotificationCenter, useNotify, useNotificationStore, type Notification } from './NotificationCenter';
import { Button } from '@/ui/button';

const SAMPLES: Record<string, Notification> = {
  success: {
    kind: 'success',
    title: 'Bien joué',
    description: 'Ton progrès est enregistré.',
  },
  info: { kind: 'info', title: 'Nouveau monde disponible' },
  warning: {
    kind: 'warning',
    title: 'Connexion lente',
    description: 'Nous réessayons.',
  },
  error: {
    kind: 'error',
    title: 'Envoi impossible',
    description: 'Vérifie ta connexion puis réessaie.',
    action: { label: 'Réessayer', onClick: () => {} },
  },
};

function Demo({ seed }: { seed: Notification[] }) {
  const { notify } = useNotify();
  useEffect(() => {
    useNotificationStore.getState().clear();
    seed.forEach((n) => notify(n));
    return () => useNotificationStore.getState().clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex flex-wrap gap-3">
      {Object.entries(SAMPLES).map(([k, n]) => (
        <Button key={k} variant="secondary" size="sm" onClick={() => notify(n)}>
          {k}
        </Button>
      ))}
      <NotificationCenter />
    </div>
  );
}

const meta = {
  title: 'ui/NotificationCenter',
  component: NotificationCenter,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Sounds: success and info `confirm`, warning `notice_warning`, error `notice_error`.' } } },
} satisfies Meta<typeof NotificationCenter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <Demo seed={[]} /> };
export const Success: Story = {
  render: () => <Demo seed={[SAMPLES.success]} />,
};
export const Info: Story = { render: () => <Demo seed={[SAMPLES.info]} /> };
export const Warning: Story = {
  render: () => <Demo seed={[SAMPLES.warning]} />,
};
export const ErrorWithAction: Story = {
  render: () => <Demo seed={[SAMPLES.error]} />,
};
export const Stack: Story = {
  render: () => <Demo seed={Object.values(SAMPLES)} />,
};
