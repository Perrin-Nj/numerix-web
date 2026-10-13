import { NextResponse, type NextRequest } from 'next/server';
import { appConfig } from '@/config/app';
import { negotiateLocale } from '@/i18n/negotiate';

/**
 * Runs before every page request.
 * 1. Device language: sets NEXT_LOCALE from Accept-Language on first visit.
 * 2. Optimistic route guards (the API still enforces real authorization).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasParent = Boolean(req.cookies.get('nx_parent')?.value || req.cookies.get('nx_refresh')?.value);
  const hasChild = Boolean(req.cookies.get('nx_child')?.value);

  let res: NextResponse | undefined;

  const publicParent = pathname === '/parent/login' || pathname === '/parent/register';
  if (pathname.startsWith('/parent') && !publicParent && !hasParent) {
    res = NextResponse.redirect(new URL('/parent/login', req.url));
  } else if (pathname.startsWith('/parent') && publicParent && hasParent) {
    res = NextResponse.redirect(new URL('/parent', req.url));
  } else if (pathname.startsWith('/play/') && !hasChild) {
    res = NextResponse.redirect(new URL('/play', req.url));
  }

  res ??= NextResponse.next();
  if (!req.cookies.get('NEXT_LOCALE')?.value) {
    const locale = negotiateLocale(null, req.headers.get('accept-language'), appConfig.locales, appConfig.defaultLocale);
    res.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|sounds|icons|favicon.ico|manifest.webmanifest|.*\\..*).*)'],
};
