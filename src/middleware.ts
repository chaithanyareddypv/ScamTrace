import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'scamtrace_session';

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    'scamtrace-enterprise-session-secret-key-2026-dev-only';
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAppRoute = pathname.startsWith('/app');
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, getSecretKey());
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  if (isAppRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/signup'],
};

