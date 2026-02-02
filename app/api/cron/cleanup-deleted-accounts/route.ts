import { NextResponse } from 'next/server';
import { accountDeletionService } from '@/lib/services/account-deletion-service';
import { send30DayWarningEmail, sendPermanentDeletionConfirmationEmail } from '@/lib/services/email-notification-service';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
// PERF: Prevent serverless timeout — FIX-015
export const maxDuration = 60;

/**
 * Vercel Cron Job: Cleanup Deleted Accounts
 *
 * DATA RETENTION ENFORCEMENT:
 * ---------------------------
 * This cron job enforces our 30-day account deletion grace period policy
 * as documented in Privacy Policy and Terms of Service.
 *
 * SCHEDULE: Runs daily at 3:00 AM UTC (configured in vercel.json)
 *
 * OPERATIONS:
 * -----------
 * 1. Day 25: Send 30-day warning emails (5 days before permanent deletion)
 * 2. Day 30: Permanently delete expired accounts from deleted_accounts table
 * 3. Day 30: Send final deletion confirmation emails
 *
 * DATA RETENTION POLICY:
 * ----------------------
 * - Deletion records kept for exactly 30 days in deleted_accounts table
 * - User can cancel deletion anytime during 30-day grace period
 * - After 30 days, all account data is permanently removed
 * - Audit logs retained permanently for compliance (account_deletion_audit_log)
 *
 * GDPR COMPLIANCE:
 * ----------------
 * - Implements Right to Erasure (GDPR Article 17)
 * - Provides adequate notice before permanent deletion
 * - Maintains audit trail for accountability
 *
 * CCPA COMPLIANCE:
 * ----------------
 * - Implements Right to Delete (CCPA Section 1798.105)
 * - Provides proper notice to California residents
 * - Maintains deletion records for compliance verification
 *
 * SECURITY:
 * ---------
 * - Requires CRON_SECRET environment variable to prevent unauthorized execution
 * - Only callable by Vercel Cron scheduler
 */
export async function GET(request: Request) {
  try {
    // Verify this request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = supabaseAdmin;
    const now = new Date();

    // Step 1: Send 30-day warning emails (accounts at day 25)
    const warningDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
    const warningDateStart = new Date(warningDate);
    warningDateStart.setHours(0, 0, 0, 0);
    const warningDateEnd = new Date(warningDate);
    warningDateEnd.setHours(23, 59, 59, 999);

    const { data: accountsNeedingWarning, error: warningError } = await supabase
      .from('deleted_accounts')
      .select('user_id, permanent_deletion_at')
      .gte('permanent_deletion_at', warningDateStart.toISOString())
      .lte('permanent_deletion_at', warningDateEnd.toISOString());

    let warningsSent = 0;
    let warningsFailed = 0;

    if (!warningError && accountsNeedingWarning && accountsNeedingWarning.length > 0) {
      for (const account of accountsNeedingWarning) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(account.user_id);

          if (userData?.user?.email) {
            await send30DayWarningEmail(
              userData.user.email,
              account.user_id,
              userData.user.user_metadata?.name || userData.user.email,
              new Date(account.permanent_deletion_at)
            );
            warningsSent++;
          }
        } catch {
          warningsFailed++;
        }
      }
    }

    // Step 2: Get accounts for permanent deletion (need emails first)
    const { data: accountsToDelete, error: deleteCheckError } = await supabase
      .from('deleted_accounts')
      .select('user_id, permanent_deletion_at')
      .lt('permanent_deletion_at', now.toISOString());

    // Step 3: Get user emails before deletion
    let confirmationsSent = 0;
    let confirmationsFailed = 0;
    const userEmails: Array<{userId: string, email?: string, name?: string}> = [];

    if (!deleteCheckError && accountsToDelete && accountsToDelete.length > 0) {
      for (const account of accountsToDelete) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(account.user_id);
          userEmails.push({
            userId: account.user_id,
            email: userData?.user?.email,
            name: userData?.user?.user_metadata?.name || userData?.user?.email,
          });
        } catch {
          userEmails.push({ userId: account.user_id });
        }
      }
    }

    // Step 4: Permanently delete expired accounts
    const deletionResult = await permanentlyDeleteExpiredAccounts();

    // Step 5: Send confirmation emails for deleted accounts
    for (const user of userEmails) {
      if (user.email) {
        try {
          await sendPermanentDeletionConfirmationEmail(user.email, user.userId, user.name);
          confirmationsSent++;
        } catch {
          confirmationsFailed++;
        }
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      warnings_sent: warningsSent,
      warnings_failed: warningsFailed,
      accounts_deleted: deletionResult.deleted,
      deletion_errors: deletionResult.errors,
      confirmations_sent: confirmationsSent,
      confirmations_failed: confirmationsFailed,
    };

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Permanently delete expired accounts
 */
async function permanentlyDeleteExpiredAccounts() {
  const supabase = supabaseAdmin;
  const now = new Date();

  let deleted = 0;
  let errors = 0;

  try {
    // Get expired accounts
    const { data: expiredAccounts, error: fetchError } = await supabase
      .from('deleted_accounts')
      .select('user_id, partnership_ids')
      .lt('permanent_deletion_at', now.toISOString());

    if (fetchError || !expiredAccounts || expiredAccounts.length === 0) {
      return { deleted: 0, errors: fetchError ? 1 : 0 };
    }

    for (const account of expiredAccounts) {
      try {
        // Re-verify deletion record still exists (user may have cancelled between query and execution)
        const { data: stillPending } = await supabase
          .from('deleted_accounts')
          .select('user_id')
          .eq('user_id', account.user_id)
          .maybeSingle();

        if (!stillPending) {
          // User cancelled deletion — skip
          continue;
        }

        // Log permanent deletion
        await accountDeletionService.logDeletionAction(account.user_id, 'permanent', {
          timestamp: now.toISOString(),
          partnership_ids: account.partnership_ids || [],
        }, supabase);

        // Explicitly delete personal data tables that may not cascade from auth.users
        // (FK constraints use SET NULL for user_id references, not CASCADE)
        await Promise.allSettled([
          supabase.from('push_tokens').delete().eq('user_id', account.user_id),
          supabase.from('daily_checkins').delete().eq('user_id', account.user_id),
          supabase.from('user_locations').delete().eq('user_id', account.user_id),
          supabase.from('location_sharing_settings').delete().eq('user_id', account.user_id),
          supabase.from('geofence_events').delete().eq('user_id', account.user_id),
          supabase.from('user_privacy_preferences').delete().eq('user_id', account.user_id),
          supabase.from('privacy_preference_history').delete().eq('user_id', account.user_id),
          supabase.from('data_export_requests').delete().eq('user_id', account.user_id),
          supabase.from('account_deletion_requests').delete().eq('user_id', account.user_id),
          supabase.from('space_members').delete().eq('user_id', account.user_id),
          supabase.from('users').delete().eq('id', account.user_id),
        ]);

        // Delete from auth (this cascades remaining FK references to SET NULL)
        await supabase.auth.admin.deleteUser(account.user_id);

        // Remove from deleted_accounts table
        const { error: deleteRecordError } = await supabase
          .from('deleted_accounts')
          .delete()
          .eq('user_id', account.user_id);

        if (deleteRecordError) {
          errors++;
        } else {
          deleted++;
        }
      } catch {
        errors++;
      }
    }

    return { deleted, errors };
  } catch {
    return { deleted: 0, errors: 1 };
  }
}
