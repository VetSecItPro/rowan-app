import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportSpaceData, getSpaceExportSummary } from '@/lib/services/space-export-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';

/**
 * GET /api/spaces/[spaceId]/export
 * Get export summary for a space (preview before deletion)
 */
export async function GET(req: NextRequest, props: { params: Promise<{ spaceId: string }> }) {
  const params = await props.params;
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    const { spaceId } = params;

    // SECURITY: UUID validation for space_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(spaceId)) {
      return NextResponse.json(
        { error: 'Invalid Space ID format' },
        { status: 400 }
      );
    }

    // Get export summary
    const result = await getSpaceExportSummary(spaceId, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes('owner') ? 403 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/spaces/[spaceId]/export',
        method: 'GET',
      },
      extra: {
        spaceId: params.spaceId,
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/spaces/[spaceId]/export GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spaces/[spaceId]/export
 * Export all data from a specific space (for space deletion)
 */
export async function POST(req: NextRequest, props: { params: Promise<{ spaceId: string }> }) {
  const params = await props.params;
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    const { spaceId } = params;

    // SECURITY: UUID validation for space_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(spaceId)) {
      return NextResponse.json(
        { error: 'Invalid Space ID format' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { format = 'json' } = body;

    // SECURITY: Validate format parameter
    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be json or csv.' },
        { status: 400 }
      );
    }

    // Export space data
    const result = await exportSpaceData(spaceId, session.user.id, format);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes('owner') ? 403 : 400 }
      );
    }

    // Get space name for filename
    const { data: spaceData } = await supabase
      .from('spaces')
      .select('name')
      .eq('id', spaceId)
      .single();

    const spaceName = spaceData?.name || 'space';
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${spaceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-export-${timestamp}.${format}`;

    // Set appropriate headers for file download
    const headers = new Headers();

    if (format === 'csv') {
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);

      return new NextResponse(result.data as string, {
        status: 200,
        headers
      });
    } else {
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);

      return NextResponse.json(result.data, {
        status: 200,
        headers
      });
    }

  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/spaces/[spaceId]/export',
        method: 'POST',
      },
      extra: {
        spaceId: params.spaceId,
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/spaces/[spaceId]/export POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}