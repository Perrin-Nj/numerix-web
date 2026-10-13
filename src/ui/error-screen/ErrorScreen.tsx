'use client';
import { startTransition, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { MascotBubble } from '@/game/mascot-bubble';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { areaOf, describeError, HOME, type ErrorArea, type ErrorKind } from './classify';
import { ErrorIllustration } from './ErrorIllustration';

export type ErrorViewProps = {
  /** Anything thrown. Mapped through the API error classifier. */
  error?: unknown;
  /** Forces the variant (the 404 page has no error object). */
  kind?: ErrorKind;
  /** Override the error code used for the words, e.g. `not_found`. */
  code?: string;
  /** Overrides the words, used by the slow-loading panel. */
  title?: string;
  description?: string;
  /** play = kid-safe tone, parent = professional tone. Defaults from the URL. */
  area?: ErrorArea;
  onRetry?: () => void;
  /** Hide the technical details (not an error, just slow). */
  hideDetails?: boolean;
  /** Slow panel: not an alert, just a calm status. */
  calm?: boolean;
};

function View({ variant, ...p }: ErrorViewProps & { variant: 'page' | 'panel' }) {
  const t = useTranslations('errors');
  const te = useTranslations('errorScreen');
  const router = useRouter();
  const pathname = usePathname();
  const area = p.area ?? areaOf(pathname);
  const info = describeError(p.error);
  const kind = p.kind ?? info.kind;
  const code = p.code ?? (p.kind === 'notfound' ? 'not_found' : info.code);
  const play = area === 'play';
  const heading = useRef<HTMLHeadingElement>(null);
  const homeHref = HOME[area];
  const goHome = () => router.push(homeHref);
  // history.length is 1 when the page was opened directly: there is nothing to go back to
  const goBack = () => (window.history.length > 1 ? router.back() : router.push(homeHref));
  const onRetry = p.onRetry;
  const retry = p.onRetry && kind !== 'notfound' && kind !== 'permission' ? p.onRetry : undefined;
  const login = code === 'unauthorized';

  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  // Back online: try again without making the user hunt for the button
  useEffect(() => {
    if (kind !== 'offline' || !onRetry) return;
    window.addEventListener('online', onRetry);
    return () => window.removeEventListener('online', onRetry);
  }, [kind, onRetry]);

  const title = p.title ?? (play ? te(`play.${kind}`) : t(`${code}.title`));
  const description = p.description ?? t(`${code}.description`);
  const page = variant === 'page';
  const big = play ? 'xl' : 'lg';
  const small = play ? 'lg' : 'md';
  const homeIsPrimary = !retry && !login;

  return (
    <section
      role={p.calm ? 'status' : 'alert'}
      data-error-kind={kind}
      data-error-code={code}
      className={cn('mx-auto flex w-full max-w-lg flex-col items-center gap-5 px-4 text-center', page ? 'min-h-[80dvh] justify-center py-10' : 'py-8')}
    >
      <ErrorIllustration kind={kind} className={page ? 'max-w-64' : 'max-w-40'} />
      <h1 ref={heading} tabIndex={-1} className="font-display text-3xl font-bold outline-none sm:text-4xl">
        {title}
      </h1>
      {play && page ? (
        <MascotBubble pose={kind === 'notfound' ? 'curious' : 'sad'} className="text-start">
          {description}
        </MascotBubble>
      ) : (
        <p className={cn(play ? 'text-xl text-fg' : 'text-lg text-muted')}>{description}</p>
      )}
      <div className="flex w-full flex-col gap-3">
        {login && (
          <Button size={big} fullWidth onClick={() => router.push('/parent/login')}>
            {t('unauthorized.action')}
          </Button>
        )}
        {retry && (
          <Button size={big} fullWidth iconLeft={<Icon name="refresh" />} onClick={retry}>
            {t('retry')}
          </Button>
        )}
        {homeIsPrimary && (
          <Button size={big} fullWidth iconLeft={<Icon name="home" />} onClick={goHome}>
            {te('home')}
          </Button>
        )}
        <div className={cn('grid gap-3', homeIsPrimary ? 'grid-cols-1' : 'grid-cols-2')}>
          <Button variant="secondary" size={small} iconLeft={<Icon name="chevron-left" />} onClick={goBack}>
            {t('back')}
          </Button>
          {!homeIsPrimary && (
            <Button variant="secondary" size={small} iconLeft={<Icon name="home" />} onClick={goHome}>
              {te('home')}
            </Button>
          )}
        </div>
      </div>
      {!p.hideDetails && (
        <details className="w-full rounded-md border-2 border-line bg-sunken px-4 py-3 text-start text-sm">
          <summary className="min-h-8 cursor-pointer font-display font-semibold">{te('details')}</summary>
          <p className="mt-2 text-muted">{te('detailsHint')}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono">
            <dt className="text-muted">{te('code')}</dt>
            <dd data-testid="error-code">{code}</dd>
            {info.status ? (
              <>
                <dt className="text-muted">{te('status')}</dt>
                <dd>{info.status}</dd>
              </>
            ) : null}
            {info.digest ? (
              <>
                <dt className="text-muted">{te('reference')}</dt>
                <dd className="break-all">{info.digest}</dd>
              </>
            ) : null}
          </dl>
          {info.message && <p className="mt-2 break-words font-mono text-muted">{info.message}</p>}
        </details>
      )}
    </section>
  );
}

/** Full page: route boundaries, 404. */
export function ErrorScreen(props: ErrorViewProps) {
  return <View variant="page" {...props} />;
}

/** Inline: one part of a screen failed, the shell around it stays usable. */
export function ErrorPanel(props: ErrorViewProps) {
  return <View variant="panel" {...props} />;
}

/** Body of every error.tsx. Retry re-renders the segment and refreshes server data. */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => console.error('[numerix] route error', error), [error]);
  return (
    <ErrorScreen
      error={error}
      onRetry={() =>
        startTransition(() => {
          router.refresh();
          reset();
        })
      }
    />
  );
}
