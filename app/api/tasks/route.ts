import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tasksService } from '@/lib/services/tasks-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { createTaskSchema } from '@/lib/validations/task-schemas';
import { ZodError } from 'zod';
import { fallbackRateLimit, extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

/**
 * GET /api/tasks
 * Get all tasks for a space with optional filtering
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting with fallback protection
    const ip = extractIP(req.headers);

    try {
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Fallback to in-memory rate limiting
      Sentry.captureMessage('Rate limiting degraded (using fallback)', {
        level: 'warning',
        tags: { service: 'rate-limit', endpoint: '/api/tasks', method: 'GET' },
      });

      const allowed = fallbackRateLimit(ip, 10, 10 * 1000);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
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

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Get space_id from query params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this space
    try {
      await verifySpaceAccess(session.user.id, spaceId);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Get optional query params for filtering
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigned_to = searchParams.get('assigned_to');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build query options
    const options: any = {};
    if (status) options.status = status;
    if (priority) options.priority = priority;
    if (assigned_to) options.assigned_to = assigned_to;
    if (category) options.category = category;
    if (search) options.search = search;

    // Get tasks from service
    const tasks = await tasksService.getTasks(spaceId, options);

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/tasks',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/tasks GET error', error, {
      component: 'TasksAPI',
      action: 'GET',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting with fallback protection
    const ip = extractIP(req.headers);

    try {
      const { success: rateLimitSuccess } = await ratelimit.limit(ip);

      if (!rateLimitSuccess) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      // Fallback to in-memory rate limiting
      Sentry.captureMessage('Rate limiting degraded (using fallback)', {
        level: 'warning',
        tags: { service: 'rate-limit', endpoint: '/api/tasks', method: 'POST' },
      });

      const allowed = fallbackRateLimit(ip, 10, 10 * 1000);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
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

    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Parse and validate request body with Zod
    const body = await req.json();

    let validatedData;
    try {
      validatedData = createTaskSchema.parse({
        ...body,
        created_by: session.user.id,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.issues.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Verify user has access to this space
    try {
      await verifySpaceAccess(session.user.id, validatedData.space_id);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Create task using service (transform null to undefined for nullable fields)
    const task = await tasksService.createTask({
      ...validatedData,
      description: validatedData.description ?? undefined,
      category: validatedData.category ?? undefined,
      assigned_to: validatedData.assigned_to ?? undefined,
      due_date: validatedData.due_date ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/tasks',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/tasks POST error', error, {
      component: 'TasksAPI',
      action: 'POST',
    });
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
