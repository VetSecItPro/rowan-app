import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfCookie, getCsrfTokenFromCookie } from '@/lib/security/csrf';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

/**
 * GET /api/csrf/token
 * Get or generate a CSRF token for the current session
 *
 * The token is:
 * 1. Stored in an HTTP-only cookie (for server validation)
 * 2. Returned in the response (for client to include in headers)
 *
 * Client should store this token and include it in X-CSRF-Token header
 * for all state-changing requests (POST, PUT, PATCH, DELETE)
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Check if we already have a valid token in the cookie
    const existingToken = getCsrfTokenFromCookie(request);

    if (existingToken) {
      // Return existing token (don't regenerate on every request)
      return NextResponse.json({
        success: true,
        token: existingToken,
      });
    }

    // Generate new token
    const newToken = generateCsrfToken();

    // Create response with token
    const response = NextResponse.json({
      success: true,
      token: newToken,
    });

    // Set token in HTTP-only cookie
    setCsrfCookie(response, newToken);

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
