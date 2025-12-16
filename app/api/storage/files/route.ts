/**
 * Storage Files API Route
 * GET /api/storage/files?spaceId=xxx
 * Returns list of files in a space's storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Query storage.objects for files in this space
    // Note: This queries the storage.objects table directly
    const { data: files, error: filesError } = await supabase
      .from('objects')
      .select('id, name, metadata, created_at')
      .eq('bucket_id', 'space-files')
      .order('created_at', { ascending: false });

    if (filesError) {
      logger.error('Error fetching files:', filesError, { component: 'api-route', action: 'api_request' });
      // Don't fail if we can't fetch files - return empty array
      return NextResponse.json({ files: [] }, { status: 200 });
    }

    // Filter files by space_id from metadata
    const spaceFiles = (files || [])
      .filter((file: any) => {
        const metadata = file.metadata || {};
        return metadata.space_id === spaceId;
      })
      .map((file: any) => ({
        id: file.id,
        name: file.name,
        size: parseInt(file.metadata?.size || '0', 10),
        created_at: file.created_at,
        metadata: file.metadata,
      }));

    return NextResponse.json({ files: spaceFiles }, { status: 200 });
  } catch (error) {
    logger.error('Error in storage files API:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to get files list' },
      { status: 500 }
    );
  }
}
