import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { safeCookiesAsync } from '@/lib/utils/safe-cookies';
import { decryptSessionData, validateSessionData } from '@/lib/utils/session-crypto-edge';
import { buildAppUrl } from '@/lib/utils/app-url';
import { z } from 'zod';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import BetaInviteEmail from '@/lib/emails/templates/BetaInviteEmail';

// Force dynamic rendering for admin authentication
export const dynamic = 'force-dynamic';

// Resend client for sending emails
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Request validation schema
const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/admin/beta/resend-invite
 * Resend beta invite email to a user
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check admin authentication
    const cookieStore = await safeCookiesAsync();
    const adminSession = cookieStore.get('admin-session');

    if (!adminSession) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Decrypt and validate admin session
    let sessionData: { email?: string; adminId?: string; role?: string };
    try {
      sessionData = await decryptSessionData(adminSession.value);
      if (!validateSessionData(sessionData)) {
        return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const { email } = resendSchema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    // Find the invite code for this email
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('beta_invite_codes')
      .select('id, code, email, used_by, is_active')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (codeError) {
      throw new Error(`Failed to find invite code: ${codeError.message}`);
    }

    if (!codeData) {
      return NextResponse.json(
        { error: 'No invite code found for this email address' },
        { status: 404 }
      );
    }

    if (codeData.used_by) {
      return NextResponse.json(
        { error: 'This user has already redeemed their code and created an account' },
        { status: 400 }
      );
    }

    if (!codeData.is_active) {
      return NextResponse.json(
        { error: 'This invite code has been deactivated' },
        { status: 400 }
      );
    }

    // Send the invite email
    if (!resend) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      );
    }

    const signupUrl = buildAppUrl('/signup', { beta_code: codeData.code });

    // Render the React Email template to HTML
    const emailHtml = await render(
      BetaInviteEmail({
        recipientEmail: normalizedEmail,
        inviteCode: codeData.code,
        signupUrl,
        expiresAt: 'February 15, 2026',
      })
    );

    const { error: emailError } = await resend.emails.send({
      from: 'Rowan <notifications@rowanapp.com>',
      replyTo: 'support@rowanapp.com',
      to: normalizedEmail,
      subject: "Reminder: You're invited to Rowan Beta! 🌳",
      html: emailHtml,
      text: `
Reminder: Your Rowan Beta Invite

Hi there,

This is a reminder that you have a beta invite waiting for you!

YOUR INVITE CODE: ${codeData.code}

Create your account: ${signupUrl}

What to expect:
• Full access to all features until February 15, 2026
• Your feedback directly shapes the final product
• Exclusive beta tester badge
• Special pricing when we launch

Questions? Just reply to this email – we read every message.

— The Rowan Team

© 2025 Rowan • Veteran Owned Business
This code expires on February 15, 2026
      `,
      tags: [
        { name: 'category', value: 'beta-invite-resend' },
        { name: 'invite_code', value: codeData.code },
      ],
    });

    if (emailError) {
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `Beta invite resent to ${normalizedEmail}`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    Sentry.captureException(error);
    console.error('Resend invite error:', error);
    return NextResponse.json(
      { error: 'Failed to resend invite email' },
      { status: 500 }
    );
  }
}
