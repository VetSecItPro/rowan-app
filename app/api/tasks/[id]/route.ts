import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tasksService } from '@/lib/services/tasks-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifyResourceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { updateTaskSchema } from '@/lib/validations/task-schemas';
import { ZodError } from 'zod';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

/**
 * GET /api/tasks/[id]
 * Get a single task by ID
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

    // Get task
    const task = await tasksService.getTaskById(params.id);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Verify user has access to task's space
    try {
      await verifyResourceAccess(user.id, task);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this task' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/tasks/[id]',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/tasks/[id] GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]
 * Update a task
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

    // Get existing task first
    const existingTask = await tasksService.getTaskById(params.id);

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Verify user has access to task's space
    try {
      await verifyResourceAccess(user.id, existingTask);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this task' },
        { status: 403 }
      );
    }

    // Parse and validate request body with Zod
    const updates = await req.json();

    let validatedUpdates;
    try {
      validatedUpdates = updateTaskSchema.parse(updates);
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

    // Update task using service (transform null to undefined for nullable fields)
    const updatedTask = await tasksService.updateTask(params.id, {
      ...validatedUpdates,
      description: validatedUpdates.description ?? undefined,
      category: validatedUpdates.category ?? undefined,
      assigned_to: validatedUpdates.assigned_to ?? undefined,
      due_date: validatedUpdates.due_date ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/tasks/[id]',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/tasks/[id] PATCH error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
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

    // Get existing task first
    const existingTask = await tasksService.getTaskById(params.id);

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Verify user has access to task's space
    try {
      await verifyResourceAccess(user.id, existingTask);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this task' },
        { status: 403 }
      );
    }

    // Delete task using service
    await tasksService.deleteTask(params.id);

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/tasks/[id]',
        method: 'DELETE',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    logger.error('[API] /api/tasks/[id] DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
