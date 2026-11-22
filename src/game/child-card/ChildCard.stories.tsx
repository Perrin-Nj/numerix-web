import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChildCard } from './ChildCard';
import { Avatar } from '@/game/avatar';
import { Button } from '@/ui/button';
import { Card, CardBody, CardFooter } from '@/ui/card';
import { Chip } from '@/ui/chip';

const badges = (
  <>
    <Chip tone="success" icon="check">
      Consentement donné
    </Chip>
    <Chip icon="lock">NIP actif</Chip>
  </>
);
const actions = (
  <>
    <Button>Jouer comme Noé</Button>
    <Button variant="secondary">Aperçu</Button>
  </>
);

const meta = {
  title: 'game/ChildCard',
  component: ChildCard,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Calm, flat profile card (radius token `--radius-card` 10 px, thin line, no gradient bar) with a visible Delete profile action. The confirmation is the typed-name dialog of the caller.' } } },
  args: { avatarId: 'fox', name: 'Noé', gradeLabel: 'Année 3', badges, actions, onDelete: () => {} },
} satisfies Meta<typeof ChildCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ConsentNeeded: Story = {
  args: { badges: <Chip tone="warning" icon="alert">Consentement requis</Chip>, actions: <Button>Donner le consentement</Button> },
};
export const NoDelete: Story = { args: { onDelete: undefined } };
export const LongName: Story = { args: { name: 'Marie-Anne-Sophie de Montmorency-Laval' } };
export const Phone: Story = { globals: { viewport: { value: 'phone' } } };

/** The card as it was: gradient bar, 20 px corners, heavy shadow, delete hidden in the settings page. */
function LegacyCard() {
  return (
    <Card className="h-full overflow-hidden">
      <div aria-hidden className="h-2 bg-gradient-to-r from-brand to-world-espace" />
      <CardBody>
        <div className="flex items-center gap-4">
          <Avatar avatarId="fox" name="Noé" size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-2xl font-bold leading-tight">Noé</p>
            <p className="text-muted">Année 3</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{badges}</div>
      </CardBody>
      <CardFooter className="flex-wrap">{actions}</CardFooter>
    </Card>
  );
}

/** Before and after for the owner. Left: the old card. Right: the new one, with Delete profile on the card. */
export const BeforeAndAfter: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <p className="mb-2 font-semibold text-muted">Avant</p>
        <LegacyCard />
      </div>
      <div>
        <p className="mb-2 font-semibold text-muted">Après</p>
        <ChildCard {...args} />
      </div>
    </div>
  ),
};
