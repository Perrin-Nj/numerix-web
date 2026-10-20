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
  /** Answer sheet. Phone: fixed bottom sheet, the page reserves its measured height (--nx-sheet-h). Desktop: docked under the question, in the flow. */
  sheet?: ReactNode;
  /** Extra classes for the choices area (e.g. room for a fixed demo badge). */
  choicesClassName?: string;
  /** The choices area lays itself out (keypad, ordering, matching) instead of the 2x2 grid, and may scroll. */
  choicesFree?: boolean;
  /** Shrinks the stage so a tall input fits on a phone. */
  compactStage?: boolean;
  /** Medium stage (28 percent) for curated questions with cards: the question and four cards must fit. */
  mediumStage?: boolean;
  /** Taller stage (34 percent) for a graph, table or clock the child has to read. Wins over the other sizes. */
  visualStage?: boolean;
  className?: string;
};

/**
 * Phone (360x740): the stage takes 38 percent of the height under the fixed top bar, the story and question
 * scroll inside their own region, the four choices sit in a 2x2 grid pinned to the bottom.
 * Desktop and TV: illustration beside the text.
 */
export function StoryPanel({
  illustration,
  narration,
  question,
  choices,
  footer,
  choicesHidden,
  sheet,
  choicesClassName,
  choicesFree,
  compactStage,
  mediumStage,
  visualStage,
  className,
}: StoryPanelProps) {
  const qid = useId();
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-7xl flex-col lg:grid lg:h-auto lg:min-h-dvh lg:grid-cols-2 lg:items-center lg:gap-10',
        // While the sheet is up the page scrolls and keeps room under the content for it
        sheet ? 'min-h-dvh max-lg:pb-[calc(var(--nx-sheet-h,0px)+0.75rem)]' : 'h-dvh',
        className,
      )}
    >
      <div className="shrink-0 px-3 pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0">
        <div className={cn('transition-[height] duration-300 lg:aspect-[4/3] lg:h-auto', visualStage ? 'h-[34dvh]' : compactStage ? 'h-[20dvh]' : mediumStage ? 'h-[28dvh]' : 'h-[38dvh]')}>
          {illustration}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-none lg:gap-6">
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:flex-none lg:overflow-visible lg:px-0')}>
          {narration}
          {question && !choicesFree && (
            <div id={qid} data-question="" className={cn('mt-3 font-display font-bold text-fg md:text-4xl', compactStage ? 'text-2xl' : 'text-3xl')}>
              {question}
            </div>
          )}
        </div>
        {/* With a free input the question stays in view above it; only the story scrolls */}
        {question && choicesFree && (
          <div id={qid} data-question="" className={cn('shrink-0 px-3 pt-1 font-display font-bold text-fg md:text-4xl lg:px-0', compactStage ? 'text-2xl' : 'text-3xl')}>
            {question}
          </div>
        )}
        {choices && (
          <div
            inert={choicesHidden}
            className={cn(
              'shrink-0 overflow-hidden px-3 transition-[max-height,opacity,padding] duration-300 lg:px-0',
              choicesHidden ? 'max-h-0 pb-0 pt-0 opacity-0' : cn('pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 opacity-100', choicesFree ? 'max-h-[58dvh] overflow-y-auto' : 'max-h-[40dvh]'),
              choicesClassName,
            )}
          >
            <div role="group" aria-labelledby={question ? qid : undefined} className={choicesFree ? undefined : 'grid grid-cols-2 gap-2 md:gap-3'}>
              {choices}
            </div>
          </div>
        )}
        {footer && <div className="flex shrink-0 justify-end px-3 pb-3 lg:px-0">{footer}</div>}
        {sheet}
      </div>
    </section>
  );
}
