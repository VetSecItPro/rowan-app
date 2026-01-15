import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { remindersService } from '@/lib/services/reminders-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyResourceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for reminder updates
const UpdateReminderSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  remind_at: z.string().datetime().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.string().max(100).optional(),
  assigned_to: z.string().uuid().optional(),
  completed: z.boolean().optional(),
  completed_at: z.string().datetime().optional(),
  category: z.enum(['bills', 'health', 'work', 'personal', 'household']).optional(),
  emoji: z.string().max(10).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['active', 'completed', 'snoozed']).optional(),
  snooze_until: z.string().datetime().optional(),
  reminder_time: z.string().max(10).optional(),
}).strict(); // Reject unknown keys

/**
 * GET /api/reminders/[id]
 * Get a single reminder by ID
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Get reminder
    const reminder = await remindersService.getReminderById(params.id);

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Verify user has access to reminder's space
    try {
      await verifyResourceAccess(user.id, reminder);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/reminders/[id]',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this reminder' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    logger.error('[API] /api/reminders/[id] GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reminders/[id]
 * Update a reminder
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Get existing reminder first
    const existingReminder = await remindersService.getReminderById(params.id);

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Verify user has access to reminder's space
    try {
      await verifyResourceAccess(user.id, existingReminder);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/reminders/[id]',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this reminder' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = UpdateReminderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Update reminder using service
    const updatedReminder = await remindersService.updateReminder(params.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedReminder,
    });
  } catch (error) {
    logger.error('[API] /api/reminders/[id] PATCH error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reminders/[id]
 * Delete a reminder
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Get existing reminder first
    const existingReminder = await remindersService.getReminderById(params.id);

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Verify user has access to reminder's space
    try {
      await verifyResourceAccess(user.id, existingReminder);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/reminders/[id]',
        method: 'DELETE',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this reminder' },
        { status: 403 }
      );
    }

    // Delete reminder using service
    await remindersService.deleteReminder(params.id);

    return NextResponse.json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  } catch (error) {
    logger.error('[API] /api/reminders/[id] DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}
