import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Let client-side AuthProvider handle redirects
  // This avoids Edge Runtime issues and cookie detection problems
  // The auth context in layout.tsx will redirect as needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tasks/:path*',
    '/calendar/:path*',
    '/messages/:path*',
    '/reminders/:path*',
    '/shopping/:path*',
    '/meals/:path*',
    '/household/:path*',
    '/goals/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
};
