import { createClient } from '@/lib/supabase/server';
import { exportAllUserData } from '@/lib/services/data-export-service';
import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * API Route: Export All User Data
 *
 * GDPR Compliance: Right to Data Portability (Article 20)
 * Allows authenticated users to export all their data in JSON format
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Export all user data
    const result = await exportAllUserData(user.id);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to export data' },
        { status: 500 }
      );
    }

    // Return data as downloadable JSON
    const response = new NextResponse(JSON.stringify(result.data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rowan-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });

    return response;
  } catch (error) {
    logger.error('Error in data export API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}