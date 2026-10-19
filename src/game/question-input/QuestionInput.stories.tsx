import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { QuestionInput } from './QuestionInput';
import { moveTo } from './OrderInput';
import { inputKind } from './kind';
import type { AnswerValue, Outcome, Question } from '@/data/api/types';

/** Plays the part of the story screen: keeps the answer and reveals an outcome. */
function Host({ question, correct }: { question: Question; correct: (v: AnswerValue) => boolean }) {
  const [chosen, setChosen] = useState<AnswerValue | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <p className="font-display text-xl font-bold">{question.prompt ?? question.math_text}</p>
      <QuestionInput
        question={question}
        phase={chosen === null ? 'question' : outcome ? 'outcome' : 'answering'}
        chosen={chosen}
        outcome={outcome}
        onSubmit={(v) => {
          setChosen(v);
          setTimeout(() => setOutcome(correct(v) ? 'correct' : 'erreur_typique'), 300);
        }}
      />
    </div>
  );
}

const meta = {
  title: 'game/QuestionInput',
  component: QuestionInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Answer area for every question kind: cards, big keypad, true/false, ordering (tap, drag or arrow keys), matching (tap pairs) and estimate slider. Sounds: `tap`, `select`. A wrong answer gets an amber tint, never red and never a shake.',
      },
    },
  }, // sounds-note
} satisfies Meta<typeof QuestionInput>;
export default meta;
type Story = StoryObj<typeof meta>;

const base: Question = { math_text: '8 + 7 = ?', choices: [] };
const noop = () => {};
const args = { phase: 'question' as const, chosen: null, outcome: null, onSubmit: noop };

export const Cards: Story = {
  args: { ...args, question: { ...base, kind: 'choice', prompt: 'Quel est le plus grand ?', choices: ['12', '9', '21', '18', '15'] } },
  render: (a) => <Host question={a.question} correct={(v) => v === '21'} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /21/ }));
    await expect(within(canvasElement).getByRole('button', { name: /21/ })).toBeDisabled();
  },
};
export const GeneratedFourChoices: Story = {
  args: { ...args, question: { ...base, choices: [14, 15, 16, 17] } },
  render: (a) => <Host question={a.question} correct={(v) => v === 15} />,
};
export const NumericKeypad: Story = {
  args: { ...args, question: { ...base, kind: 'numeric', prompt: '8 + 7 = ?' } },
  render: (a) => <Host question={a.question} correct={(v) => v === 15} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '1' }));
    await userEvent.click(c.getByRole('button', { name: '5' }));
    await userEvent.click(c.getByRole('button', { name: 'Check' }));
    await expect(c.getByRole('button', { name: '1' })).toBeDisabled();
  },
};
export const KeypadWithRemainder: Story = {
  args: { ...args, question: { ...base, kind: 'numeric', math_text: '340 ÷ 7 = ? (avec reste)' } },
  render: (a) => <Host question={a.question} correct={(v) => Array.isArray(v) && v[0] === 48} />,
};
export const TrueFalse: Story = {
  args: { ...args, question: { ...base, kind: 'truefalse', prompt: '7 + 8 est égal à 15.' } },
  render: (a) => <Host question={a.question} correct={(v) => v === true} />,
};
export const Ordering: Story = {
  args: {
    ...args,
    question: {
      ...base,
      kind: 'order',
      prompt: 'Range du plus petit au plus grand.',
      items: { cards: [{ id: 'a', text: '45' }, { id: 'b', text: '12' }, { id: 'c', text: '30' }] },
    },
  },
  render: (a) => <Host question={a.question} correct={(v) => JSON.stringify(v) === JSON.stringify(['b', 'c', 'a'])} />,
};
export const Matching: Story = {
  args: {
    ...args,
    question: {
      ...base,
      kind: 'match',
      prompt: 'Relie chaque calcul à son résultat.',
      items: { left: [{ id: 'l1', text: '2 + 2' }, { id: 'l2', text: '3 × 3' }], right: [{ id: 'r1', text: '9' }, { id: 'r2', text: '4' }] },
    },
  },
  render: (a) => <Host question={a.question} correct={(v) => JSON.stringify(v) === JSON.stringify([['l1', 'r2'], ['l2', 'r1']])} />,
};
export const Estimate: Story = {
  args: { ...args, question: { ...base, kind: 'estimate', prompt: 'Environ combien de billes ?', visual: { kind: 'numberline', data: { min: 0, max: 100, step: 5 } } } },
  render: (a) => <Host question={a.question} correct={(v) => typeof v === 'number' && Math.abs(v - 60) <= 10} />,
};
export const Locked: Story = {
  args: { question: { ...base, kind: 'choice', choices: ['12', '9', '21'] }, phase: 'outcome', chosen: '9', outcome: 'erreur_typique', onSubmit: noop },
};

// Pure helpers: a plain assertion story keeps them covered
export const Helpers: Story = {
  args: { ...args, question: base },
  render: () => <p>{JSON.stringify([moveTo(['a', 'b', 'c'], 'c', 0), inputKind({ math_text: 'x', choices: [] }), inputKind({ math_text: 'x', choices: [1, 2] })])}</p>,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('[["c","a","b"],"keypad","choice"]')).toBeInTheDocument();
  },
};
