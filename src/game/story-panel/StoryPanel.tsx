import { useId, type ReactNode } from 'react';
import { cn } from '@/shared/cn';

export type StoryPanelProps = {
  illustration: ReactNode;
  narration: ReactNode;
  question?: ReactNode;
  choices?: ReactNode;
  footer?: ReactNode;
  /** Choices compress away (the answer sheet owns the space). */
  choicesHidden?: boolean;
  /** Extra classes for the choices area (e.g. room for a fixed demo badge). */
  choicesClassName?: string;
  className?: string;
};

/**
 * Phone (360x740): the stage takes 38 percent of the height under the fixed top bar, the story and question
 * scroll inside their own region, the four choices sit in a 2x2 grid pinned to the bottom.
 * Desktop and TV: illustration beside the text.
 */
export function StoryPanel({ illustration, narration, question, choices, footer, choicesHidden, choicesClassName, className }: StoryPanelProps) {
  const qid = useId();
  return (
    <section
      className={cn(
        'mx-auto flex h-dvh w-full max-w-7xl flex-col lg:grid lg:h-auto lg:min-h-dvh lg:grid-cols-2 lg:items-center lg:gap-10',
        className,
      )}
    >
      <div className="shrink-0 px-3 pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0">
        <div className="h-[38dvh] lg:aspect-[4/3] lg:h-auto">{illustration}</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-none lg:gap-6">
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:flex-none lg:overflow-visible lg:px-0', choicesHidden && 'pb-[34dvh] lg:pb-0')}>
          {narration}
          {question && (
            <div id={qid} className="mt-3 font-display text-3xl font-bold text-fg md:text-4xl">
              {question}
            </div>
          )}
        </div>
        {choices && (
          <div
            inert={choicesHidden}
            className={cn(
              'shrink-0 overflow-hidden px-3 transition-[max-height,opacity,padding] duration-300 lg:px-0',
              choicesHidden ? 'max-h-0 pb-0 pt-0 opacity-0' : 'max-h-[40dvh] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 opacity-100',
              choicesClassName,
            )}
          >
            <div role="group" aria-labelledby={question ? qid : undefined} className="grid grid-cols-2 gap-2 md:gap-3">
              {choices}
            </div>
          </div>
        )}
        {footer && <div className="flex shrink-0 justify-end px-3 pb-3 lg:px-0">{footer}</div>}
      </div>
    </section>
  );
}
