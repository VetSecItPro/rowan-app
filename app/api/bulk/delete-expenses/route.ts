import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { bulkDeleteExpenses, getExpensesBulkDeleteCount } from '@/lib/services/bulk-operations-service';

/**
 * Bulk Delete Expenses API Endpoint
 *
 * GDPR COMPLIANCE:
 * - Article 17: Right to Erasure
 * - Allows users to delete multiple expenses at once
 */

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { partnership_id, options } = body;

    if (!partnership_id) {
      return NextResponse.json({ error: 'Partnership ID required' }, { status: 400 });
    }

    // Verify user has access to this partnership
    const { data: membership } = await supabase
      .from('partnership_members')
      .select('*')
      .eq('partnership_id', partnership_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Perform bulk delete
    const result = await bulkDeleteExpenses(partnership_id, options || {});

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted_count: result.deleted_count,
    });
  } catch (error) {
    console.error('Bulk delete expenses error:', error);
    return NextResponse.json(
      { error: 'Failed to delete expenses' },
      { status: 500 }
    );
  }
}

// Get count of expenses that would be deleted
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const partnershipId = searchParams.get('partnership_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const categoryId = searchParams.get('category_id');
    const budgetId = searchParams.get('budget_id');

    if (!partnershipId) {
      return NextResponse.json({ error: 'Partnership ID required' }, { status: 400 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('partnership_members')
      .select('*')
      .eq('partnership_id', partnershipId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const count = await getExpensesBulkDeleteCount(partnershipId, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      categoryId: categoryId || undefined,
      budgetId: budgetId || undefined,
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Get bulk delete count error:', error);
    return NextResponse.json(
      { error: 'Failed to get count' },
      { status: 500 }
    );
  }
}
