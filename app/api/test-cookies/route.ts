import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // Test both methods of cookie access
    const nextCookies = cookies();
    const directCookies = req.headers.get('cookie');

    console.log('[TEST] Cookie comparison:', {
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
    console.error('[TEST] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}