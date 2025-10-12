import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calendarService } from '@/lib/services/calendar-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifyResourceAccess } from '@/lib/services/authorization-service';

/**
 * GET /api/calendar/[id]
 * Get a single calendar event by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting (with graceful fallback)
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Continue if rate limiting fails
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    console.error('[API] /api/calendar/[id] GET error:', error);
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
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting (with graceful fallback)
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Continue if rate limiting fails
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // Parse request body
    const updates = await req.json();

    // Update event using service
    const updatedEvent = await calendarService.updateEvent(params.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    console.error('[API] /api/calendar/[id] PATCH error:', error);
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
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting (with graceful fallback)
    try {
      const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Continue if rate limiting fails
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    console.error('[API] /api/calendar/[id] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
