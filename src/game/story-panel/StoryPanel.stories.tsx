import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StoryPanel } from './StoryPanel';
import { IllustrationFrame } from '@/game/illustration-frame';
import { NarrationText } from '@/game/narration-text';
import { ChoiceButton } from '@/game/choice-button';
import { OutcomeBeat } from '@/game/outcome-beat';
import { Button } from '@/ui/button';
import { QuestionInput } from '@/game/question-input';
import type { AnswerValue } from '@/data/api/types';

const VALUES: AnswerValue[] = [12, 14, 16, 18];
const TEXT =
  'Zoé arrive devant le grand arbre. Quarante-huit pommes sont tombées, et elle doit les partager entre quatre écureuils.';

function Choices({ lock }: { lock?: boolean }) {
  const [picked, setPicked] = useState<number | null>(lock ? 1 : null);
  return (
    <>
      {VALUES.map((v, i) => (
        <ChoiceButton
          key={i}
          value={v}
          index={i}
          shortcut
          state={picked === null ? 'idle' : picked === i ? 'selected' : 'locked'}
          onSelect={() => setPicked(i)}
        />
      ))}
    </>
  );
}

const meta = {
  title: 'game/StoryPanel',
  component: StoryPanel,
  tags: ['autodocs'],
  args: {
    illustration: <IllustrationFrame world="nature" alt="Une clairière dans la forêt" />,
    narration: <NarrationText text={TEXT} status="ready" />,
    question: 'Combien de pommes pour chaque écureuil ?',
    choices: <Choices />,
  },
} satisfies Meta<typeof StoryPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = {
  args: {
    narration: <NarrationText text={null} status="pending" />,
    question: undefined,
    choices: undefined,
  },
};
export const Streaming: Story = {
  args: {
    narration: <NarrationText text={TEXT.slice(0, 60)} status="streaming" />,
    question: undefined,
    choices: undefined,
  },
};
export const AnswerLocked: Story = { args: { choices: <Choices lock /> } };
export const OutcomeShown: Story = {
  args: {
    illustration: <IllustrationFrame world="nature" alt="Une clairière" mood="detour" />,
    narration: (
      <OutcomeBeat outcome="erreur_typique">
        <NarrationText text="Les écureuils comptent autrement. Un nouveau sentier s'ouvre devant Zoé." status="ready" />
      </OutcomeBeat>
    ),
    question: undefined,
    choices: undefined,
    footer: <Button size="lg">Continuer</Button>,
  },
};
export const Phone: Story = { globals: { viewport: { value: 'phone' } } };
export const Tablet: Story = { globals: { viewport: { value: 'tablet' } } };
export const TV: Story = {
  globals: { display: 'tv', viewport: { value: 'tv' } },
};
export const ChoicesHidden: Story = { args: { choicesHidden: true } };

export const FreeInputKeypad: Story = {
  args: {
    choicesFree: true,
    compactStage: true,
    choices: <QuestionInput question={{ math_text: '6 + 7 = ?', kind: 'numeric', choices: [] }} phase="question" chosen={null} outcome={null} onSubmit={() => {}} />,
  },
  globals: { viewport: { value: 'phone' } },
};

const TIGHT = {
  question: 'Combien de pommes pour chaque écureuil ?',
  choices: <QuestionInput question={{ math_text: '48 / 4 = ?', kind: 'numeric', choices: [] }} phase="question" chosen={null} outcome={null} onSubmit={() => {}} />,
};
const LONG =
  'Zoé arrive devant le grand arbre de la clairière. Quarante-huit pommes rouges sont tombées pendant la nuit, et elle doit les partager entre les quatre écureuils qui attendent sur la branche la plus basse. Le plus petit regarde déjà le panier. Elle compte une fois, deux fois, puis elle se demande comment faire des parts égales sans en oublier une seule.';

/** Small phone: the stage gives way first, the story scrolls in its own region, the question and keypad stay in view. */
export const SmallPhoneKeypad: Story = {
  args: { choicesFree: true, compactStage: true, narration: <NarrationText text={LONG} status="ready" />, ...TIGHT },
  globals: { viewport: { value: 'small' } },
};
/** Shared window 600x400: two columns, the story scrolls inside the right column, the question stays on screen. */
export const SharedWindow: Story = {
  args: { choicesFree: true, narration: <NarrationText text={LONG} status="ready" />, ...TIGHT },
  globals: { viewport: { value: 'shared' } },
};
export const WideAndShort: Story = {
  args: { choicesFree: true, narration: <NarrationText text={LONG} status="ready" />, ...TIGHT },
  globals: { viewport: { value: 'wideShort' } },
};
/** A long story on a desktop: the text sits in its own block and the question stays under it. */
export const LongStoryDesktop: Story = {
  args: { narration: <NarrationText text={LONG} status="ready" /> },
  globals: { viewport: { value: 'desktop' } },
};
