import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { accountDeletionService } from '@/lib/services/account-deletion-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { logger } from '@/lib/logger';

/**
 * Cancel Account Deletion API
 *
 * Allows users to restore their account within the 30-day grace period.
 *
 * GDPR COMPLIANCE:
 * - Implements user's right to revoke deletion request
 * - Removes deletion record while keeping audit trail
 * - User can continue using account normally after cancellation
 *
 * SECURITY:
 * - Requires authenticated user
 * - Only users can cancel their own deletion
 * - Validates user is marked for deletion
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if account is actually marked for deletion
    const isMarked = await accountDeletionService.isAccountMarkedForDeletion(user.id, supabase);

    if (!isMarked) {
      return NextResponse.json(
        { error: 'Account is not marked for deletion' },
        { status: 400 }
      );
    }

    // Cancel the deletion
    const result = await accountDeletionService.cancelAccountDeletion(user.id, supabase);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to cancel deletion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account deletion cancelled successfully',
    });
  } catch (error) {
    logger.error('[API] Error canceling account deletion:', error, {
      component: 'CancelDeletionAPI',
      action: 'POST',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get Account Deletion Status
 *
 * Returns whether the user's account is marked for deletion
 * and the permanent deletion date if applicable.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check deletion status
    const { data: deletionRecord, error: checkError } = await supabase
      .from('deleted_accounts')
      .select('deletion_requested_at, permanent_deletion_at')
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('[API] Error checking deletion status:', checkError, {
        component: 'CancelDeletionAPI',
        action: 'GET_STATUS',
      });
      return NextResponse.json(
        { error: 'Failed to check deletion status' },
        { status: 500 }
      );
    }

    if (!deletionRecord) {
      return NextResponse.json({
        markedForDeletion: false,
      });
    }

    return NextResponse.json({
      markedForDeletion: true,
      deletionRequestedAt: deletionRecord.deletion_requested_at,
      permanentDeletionAt: deletionRecord.permanent_deletion_at,
    });
  } catch (error) {
    logger.error('[API] Error getting deletion status:', error, {
      component: 'CancelDeletionAPI',
      action: 'GET',
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
