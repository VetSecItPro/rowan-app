import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectsService } from '@/lib/services/budgets-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyResourceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// Zod schema for expense updates
const UpdateExpenseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  amount: z.number().min(0).optional(),
  category: z.string().max(100).optional().nullable(),
  payment_method: z.string().max(50).optional().nullable(),
  paid_by: z.string().uuid().optional().nullable(),
  status: z.enum(['pending', 'paid', 'overdue']).optional(),
  due_date: z.string().optional().nullable(),
  recurring: z.boolean().optional(),
}).strict();

/**
 * GET /api/expenses/[id]
 * Get a single expense by ID
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

    const expense = await projectsService.getExpenseById(params.id, supabase);

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Verify user has access to expense's space
    try {
      await verifyResourceAccess(user.id, expense);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/expenses/[id]',
        method: 'GET',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this expense' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    logger.error('[API] /api/expenses/[id] GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/expenses/[id]
 * Update an expense
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

    // Parse and validate request body
    const body = await req.json();
    const validationResult = UpdateExpenseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Prepare updates object (only include defined fields)
    const updates: Record<string, unknown> = {};
    if (validatedData.title !== undefined) updates.title = validatedData.title.trim();
    if (validatedData.amount !== undefined) updates.amount = validatedData.amount;
    if (validatedData.category !== undefined) updates.category = validatedData.category;
    if (validatedData.payment_method !== undefined) updates.payment_method = validatedData.payment_method;
    if (validatedData.paid_by !== undefined) updates.paid_by = validatedData.paid_by;
    if (validatedData.status !== undefined) updates.status = validatedData.status;
    if (validatedData.due_date !== undefined) updates.due_date = validatedData.due_date;
    if (validatedData.recurring !== undefined) updates.recurring = validatedData.recurring;

    // Get expense first to verify access
    const existingExpense = await projectsService.getExpenseById(params.id, supabase);

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Verify user has access to expense's space
    try {
      await verifyResourceAccess(user.id, existingExpense);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/expenses/[id]',
        method: 'PATCH',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this expense' },
        { status: 403 }
      );
    }

    // Update expense using service
    const expense = await projectsService.updateExpense(params.id, updates, supabase);

    return NextResponse.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    logger.error('[API] /api/expenses/[id] PATCH error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expenses/[id]
 * Delete an expense
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

    // Get expense first to verify access
    const existingExpense = await projectsService.getExpenseById(params.id, supabase);

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Verify user has access to expense's space
    try {
      await verifyResourceAccess(user.id, existingExpense);
    } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/expenses/[id]',
        method: 'DELETE',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });

      return NextResponse.json(
        { error: 'You do not have access to this expense' },
        { status: 403 }
      );
    }

    // Delete expense using service
    await projectsService.deleteExpense(params.id, supabase);

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    logger.error('[API] /api/expenses/[id] DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
