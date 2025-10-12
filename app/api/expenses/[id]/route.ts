import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectsService } from '@/lib/services/budgets-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifyResourceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';

/**
 * GET /api/expenses/[id]
 * Get a single expense by ID
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
    console.error('[API] /api/expenses/[id] GET error:', error);
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
    console.error('[API] /api/expenses/[id] PATCH error:', error);
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
    console.error('[API] /api/expenses/[id] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
