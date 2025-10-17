import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { accountDeletionService } from '@/lib/services/account-deletion-service';

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
export async function POST(request: Request) {
  try {
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
    const isMarked = await accountDeletionService.isAccountMarkedForDeletion(user.id);

    if (!isMarked) {
      return NextResponse.json(
        { error: 'Account is not marked for deletion' },
        { status: 400 }
      );
    }

    // Cancel the deletion
    const result = await accountDeletionService.cancelAccountDeletion(user.id);

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
    console.error('[API] Error canceling account deletion:', error);
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
export async function GET(request: Request) {
  try {
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
      console.error('[API] Error checking deletion status:', checkError);
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
    console.error('[API] Error getting deletion status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
