import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // SECURITY: Rate limiting to prevent abuse
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // SECURITY: Verify authentication
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    const { userId } = await req.json();

    // SECURITY: Input validation
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Valid User ID is required' },
        { status: 400 }
      );
    }


    // SECURITY: UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid User ID format' },
        { status: 400 }
      );
    }

    // SECURITY: Only allow users to delete their own orphaned user
    // (This endpoint should only be called during signup errors)
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this user' },
        { status: 403 }
      );
    }

    // Get environment variables at runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      logger.error('Missing Supabase credentials', undefined, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create admin client at runtime (server-side only)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete the orphaned auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      logger.error('[SECURITY] Error deleting orphaned user:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to delete orphaned user' },
        { status: 500 }
      );
    }

    // SECURITY: Audit log for user deletion
    logger.info(`[AUDIT] User ${user.id} successfully deleted orphaned user ${userId}`, { component: 'api-route' });

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/auth/cleanup-orphaned-user',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('Cleanup error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
