import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type StoryPanelProps = {
  illustration: ReactNode;
  narration: ReactNode;
  question?: ReactNode;
  choices?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** Phone: stacked. Tablet: story above a 2x2 grid. Desktop and TV: illustration beside the text. */
export function StoryPanel({ illustration, narration, question, choices, footer, className }: StoryPanelProps) {
  const qid = useId();
  return (
    <section className={cn('mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-2 lg:items-center lg:gap-10', className)}>
      <div>{illustration}</div>
      <div className="flex flex-col gap-6">
        <div>{narration}</div>
        {question && (
          <div id={qid} className="font-display text-2xl font-bold text-fg md:text-3xl">
            {question}
          </div>
        )}
        {choices && (
          <div
            role="group"
            aria-labelledby={question ? qid : undefined}
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
          >
            {choices}
          </div>
        )}
        {footer && <div className="flex justify-end">{footer}</div>}
      </div>
    </section>
  );
}
