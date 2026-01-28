import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// SECURITY: This is a test endpoint for debugging cookie issues
// Disabled in production to prevent information disclosure

export async function GET(req: NextRequest) {
  // Rate limiting
  const ip = extractIP(req.headers);
  const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
  if (!rateLimitSuccess) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // SECURITY: Block in production unless ALLOW_TEST_ENDPOINTS + admin auth
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ALLOW_TEST_ENDPOINTS) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    try {
      const cookieStore = await safeCookiesAsync();
      const adminSession = cookieStore.get('admin-session');
      if (!adminSession) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const sessionData = await decryptSessionData(adminSession.value);
      if (!validateSessionData(sessionData)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  try {
    // Test both methods of cookie access
    const nextCookies = await cookies();
    const directCookies = req.headers.get('cookie');

    logger.info('[TEST] Cookie comparison:', {
      directFromHeaders: !!directCookies,
      directLength: directCookies?.length || 0,
      nextCookiesSize: nextCookies.size,
      allCookieNames: Array.from(nextCookies.getAll()).map(c => c.name),
      supabaseCookies: Array.from(nextCookies.getAll()).filter(c => c.name.includes('supabase')),
      rawCookieString: directCookies?.substring(0, 300)
    });

    return NextResponse.json({
      success: true,
      directCookies: !!directCookies,
      nextCookiesCount: nextCookies.size,
      cookieNames: Array.from(nextCookies.getAll()).map(c => c.name)
    });
  } catch (error) {
    logger.error('[TEST] Error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
