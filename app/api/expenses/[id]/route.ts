import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectsService } from '@/lib/services/budgets-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { verifyResourceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { logger } from '@/lib/logger';

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

    const expense = await projectsService.getExpenseById(params.id);

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Verify user has access to expense's space
    try {
      await verifyResourceAccess(session.user.id, expense);
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

    // Parse request body
    const body = await req.json();
    const {
      title,
      amount,
      category,
      payment_method,
      paid_by,
      status,
      due_date,
      recurring,
    } = body;

    // Prepare updates object
    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (amount !== undefined) {
      const expenseAmount = Number(amount);
      if (isNaN(expenseAmount)) {
        return NextResponse.json(
          { error: 'amount must be a valid number' },
          { status: 400 }
        );
      }
      updates.amount = expenseAmount;
    }
    if (category !== undefined) updates.category = category;
    if (payment_method !== undefined) updates.payment_method = payment_method;
    if (paid_by !== undefined) updates.paid_by = paid_by;
    if (status !== undefined) updates.status = status;
    if (due_date !== undefined) updates.due_date = due_date;
    if (recurring !== undefined) updates.recurring = recurring;

    // Get expense first to verify access
    const existingExpense = await projectsService.getExpenseById(params.id);

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Verify user has access to expense's space
    try {
      await verifyResourceAccess(session.user.id, existingExpense);
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
    const expense = await projectsService.updateExpense(params.id, updates);

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

    // Get expense first to verify access
    const existingExpense = await projectsService.getExpenseById(params.id);

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Verify user has access to expense's space
    try {
      await verifyResourceAccess(session.user.id, existingExpense);
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
    await projectsService.deleteExpense(params.id);

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
