import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calendarService } from '@/lib/services/calendar-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifyResourceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { updateCalendarEventSchema } from '@/lib/validations/calendar-event-schemas';
import { sanitizePlainText } from '@/lib/sanitize';

/**
 * GET /api/calendar/[id]
 * Get a single calendar event by ID
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
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

    // Get event
    const event = await calendarService.getEventById(params.id);

    if (!event) {
      return NextResponse.json(
        { error: 'Calendar event not found' },
        { status: 404 }
      );
    }

    // Verify user has access to event's space
    try {
      await verifyResourceAccess(session.user.id, event);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this calendar event' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/calendar/[id]',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/calendar/[id] GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendar/[id]
 * Update a calendar event
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
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

    // Get existing event first
    const existingEvent = await calendarService.getEventById(params.id);

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Calendar event not found' },
        { status: 404 }
      );
    }

    // Verify user has access to event's space
    try {
      await verifyResourceAccess(session.user.id, existingEvent);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this calendar event' },
        { status: 403 }
      );
    }

    // Parse and validate request body with Zod
    const body = await req.json();
    try {
      updateCalendarEventSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }

    const { title, description, location } = body;

    // Update event using service with sanitized inputs
    const updatedEvent = await calendarService.updateEvent(params.id, {
      ...body,
      title: title ? sanitizePlainText(title) : undefined,
      description: description ? sanitizePlainText(description) : undefined,
      location: location ? sanitizePlainText(location) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/calendar/[id]',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/calendar/[id] PATCH error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/[id]
 * Delete a calendar event
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
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

    // Get existing event first
    const existingEvent = await calendarService.getEventById(params.id);

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Calendar event not found' },
        { status: 404 }
      );
    }

    // Verify user has access to event's space
    try {
      await verifyResourceAccess(session.user.id, existingEvent);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this calendar event' },
        { status: 403 }
      );
    }

    // Delete event using service
    await calendarService.deleteEvent(params.id);

    return NextResponse.json({
      success: true,
      message: 'Calendar event deleted successfully',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/calendar/[id]',
        method: 'DELETE',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/calendar/[id] DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
