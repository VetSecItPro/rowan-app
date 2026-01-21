import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const DeletionConfirmationSchema = z.object({
  userId: z.string().uuid(),
  deletionDate: z.string(),
});

async function resolveRequestUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data?.user) {
      return data.user;
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = DeletionConfirmationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await resolveRequestUser(req);
    if (!user || user.id !== parsed.data.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 503 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.email) {
      return NextResponse.json(
        { success: false, error: 'User email not found' },
        { status: 400 }
      );
    }

    const deletionDate = new Date(parsed.data.deletionDate);
    if (Number.isNaN(deletionDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid deletionDate' },
        { status: 400 }
      );
    }
    const cancelUrl = `${getAppUrl()}/settings/privacy-data`;

    const { error: sendError } = await resend.emails.send({
      from: 'Rowan <noreply@rowan.app>',
      to: profile.email,
      subject: 'Account Deletion Requested - 30 Day Grace Period',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Account Deletion Requested</h2>

          <p>Hi ${profile.full_name || 'there'},</p>

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

    if (sendError) {
      logger.error('Deletion confirmation email send failed', sendError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: sendError.message || 'Email send failed' },
        { status: 502 }
      );
    }

    await supabaseAdmin
      .from('privacy_email_notifications')
      .insert({
        user_id: user.id,
        notification_type: 'deletion_confirmation',
        email_address: profile.email,
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Deletion confirmation email API error', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
