import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectsService } from '@/lib/services/budgets-service';
import { ratelimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';

/**
 * GET /api/expenses
 * Get all expenses for a space
 */
export async function GET(req: NextRequest) {
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

    // Get expenses from service
    const expenses = await projectsService.getExpenses(spaceId);

    return NextResponse.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    console.error('[API] /api/expenses GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses
 * Create a new expense
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const {
      space_id,
      title,
      amount,
      category,
      payment_method,
      paid_by,
      status,
      due_date,
      recurring,
    } = body;

    // Validate required fields
    if (!space_id || !title || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'space_id, title, and amount are required' },
        { status: 400 }
      );
    }

    // Validate amount is a number
    const expenseAmount = Number(amount);
    if (isNaN(expenseAmount)) {
      return NextResponse.json(
        { error: 'amount must be a valid number' },
        { status: 400 }
      );
    }

    // Verify user has access to this space
    try {
      await verifySpaceAccess(session.user.id, space_id);
    } catch (error) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Validate title length
    if (title && title.trim().length > 200) {
      return NextResponse.json(
        { error: 'title must be 200 characters or less' },
        { status: 400 }
      );
    }

    // Create expense using service
    const expense = await projectsService.createExpense({
      space_id,
      title: title.trim(),
      amount: expenseAmount,
      category,
      payment_method,
      paid_by,
      status,
      due_date,
      recurring,
    });

    return NextResponse.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error('[API] /api/expenses POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
