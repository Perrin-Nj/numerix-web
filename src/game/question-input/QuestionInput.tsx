'use client';
import { ChoiceGrid } from './ChoiceGrid';
import { EstimateInput } from './EstimateInput';
import { Keypad } from './Keypad';
import { MatchInput } from './MatchInput';
import { OrderInput } from './OrderInput';
import { TrueFalse } from './TrueFalse';
import { inputKind, type InputProps } from './kind';

/**
 * The answer area of a question. Picks the input from the question kind: cards, keypad, true/false, ordering,
 * matching or an estimate slider. Every input calls `onSubmit` once with the answer in the shape of AnswerValue.
 * Remount it (key = beat id) for each new question.
 */
export function QuestionInput(props: InputProps) {
  switch (inputKind(props.question)) {
    case 'truefalse':
      return <TrueFalse {...props} />;
    case 'order':
      return <OrderInput {...props} />;
    case 'match':
      return <MatchInput {...props} />;
    case 'estimate':
      return <EstimateInput {...props} />;
    case 'choice':
      return <ChoiceGrid {...props} />;
    default:
      return <Keypad {...props} />;
  }
}
