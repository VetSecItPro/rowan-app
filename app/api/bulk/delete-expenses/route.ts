import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bulkDeleteExpenses, getExpensesBulkDeleteCount } from '@/lib/services/bulk-operations-service';
import { checkExpensiveOperationRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';

// Zod schemas for validation
const BulkDeleteOptionsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  categoryId: z.string().uuid('Invalid category ID format').optional(),
  budgetId: z.string().uuid('Invalid budget ID format').optional(),
}).optional();

const BulkDeleteRequestSchema = z.object({
  partnership_id: z.string().uuid('Invalid partnership ID format'),
  options: BulkDeleteOptionsSchema,
});

const GetCountQuerySchema = z.object({
  partnership_id: z.string().uuid('Invalid partnership ID format'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  category_id: z.string().uuid('Invalid category ID format').optional(),
  budget_id: z.string().uuid('Invalid budget ID format').optional(),
});

/**
 * Bulk Delete Expenses API Endpoint
 *
 * GDPR COMPLIANCE:
 * - Article 17: Right to Erasure
 * - Allows users to delete multiple expenses at once
 */

export async function POST(request: NextRequest) {
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    // Rate limit check - expensive/destructive operation (5 per hour)
    const ip = extractIP(request.headers);
    const { success: rateLimitPassed } = await checkExpensiveOperationRateLimit(ip);
    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Bulk operations are limited to 5 per hour.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = BulkDeleteRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { partnership_id, options } = validationResult.data;

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
    logger.error('Bulk delete expenses error', error, { component: 'api/bulk/delete-expenses', action: 'post' });
    return NextResponse.json(
      { error: 'Failed to delete expenses' },
      { status: 500 }
    );
  }
}

// Get count of expenses that would be deleted
export async function GET(request: NextRequest) {
  try {
    // Rate limit check
    const ip = extractIP(request.headers);
    const { success: rateLimitPassed } = await checkExpensiveOperationRateLimit(ip);
    if (!rateLimitPassed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      partnership_id: searchParams.get('partnership_id') || '',
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      budget_id: searchParams.get('budget_id') || undefined,
    };

    // Remove undefined values for cleaner validation
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([, v]) => v !== undefined)
    );

    const validationResult = GetCountQuerySchema.safeParse(cleanParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { partnership_id: partnershipId, start_date: startDate, end_date: endDate, category_id: categoryId, budget_id: budgetId } = validationResult.data;

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
    logger.error('Get bulk delete count error', error, { component: 'api/bulk/delete-expenses', action: 'get' });
    return NextResponse.json(
      { error: 'Failed to get count' },
      { status: 500 }
    );
  }
}
