import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';
import { checkSensitiveOperationRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const DeletionCancelledSchema = z.object({
  userId: z.string().uuid(),
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
    // Rate limit: 3 requests per 24 hours per IP (sensitive operation)
    const ip = extractIP(req.headers);
    const { success: rateLimitOk } = await checkSensitiveOperationRateLimit(ip);
    if (!rateLimitOk) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = DeletionCancelledSchema.safeParse(body);
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

    const { error: sendError } = await resend.emails.send({
      from: 'Rowan <noreply@rowan.app>',
      to: profile.email,
      subject: 'Account Deletion Cancelled',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Account Deletion Cancelled</h2>

          <p>Hi ${profile.full_name || 'there'},</p>

          <p>Great news! Your account deletion request has been successfully cancelled.</p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <strong style="color: #059669;">Your account is now safe and will not be deleted.</strong>
          </div>

          <p>You can continue using Rowan as normal. All your data, spaces, and settings remain intact.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${getAppUrl()}/dashboard"
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Return to Dashboard
            </a>
          </div>

          <p>Thank you for staying with Rowan!</p>
        </div>
      `,
    });

    if (sendError) {
      logger.error('Deletion cancelled email send failed', sendError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Email delivery failed. Please try again later.' },
        { status: 502 }
      );
    }

    await supabaseAdmin
      .from('privacy_email_notifications')
      .insert({
        user_id: user.id,
        notification_type: 'deletion_cancelled',
        email_address: profile.email,
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Deletion cancelled email API error', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
