import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Checks request body size for API routes. Returns a 413 response if exceeded, else null.
 * Also strips spoofable admin headers and returns sanitized headers for downstream use.
 */
export function checkBodySize(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH'].includes(req.method)
  ) {
    const contentLength = req.headers.get('content-length');
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      const isLargeUploadRoute =
        pathname.startsWith('/api/upload/') ||
        pathname.startsWith('/api/calendar/import/');
      const maxBytes = isLargeUploadRoute ? 10 * 1024 * 1024 : 1024 * 1024;
      if (!Number.isNaN(bytes) && bytes > maxBytes) {
        return NextResponse.json(
          { error: 'Request body too large' },
          { status: 413 }
        );
      }
    }
  }
  return null;
}

/**
 * Returns a copy of request headers with spoofable admin headers stripped.
 * SECURITY (RT-016): Prevents clients from injecting x-admin-verified/x-admin-id.
 */
export function getSanitizedHeaders(req: NextRequest): Headers {
  const sanitized = new Headers(req.headers);
  sanitized.delete('x-admin-verified');
  sanitized.delete('x-admin-id');
  return sanitized;
}
