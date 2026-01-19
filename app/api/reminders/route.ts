import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { remindersService } from '@/lib/services/reminders-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { createReminderSchema } from '@/lib/validations/reminder-schemas';
import { sanitizePlainText } from '@/lib/sanitize';
import { withUserDataCache } from '@/lib/utils/cache-headers';

/**
 * GET /api/reminders
 * Get all reminders for a space
 */
export async function GET(req: NextRequest) {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Get space_id from query params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, spaceId);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Get reminders from service
    const reminders = await remindersService.getReminders(spaceId, supabase);

    return withUserDataCache(
      NextResponse.json({
        success: true,
        data: reminders,
      })
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/reminders',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/reminders GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reminders
 * Create a new reminder
 */
export async function POST(req: NextRequest) {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Parse and validate request body with Zod
    const body = await req.json();
    try {
      createReminderSchema.parse({
        ...body,
        created_by: user.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }

    const { space_id, title, description } = body;

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, space_id);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Create reminder using service with sanitized inputs
    const reminder = await remindersService.createReminder({
      ...body,
      title: sanitizePlainText(title),
      description: description ? sanitizePlainText(description) : undefined,
    }, supabase);

    return NextResponse.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/reminders',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/reminders POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}
