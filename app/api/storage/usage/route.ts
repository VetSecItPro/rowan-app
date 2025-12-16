/**
 * Storage Usage API Route
 * GET /api/storage/usage?spaceId=xxx
 * Returns storage usage information for a space
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSpaceStorageUsage } from '@/lib/services/storage-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get space ID from query params
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');

    if (!spaceId) {
      return NextResponse.json({ error: 'Space ID is required' }, { status: 400 });
    }

    // Verify user has access to this space
    const { data: spaceMember, error: memberError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !spaceMember) {
      return NextResponse.json(
        { error: 'Access denied to this space' },
        { status: 403 }
      );
    }

    // Get storage usage
    const result = await getSpaceStorageUsage(spaceId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ usage: result.data }, { status: 200 });
  } catch (error) {
    logger.error('Error in storage usage API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to get storage usage' },
      { status: 500 }
    );
  }
}
