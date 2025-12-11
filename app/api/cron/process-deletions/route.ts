// Account Deletion Background Job
// Processes account deletion reminders and executions on a daily schedule

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// This should be called by a cron job (Vercel Cron or external)
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Fail-closed if CRON_SECRET is not configured
    if (!process.env.CRON_SECRET) {
      console.error('[CRON] CRON_SECRET environment variable not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient();
    const today = new Date();
    const results = {
      sevenDayReminders: 0,
      oneDayReminders: 0,
      deletionsProcessed: 0,
      errors: 0,
    };

    console.log('🔄 Starting account deletion processing job...', today.toISOString());

    // Step 1: Send 7-day reminders
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const { data: sevenDayAccounts, error: sevenDayError } = await supabase
      .from('account_deletion_requests')
      .select(`
        *,
        profiles!inner(email, full_name)
      `)
      .eq('deletion_completed', false)
      .is('cancelled_at', null)
      .eq('reminder_sent_7_days', false)
      .lte('scheduled_deletion_date', sevenDaysFromNow.toISOString())
      .gte('scheduled_deletion_date', today.toISOString());

    if (sevenDayError) {
      console.error('Error fetching 7-day reminder accounts:', sevenDayError);
      results.errors++;
    } else if (sevenDayAccounts && sevenDayAccounts.length > 0) {
      console.log(`📧 Processing ${sevenDayAccounts.length} seven-day reminders...`);

      for (const account of sevenDayAccounts) {
        try {
          await send7DayDeletionReminder(
            account.profiles.email,
            account.profiles.full_name || 'User',
            new Date(account.scheduled_deletion_date),
            account.id
          );

          // Mark reminder as sent
          await supabase
            .from('account_deletion_requests')
            .update({ reminder_sent_7_days: true })
            .eq('id', account.id);

          // Log email notification
          await supabase
            .from('privacy_email_notifications')
            .insert({
              user_id: account.user_id,
              notification_type: 'deletion_reminder_7_days',
              email_address: account.profiles.email,
            });

          results.sevenDayReminders++;
          console.log(`✅ Sent 7-day reminder to ${account.profiles.email}`);
        } catch (error) {
          console.error(`❌ Failed to send 7-day reminder to ${account.profiles.email}:`, error);
          results.errors++;
        }
      }
    }

    // Step 2: Send 1-day reminders
    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);

    const { data: oneDayAccounts, error: oneDayError } = await supabase
      .from('account_deletion_requests')
      .select(`
        *,
        profiles!inner(email, full_name)
      `)
      .eq('deletion_completed', false)
      .is('cancelled_at', null)
      .eq('reminder_sent_1_day', false)
      .lte('scheduled_deletion_date', oneDayFromNow.toISOString())
      .gte('scheduled_deletion_date', today.toISOString());

    if (oneDayError) {
      console.error('Error fetching 1-day reminder accounts:', oneDayError);
      results.errors++;
    } else if (oneDayAccounts && oneDayAccounts.length > 0) {
      console.log(`📧 Processing ${oneDayAccounts.length} one-day reminders...`);

      for (const account of oneDayAccounts) {
        try {
          await send1DayDeletionReminder(
            account.profiles.email,
            account.profiles.full_name || 'User',
            new Date(account.scheduled_deletion_date),
            account.id
          );

          // Mark reminder as sent
          await supabase
            .from('account_deletion_requests')
            .update({ reminder_sent_1_day: true })
            .eq('id', account.id);

          // Log email notification
          await supabase
            .from('privacy_email_notifications')
            .insert({
              user_id: account.user_id,
              notification_type: 'deletion_reminder_1_day',
              email_address: account.profiles.email,
            });

          results.oneDayReminders++;
          console.log(`✅ Sent 1-day reminder to ${account.profiles.email}`);
        } catch (error) {
          console.error(`❌ Failed to send 1-day reminder to ${account.profiles.email}:`, error);
          results.errors++;
        }
      }
    }

    // Step 3: Process account deletions
    const { data: accountsToDelete, error: deleteError } = await supabase
      .from('account_deletion_requests')
      .select(`
        *,
        profiles!inner(email, full_name)
      `)
      .eq('deletion_completed', false)
      .is('cancelled_at', null)
      .lte('scheduled_deletion_date', today.toISOString());

    if (deleteError) {
      console.error('Error fetching accounts to delete:', deleteError);
      results.errors++;
    } else if (accountsToDelete && accountsToDelete.length > 0) {
      console.log(`🗑️ Processing ${accountsToDelete.length} account deletions...`);

      for (const account of accountsToDelete) {
        try {
          await executeAccountDeletion(account.user_id, account.profiles.email, account.profiles.full_name || 'User');

          // Mark deletion as completed
          await supabase
            .from('account_deletion_requests')
            .update({ deletion_completed: true })
            .eq('id', account.id);

          results.deletionsProcessed++;
          console.log(`✅ Deleted account for ${account.profiles.email}`);
        } catch (error) {
          console.error(`❌ Failed to delete account for ${account.profiles.email}:`, error);
          results.errors++;
        }
      }
    }

    console.log('✅ Account deletion processing job completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Account deletion processing completed',
      results,
    });
  } catch (error) {
    console.error('❌ Account deletion processing job failed:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Email notification functions
async function send7DayDeletionReminder(
  email: string,
  userName: string,
  deletionDate: Date,
  requestId: string
) {
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/privacy-data?cancel-deletion=${requestId}`;

  if (!resend) {
    console.warn('Resend API key not configured, skipping email');
    return;
  }

  await resend.emails.send({
    from: 'Rowan <noreply@rowan.app>',
    to: email,
    subject: 'Account Deletion in 7 Days - Last Chance to Cancel',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Account Deletion in 7 Days</h2>

        <p>Hi ${userName},</p>

        <p>This is a reminder that your Rowan account is scheduled for deletion in <strong>7 days</strong>:</p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <strong style="color: #dc2626; font-size: 18px;">${deletionDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</strong>
        </div>

        <div style="background: #fffbeb; border: 1px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">⏰ This is your last week to cancel!</h3>
          <ul style="color: #92400e;">
            <li>All your data will be permanently deleted</li>
            <li>You will lose access to all your spaces</li>
            <li>This action cannot be undone</li>
            <li>We'll send one final reminder 24 hours before deletion</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${cancelUrl}"
             style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            🛑 Cancel Account Deletion
          </a>
        </div>

        <p>If you still want to delete your account, no action is needed. The deletion will proceed automatically on the scheduled date.</p>

        <p>If you have any questions, please contact our support team immediately.</p>

        <p>Best regards,<br>The Rowan Team</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated reminder. If you didn't request account deletion, please contact support immediately.
        </p>
      </div>
    `,
  });
}

