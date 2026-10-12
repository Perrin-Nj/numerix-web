import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verifyToken } from '@/lib/session';

// Pages only. /api/* checks the cookie itself and answers 401 JSON.
export function proxy(req: NextRequest) {
  const authed = verifyToken(req.cookies.get(COOKIE)?.value);
  if (!authed && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (authed && req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next|favicon.ico|icon.svg).*)'] };
