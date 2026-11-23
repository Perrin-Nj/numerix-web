'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/cn';
import { Icon } from '@/ui/icon';

export type StoryPanelProps = {
  illustration: ReactNode;
  narration: ReactNode;
  question?: ReactNode;
  choices?: ReactNode;
  footer?: ReactNode;
  /** Choices are removed while the answer sheet owns the space. */
  choicesHidden?: boolean;
  /** Answer sheet. Phone: fixed bottom sheet, the page reserves its measured height (--nx-sheet-h). Desktop: docked under the question, in the flow. */
  sheet?: ReactNode;
  /** Extra classes for the choices area (e.g. room for a fixed demo badge). */
  choicesClassName?: string;
  /** The choices area lays itself out (keypad, ordering, matching) instead of the 2x2 grid, and may scroll. */
  choicesFree?: boolean;
  /** Smaller stage so a tall input fits on a phone. */
  compactStage?: boolean;
  /** Medium stage for curated questions with cards: the question and four cards must fit. */
  mediumStage?: boolean;
  /** Taller stage for a graph, table or clock the child has to read. Wins over the other sizes. */
  visualStage?: boolean;
  className?: string;
};

const SPLIT = '(min-width: 1024px), (min-width: 480px) and (max-height: 520px)';

/**
 * Column mode only: the stage gets what the question and the input leave, never less than 5 rem. Sets --stage-max on the section
 * before paint and again when the question or input change size (not when the story grows, so text never moves the stage).
 * While the input is hidden for the answer sheet the last value is kept, so the stage does not jump at the reveal.
 */
function useStageFit(secRef: React.RefObject<HTMLElement | null>, bodyRef: React.RefObject<HTMLElement | null>, frozen: boolean | undefined) {
  useLayoutEffect(() => {
    const sec = secRef.current;
    const body = bodyRef.current;
    if (!sec || !body || frozen) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const fit = () => {
      if (window.matchMedia(SPLIT).matches) return sec.style.removeProperty('--stage-max');
      const cs = getComputedStyle(sec);
      const pad = parseFloat(getComputedStyle(sec.firstElementChild as Element).paddingTop) || 0;
      let other = 0;
      Array.from(body.children).slice(1).forEach((c) => {
        if (getComputedStyle(c).position !== 'fixed') other += (c as HTMLElement).offsetHeight;
      });
      const room = sec.clientHeight - (parseFloat(cs.paddingBottom) || 0) - pad - other - 3 * rem;
      sec.style.setProperty('--stage-max', `${Math.max(room, 5 * rem)}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(sec);
    Array.from(body.children).slice(1).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  });
}

/** True while the element has more content than it shows (drives the scroll hint). */
function useOverflow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOver(el.scrollHeight - el.clientHeight > 4 && el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', measure);
    };
  });
  return [ref, over] as const;
}

/**
 * Three rows in the order the child needs them: the stage, the story (the only part that scrolls) and the question with
 * its input, which always stay in view. The height is `svh`, so a phone address bar never changes it, and nothing animates
 * a size: the layout only changes when the window does.
 *  - Portrait or tall: stage on top (28 to 38 percent), story scrolls in its own region, question and input pinned under it.
 *  - Short wide window (landscape phone, a shared screen of 600x400 or 1024x400) and any wide screen: two columns, the stage
 *    left, the story, question and input right. On a short window the right column scrolls and the question sticks to its top.
 *  - Under 34 rem tall in portrait the section stops shrinking and the page scrolls, so nothing is ever clipped.
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
  const secRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useStageFit(secRef, bodyRef, choicesHidden);
  const [storyRef, moreBelow] = useOverflow<HTMLDivElement>();
  const questionBlock = question && (
    <div
      id={qid}
      data-question=""
      className={cn(
        'shrink-0 bg-bg px-3 pb-1 pt-2 font-display font-bold leading-snug text-fg split:px-0',
        'short:sticky short:top-0 short:z-10', // sticky only matters when the column scrolls as a last resort
        'text-[length:var(--text-question)]',
      )}
    >
      {question}
    </div>
  );
  return (
    <section
      ref={secRef}
      className={cn(
        'mx-auto flex h-svh min-h-[34rem] w-full max-w-7xl flex-col',
        // items-start: when the text grows the stage must not slide (centering would move everything)
        'split:grid split:h-auto split:min-h-svh split:grid-cols-2 split:grid-rows-1 split:items-start split:gap-10 split:pt-[calc(4rem+env(safe-area-inset-top))]',
        'short:h-svh short:min-h-0 short:items-stretch short:gap-5 short:px-3 short:pt-0',
        // the phone sheet is fixed: keep its room under the content
        sheet && 'pb-[calc(var(--nx-sheet-h,0px)+0.75rem)] split:pb-0',
        className,
      )}
    >
      <div className="px-3 pt-[calc(3.5rem+env(safe-area-inset-top))] split:px-0 split:pt-0 short:flex short:items-center short:pt-[calc(3.5rem+env(safe-area-inset-top))]">
        <div
          data-stage-slot=""
          className={cn(
            'h-[clamp(5rem,min(var(--stage-pref),var(--stage-max,100svh)),28rem)] w-full',
            visualStage ? '[--stage-pref:34svh]' : compactStage ? '[--stage-pref:20svh]' : mediumStage ? '[--stage-pref:28svh]' : '[--stage-pref:38svh]',
            'split:aspect-[4/3] split:h-auto short:max-h-[calc(100svh-5rem)]',
            // the answer sheet takes the bottom of a phone: a lower stage leaves the outcome card room to show its whole text
            sheet && '[--stage-max:27svh]',
          )}
        >
          {illustration}
        </div>
      </div>
      <div
        ref={bodyRef}
        className={cn(
          'flex min-h-0 flex-1 flex-col split:flex-none split:gap-4 short:h-full short:overflow-y-auto short:overscroll-contain short:pb-3 short:pt-[calc(3.5rem+env(safe-area-inset-top))]',
          sheet && 'max-lg:short:pb-[calc(var(--nx-sheet-h,0px)+0.75rem)]',
        )}
      >
        <div className="relative flex min-h-[3rem] flex-1 flex-col">
          <div
            ref={storyRef}
            role="group"
            tabIndex={0}
            data-story=""
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 split:flex-none split:overflow-visible split:px-0 short:flex-1 short:overflow-y-auto"
          >
            {narration}
          </div>
          {moreBelow && (
            <span aria-hidden data-scroll-hint="" className="pointer-events-none absolute inset-x-0 bottom-0 flex h-8 items-end justify-center bg-gradient-to-t from-bg to-transparent text-muted">
              <Icon name="chevron-right" size={20} className="rotate-90" />
            </span>
          )}
        </div>
        {questionBlock}
        {choices && (
          <div
            hidden={choicesHidden}
            inert={choicesHidden}
            className={cn(
              'shrink-0 overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 split:px-0 short:pb-2 short:pt-1',
              choicesFree ? 'max-h-[58svh] overflow-y-auto short:max-h-none short:overflow-visible' : 'max-h-[40svh] overflow-y-auto short:max-h-none',
              choicesClassName,
            )}
          >
            <div role="group" aria-labelledby={question ? qid : undefined} className={choicesFree ? undefined : 'grid grid-cols-2 gap-2 md:gap-3'}>
              {choices}
            </div>
          </div>
        )}
        {footer && <div className="flex shrink-0 justify-end px-3 pb-3 split:px-0">{footer}</div>}
        {sheet}
      </div>
    </section>
  );
}
