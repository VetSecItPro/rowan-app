// Account Deletion API Route
// Handles account deletion requests with 30-day grace period

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { ratelimit } from '@/lib/ratelimit';
import { Resend } from 'resend';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Validation schemas
const RequestDeletionSchema = z.object({
  reason: z.string().optional(),
  feedback: z.string().max(1000).optional(),
});

const CancelDeletionSchema = z.object({
  reason: z.string().max(500).optional(),
});

// POST - Request account deletion
export async function POST(request: NextRequest) {
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Rate limiting - more restrictive for deletion requests
    const identifier = `deletion-request-${userId}`;
    const { success: rateLimitSuccess } = await ratelimit?.limit(identifier) ?? { success: true };
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Too many deletion requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    RequestDeletionSchema.parse(body);

    // Check if user already has an active deletion request
    const { data: existingRequest } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('deletion_completed', false)
      .is('cancelled_at', null)
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'You already have an active account deletion request.' },
        { status: 409 }
      );
    }

    // Calculate deletion date (30 days from now)
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30);

    // Create deletion request
    const { data: deletionRequest, error: insertError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: userId,
        scheduled_deletion_date: scheduledDate.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Error creating deletion request:', insertError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to create deletion request' },
        { status: 500 }
      );
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profile?.email) {
      // Send confirmation email
      await sendDeletionConfirmationEmail(
        profile.email,
        profile.full_name || 'User',
        scheduledDate,
        deletionRequest.id
      );

      // Log email notification
      await supabase
        .from('privacy_email_notifications')
        .insert({
          user_id: userId,
          notification_type: 'deletion_confirmation',
          email_address: profile.email,
        });
    }

    return NextResponse.json({
      success: true,
      data: deletionRequest,
      message: `Account deletion scheduled for ${scheduledDate.toLocaleDateString()}. You have 30 days to cancel.`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Account deletion POST error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel account deletion
export async function DELETE(request: NextRequest) {
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Rate limiting
    const identifier = `deletion-cancel-${userId}`;
    const { success: rateLimitSuccess } = await ratelimit?.limit(identifier) ?? { success: true };
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = CancelDeletionSchema.parse(body);

    // Find active deletion request
    const { data: deletionRequest, error: findError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('deletion_completed', false)
      .is('cancelled_at', null)
      .single();

    if (findError || !deletionRequest) {
      return NextResponse.json(
        { success: false, error: 'No active deletion request found' },
        { status: 404 }
      );
    }

    // Check if it's too late to cancel
    const scheduledDate = new Date(deletionRequest.scheduled_deletion_date);
    const now = new Date();
    if (now >= scheduledDate) {
      return NextResponse.json(
        { success: false, error: 'Deletion request cannot be cancelled - scheduled date has passed' },
        { status: 410 }
      );
    }

    // Cancel the deletion request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('account_deletion_requests')
      .update({
        cancelled_at: new Date().toISOString(),
        cancellation_reason: validatedData.reason || 'User cancelled request',
      })
      .eq('id', deletionRequest.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error cancelling deletion request:', updateError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to cancel deletion request' },
        { status: 500 }
      );
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profile?.email) {
      // Send cancellation confirmation email
      await sendDeletionCancellationEmail(
        profile.email,
        profile.full_name || 'User'
      );

      // Log email notification
      await supabase
        .from('privacy_email_notifications')
        .insert({
          user_id: userId,
          notification_type: 'deletion_cancelled',
          email_address: profile.email,
        });
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Account deletion has been cancelled successfully.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Account deletion DELETE error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get deletion status
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get active deletion request
    const { data: deletionRequest, error } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('deletion_completed', false)
      .is('cancelled_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active deletion request
        return NextResponse.json({
          success: true,
          data: {
            hasActiveRequest: false,
            scheduledDate: null,
            daysRemaining: null,
            canCancel: false,
            remindersSent: { sevenDays: false, oneDay: false },
          }
        });
      }

      logger.error('Error fetching deletion status:', error, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch deletion status' },
        { status: 500 }
      );
    }

    // Calculate days remaining
    const scheduledDate = new Date(deletionRequest.scheduled_deletion_date);
    const now = new Date();
    const daysRemaining = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      success: true,
      data: {
        hasActiveRequest: true,
        scheduledDate: deletionRequest.scheduled_deletion_date,
        daysRemaining,
        canCancel: daysRemaining > 0,
        remindersSent: {
          sevenDays: deletionRequest.reminder_sent_7_days,
          oneDay: deletionRequest.reminder_sent_1_day,
        },
      }
    });
  } catch (error) {
    logger.error('Account deletion GET error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Email functions
async function sendDeletionConfirmationEmail(
  email: string,
  userName: string,
  deletionDate: Date,
  requestId: string
) {
  try {
    const cancelUrl = `${getAppUrl()}/settings/privacy-data?cancel-deletion=${requestId}`;

    if (!resend) {
      logger.error('Resend API key not configured', undefined, { component: 'api-route', action: 'api_request' });
      throw new Error('Email service not available');
    }

    await resend.emails.send({
      from: 'Rowan <noreply@rowan.app>',
      to: email,
      subject: 'Account Deletion Requested - 30 Day Grace Period',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Account Deletion Requested</h2>

          <p>Hi ${userName},</p>

          <p>We've received your request to delete your Rowan account. Your account is scheduled for deletion on:</p>

          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <strong style="color: #dc2626;">${deletionDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</strong>
          </div>

          <h3>Important Information:</h3>
          <ul>
            <li>You have <strong>30 days</strong> to cancel this request</li>
            <li>All your data will be permanently deleted after the scheduled date</li>
            <li>This action cannot be undone once the deletion is completed</li>
            <li>We'll send you reminder emails 7 days and 1 day before deletion</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cancelUrl}"
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Cancel Account Deletion
            </a>
          </div>

          <p>If you have any questions or need assistance, please contact our support team.</p>

          <p>Best regards,<br>The Rowan Team</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            This email was sent because you requested account deletion.
            If you didn't make this request, please contact support immediately.
          </p>
        </div>
      `,
    });
  } catch (error) {
    logger.error('Error sending deletion confirmation email:', error, { component: 'api-route', action: 'api_request' });
    throw error;
  }
}

async function sendDeletionCancellationEmail(email: string, userName: string) {
  try {
    if (!resend) {
      logger.error('Resend API key not configured', undefined, { component: 'api-route', action: 'api_request' });
      throw new Error('Email service not available');
    }

    await resend.emails.send({
      from: 'Rowan <noreply@rowan.app>',
      to: email,
      subject: 'Account Deletion Cancelled',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Account Deletion Cancelled</h2>

          <p>Hi ${userName},</p>

          <p>Great news! Your account deletion request has been successfully cancelled.</p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <strong style="color: #059669;">Your account is now safe and will not be deleted.</strong>
          </div>

          <p>You can continue using Rowan as normal. All your data, spaces, and settings remain intact.</p>

          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${getAppUrl()}/dashboard"
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Return to Dashboard
            </a>
          </div>

          <p>Thank you for staying with Rowan!</p>

          <p>Best regards,<br>The Rowan Team</p>
        </div>
      `,
    });
  } catch (error) {
    logger.error('Error sending deletion cancellation email:', error, { component: 'api-route', action: 'api_request' });
    throw error;
  }
}