async function send1DayDeletionReminder(
  email: string,
  userName: string,
  deletionDate: Date,
  requestId: string
) {
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings/privacy-data?cancel-deletion=${requestId}`;

  if (!resend) {
    console.warn('Resend API key not configured, skipping email');
    return;
  }

  await resend.emails.send({
    from: 'Rowan <noreply@rowan.app>',
    to: email,
    subject: '🚨 URGENT: Account Deletion Tomorrow - Final Notice',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 FINAL NOTICE: Account Deletion Tomorrow</h2>

        <p>Hi ${userName},</p>

        <p><strong>This is your final notice.</strong> Your Rowan account will be permanently deleted tomorrow:</p>

        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin: 0; color: white;">DELETION DATE</h3>
          <div style="font-size: 24px; font-weight: bold; margin: 10px 0;">
            ${deletionDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div style="font-size: 14px;">Less than 24 hours remaining</div>
        </div>

        <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">⚠️ What happens tomorrow:</h3>
          <ul style="color: #dc2626;">
            <li><strong>All your data will be permanently deleted</strong></li>
            <li><strong>You will lose access to all your spaces</strong></li>
            <li><strong>This action cannot be undone</strong></li>
            <li><strong>No further recovery will be possible</strong></li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${cancelUrl}"
             style="background: #dc2626; color: white; padding: 20px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 18px;">
            🛑 CANCEL DELETION NOW
          </a>
        </div>

        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; text-align: center; color: #374151;">
            <strong>Still want to delete your account?</strong><br>
            No action needed. The deletion will proceed automatically tomorrow.
          </p>
        </div>

        <p>If you have any last-minute questions or concerns, please contact our support team immediately.</p>

        <p>Best regards,<br>The Rowan Team</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          <strong>This is your final automated reminder.</strong><br>
          If you didn't request account deletion, contact support immediately.
        </p>
      </div>
    `,
  });
}

// Execute the actual account deletion
async function executeAccountDeletion(userId: string, email: string, userName: string) {
  const supabase = createClient();

  try {
    // 1. Delete user data from all tables
    // Note: Due to CASCADE constraints, deleting the auth user should clean up most data
    // But we'll be explicit for important tables

    // Delete from custom tables first
    await supabase.from('user_privacy_preferences').delete().eq('user_id', userId);
    await supabase.from('privacy_preference_history').delete().eq('user_id', userId);
    await supabase.from('data_export_requests').delete().eq('user_id', userId);
    await supabase.from('privacy_email_notifications').delete().eq('user_id', userId);

    // Delete user profile and related data (CASCADE should handle most)
    await supabase.from('users').delete().eq('id', userId);

    // 2. Delete from auth.users (this will cascade to related tables)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
    }

    // 3. Send deletion confirmation email
    await sendDeletionCompletedEmail(email, userName);

    console.log(`✅ Account deletion completed for user ${userId} (${email})`);
  } catch (error) {
    console.error(`❌ Account deletion failed for user ${userId}:`, error);
    throw error;
  }
}

async function sendDeletionCompletedEmail(email: string, userName: string) {
  try {
    if (!resend) {
    console.warn('Resend API key not configured, skipping email');
    return;
  }

  await resend.emails.send({
      from: 'Rowan <noreply@rowan.app>',
      to: email,
      subject: 'Account Successfully Deleted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">✅ Account Successfully Deleted</h2>

          <p>Hi ${userName},</p>

          <p>Your Rowan account has been successfully deleted as requested.</p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">✅ Deletion Complete</h3>
            <ul style="color: #059669;">
              <li>All your personal data has been permanently removed</li>
              <li>Your account access has been revoked</li>
              <li>All space memberships have been terminated</li>
              <li>This action is final and cannot be reversed</li>
            </ul>
          </div>

          <p>We're sorry to see you go. If you decide to return to Rowan in the future, you'll need to create a new account.</p>

          <p>Thank you for using Rowan, and we wish you all the best.</p>

          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; text-align: center; color: #374151; font-size: 14px;">
              <strong>Data Retention:</strong> This confirmation email is the only record we maintain after account deletion.
            </p>
          </div>

          <p>Best regards,<br>The Rowan Team</p>
        </div>
      `,
    });

    // Log the final email notification
    const supabase = createClient();
    await supabase
      .from('privacy_email_notifications')
      .insert({
        user_id: 'deleted', // Special marker for deleted accounts
        notification_type: 'deletion_completed',
        email_address: email,
      });
  } catch (error) {
    console.error('Error sending deletion completed email:', error);
    // Don't throw error here - deletion is already complete
  }
}