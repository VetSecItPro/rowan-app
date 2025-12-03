import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Create Supabase admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface ExpiringUser {
  email: string;
  access_expires_at: string;
  days_remaining: number;
}

// Email template for 7-day warning
function get7DayEmailHtml(email: string, expiryDate: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Your Beta Access is Expiring Soon</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your Rowan beta testing access will expire in <strong>7 days</strong> on <strong>${expiryDate}</strong>.
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      We hope you've enjoyed exploring Rowan's features during the beta period! If you'd like to continue using Rowan and keep all your data, tasks, and settings, you can upgrade to a full account.
    </p>

    <div style="text-align: center; margin: 40px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade?email=${encodeURIComponent(email)}"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Upgrade Your Account
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
      If you have any questions, feel free to reach out to <a href="mailto:support@rowan.app" style="color: #667eea;">support@rowan.app</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>Rowan - Your Family Command Center</p>
  </div>
</body>
</html>
  `;
}

// Email template for 3-day warning
function get3DayEmailHtml(email: string, expiryDate: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Final Reminder: Beta Access Expires in 3 Days</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      This is your final reminder: Your Rowan beta access will expire in <strong style="color: #ef4444;">3 days</strong> on <strong>${expiryDate}</strong>.
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Don't lose access to your tasks, calendar events, and family data! Upgrade now to keep everything you've created during the beta period.
    </p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>What happens after expiration:</strong><br>
        • You'll lose access to your Rowan account<br>
        • Your data will be preserved for 30 days<br>
        • You can upgrade anytime to restore access
      </p>
    </div>

    <div style="text-align: center; margin: 40px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade?email=${encodeURIComponent(email)}"
         style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Upgrade Now
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
      Questions? Contact us at <a href="mailto:support@rowan.app" style="color: #f59e0b;">support@rowan.app</a>
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>Rowan - Your Family Command Center</p>
  </div>
</body>
</html>
  `;
}

export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailsSent = {
      sevenDay: 0,
      threeDay: 0,
      errors: [] as string[]
    };

    // Get users expiring in 7 days
    const { data: sevenDayUsers, error: sevenDayError } = await supabaseAdmin
      .rpc('get_expiring_beta_users', { days_threshold: 7 });

    if (sevenDayError) {
      console.error('Error fetching 7-day expiring users:', sevenDayError);
      emailsSent.errors.push(`7-day fetch error: ${sevenDayError.message}`);
    } else if (sevenDayUsers) {
      for (const user of sevenDayUsers as ExpiringUser[]) {
        // Check if notification already sent
        const { data: alreadySent } = await supabaseAdmin
          .rpc('has_expiration_notification_sent', {
            user_email: user.email,
            notif_type: '7_day'
          });

        if (!alreadySent) {
          try {
            const expiryDate = new Date(user.access_expires_at).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            await resend.emails.send({
              from: 'Rowan <noreply@rowan.app>',
              to: user.email,
              subject: 'Your Rowan Beta Access Expires in 7 Days',
              html: get7DayEmailHtml(user.email, expiryDate)
            });

            // Record notification sent
            await supabaseAdmin.rpc('record_expiration_notification', {
              user_email: user.email,
              notif_type: '7_day'
            });

            emailsSent.sevenDay++;
          } catch (error) {
            console.error(`Error sending 7-day email to ${user.email}:`, error);
            emailsSent.errors.push(`7-day email to ${user.email}: ${error}`);
          }
        }
      }
    }

    // Get users expiring in 3 days
    const { data: threeDayUsers, error: threeDayError } = await supabaseAdmin
      .rpc('get_expiring_beta_users', { days_threshold: 3 });

    if (threeDayError) {
      console.error('Error fetching 3-day expiring users:', threeDayError);
      emailsSent.errors.push(`3-day fetch error: ${threeDayError.message}`);
    } else if (threeDayUsers) {
      for (const user of threeDayUsers as ExpiringUser[]) {
        // Check if notification already sent
        const { data: alreadySent } = await supabaseAdmin
          .rpc('has_expiration_notification_sent', {
            user_email: user.email,
            notif_type: '3_day'
          });

        if (!alreadySent) {
          try {
            const expiryDate = new Date(user.access_expires_at).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            await resend.emails.send({
              from: 'Rowan <noreply@rowan.app>',
              to: user.email,
              subject: '⏰ Final Reminder: Rowan Beta Access Expires in 3 Days',
              html: get3DayEmailHtml(user.email, expiryDate)
            });

            // Record notification sent
            await supabaseAdmin.rpc('record_expiration_notification', {
              user_email: user.email,
              notif_type: '3_day'
            });

            emailsSent.threeDay++;
          } catch (error) {
            console.error(`Error sending 3-day email to ${user.email}:`, error);
            emailsSent.errors.push(`3-day email to ${user.email}: ${error}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
