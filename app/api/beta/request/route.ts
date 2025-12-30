import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateEmail } from '@/lib/utils/email-validation';
import { Resend } from 'resend';
import { z } from 'zod';

// Beta program configuration
const MAX_BETA_USERS = 100;
const BETA_DEADLINE = '2026-02-15T23:59:59Z';

// Rate limiting: 3 requests per hour per IP
const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'beta_request',
    })
  : null;

// Resend client for sending emails
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Request validation schema
const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100).optional(),
});

/**
 * POST /api/beta/request
 * Request beta access - validates email, generates invite code, sends email
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = extractIP(req.headers);

    if (ratelimit) {
      const { success, remaining, reset } = await ratelimit.limit(ip);

      if (!success) {
        const resetDate = new Date(reset);
        return NextResponse.json(
          {
            error: 'Too many requests. Please try again later.',
            retry_after: Math.ceil((reset - Date.now()) / 1000),
            reset_at: resetDate.toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    }

    // Parse and validate request body
    const body = await req.json();
    const { email, name } = requestSchema.parse(body);

    // Validate email (format + disposable domain check)
    const emailValidation = validateEmail(email, {
      allowAnyDomain: true,
      blockDisposable: true,
    });

    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if beta program is still open
    const now = new Date();
    const deadline = new Date(BETA_DEADLINE);
    if (now > deadline) {
      return NextResponse.json(
        {
          error: 'The beta program has ended. Please sign up for a regular account when we launch!',
          beta_ended: true,
        },
        { status: 403 }
      );
    }

    // Check slots remaining
    const { data: slotsData } = await supabaseAdmin.rpc('get_beta_slots_remaining');
    const slotsRemaining = slotsData ?? MAX_BETA_USERS;

    if (slotsRemaining <= 0) {
      return NextResponse.json(
        {
          error: 'Beta program has reached capacity (100 users). Join our launch notification list instead!',
          at_capacity: true,
          slots_remaining: 0,
        },
        { status: 403 }
      );
    }

    // Check if email already has an invite code
    const { data: existingCode } = await supabaseAdmin
      .from('beta_invite_codes')
      .select('id, code, used_by, created_at')
      .eq('email', normalizedEmail)
      .single();

    if (existingCode) {
      // Email already has a code
      if (existingCode.used_by) {
        return NextResponse.json(
          {
            error: 'This email has already been used to create a beta account. Please log in instead.',
            already_registered: true,
          },
          { status: 400 }
        );
      }

      // Resend the existing code
      if (resend) {
        await sendBetaInviteEmail(normalizedEmail, existingCode.code, name);
      }

      return NextResponse.json({
        success: true,
        message: 'We found your existing invite code and resent it to your email.',
        resent: true,
      });
    }

    // Check if email already has an account
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'An account with this email already exists. Please log in instead.',
          already_registered: true,
        },
        { status: 400 }
      );
    }

    // Generate a new invite code
    const { data: newCodes, error: generateError } = await supabaseAdmin.rpc(
      'generate_invite_codes',
      {
        p_count: 1,
        p_source: 'email_request',
        p_admin_id: null,
      }
    );

    if (generateError || !newCodes || newCodes.length === 0) {
      throw new Error('Failed to generate invite code');
    }

    const inviteCode = newCodes[0].code;

    // Update the invite code with the email
    await supabaseAdmin
      .from('beta_invite_codes')
      .update({
        email: normalizedEmail,
        notes: name ? `Requested by: ${name}` : 'Email request',
      })
      .eq('code', inviteCode);

    // Log the beta request
    await supabaseAdmin.from('beta_access_requests').insert({
      email: normalizedEmail,
      ip_address: ip,
      user_agent: req.headers.get('user-agent') || null,
      access_granted: true,
      notes: `Auto-generated code: ${inviteCode}`,
      created_at: new Date().toISOString(),
    });

    // Send the invite email
    if (resend) {
      const emailResult = await sendBetaInviteEmail(normalizedEmail, inviteCode, name);
      if (!emailResult.success) {
        // Log email failure but don't fail the request
        console.error('Failed to send beta invite email:', emailResult.error);
      }
    }

    // Increment daily analytics
    const today = new Date().toISOString().split('T')[0];
    await supabaseAdmin.rpc('increment_beta_requests', { target_date: today });

    return NextResponse.json({
      success: true,
      message: 'Check your email! Your beta invite code is on its way.',
      slots_remaining: slotsRemaining - 1,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }

    Sentry.captureException(error);
    console.error('Beta request error:', error);
    return NextResponse.json(
      { error: 'Failed to process beta request. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Send beta invite email via Resend
 */
async function sendBetaInviteEmail(
  email: string,
  inviteCode: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://rowan.app'}/signup?beta_code=${inviteCode}`;

  try {
    await resend.emails.send({
      from: 'Rowan <notifications@rowanapp.com>',
      replyTo: 'support@rowanapp.com',
      to: email,
      subject: "You're invited to Rowan Beta! 🌳",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Rowan Beta</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); padding: 40px 40px 30px; text-align: center;">
              <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://rowan.app'}/rowan-logo.png" alt="Rowan" width="80" height="80" style="margin-bottom: 16px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to Rowan Beta!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                ${name ? `Hi ${name},` : 'Hi there,'}
              </p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                You're one of only <strong>100 people</strong> invited to test Rowan before anyone else. Thank you for joining us on this journey!
              </p>

              <!-- Invite Code Box -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #ecfeff 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Invite Code</p>
                <p style="margin: 0; color: #1e40af; font-size: 32px; font-weight: 700; font-family: 'SF Mono', Monaco, 'Courier New', monospace; letter-spacing: 2px;">
                  ${inviteCode}
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                  Create Your Account →
                </a>
              </div>

              <!-- What to expect -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600;">What to expect:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                  <li>Full access to all features until <strong>February 15, 2026</strong></li>
                  <li>Your feedback directly shapes the final product</li>
                  <li>Exclusive beta tester badge</li>
                  <li>Special pricing when we launch</li>
                </ul>
              </div>

              <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Questions? Just reply to this email – we read every message.
              </p>

              <p style="margin: 24px 0 0; color: #374151; font-size: 16px;">
                — The Rowan Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © 2025 Rowan • Veteran Owned Business
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                This code expires on February 15, 2026
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
Welcome to Rowan Beta!

${name ? `Hi ${name},` : 'Hi there,'}

You're one of only 100 people invited to test Rowan before anyone else. Thank you for joining us on this journey!

YOUR INVITE CODE: ${inviteCode}

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
    });

    return { success: true };
  } catch (error) {
    console.error('Resend email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
