import { Resend } from 'resend';
import { accountDeletionService } from './account-deletion-service';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Email Notification Service for Account Deletion
 *
 * Handles all email communications related to account deletion:
 * 1. Immediate confirmation when deletion is initiated
 * 2. Warning email 5 days before permanent deletion (day 25)
 * 3. Final confirmation after permanent deletion (day 30)
 */

export interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send account deletion initiated email
 * Sent immediately when user requests account deletion
 */
export async function sendDeletionInitiatedEmail(
  userEmail: string,
  userId: string,
  userName?: string
): Promise<EmailResult> {
  try {
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    const { data, error } = await resend.emails.send({
      from: 'Rowan <noreply@rowan-app.com>',
      to: userEmail,
      subject: 'Account Deletion Initiated - 30 Day Grace Period',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Deletion Initiated</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .info-box { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Account Deletion Initiated</h1>
          </div>

          <div class="content">
            <p>Hello ${userName || 'there'},</p>

            <p>This email confirms that your Rowan account deletion has been initiated. Your account is now scheduled for permanent deletion.</p>

            <div class="warning-box">
              <strong>⏰ 30-Day Grace Period</strong><br>
              Your account will be permanently deleted on <strong>${deletionDate.toLocaleDateString()}</strong>.
              You can cancel this deletion anytime before then by simply logging back into your account.
            </div>

            <div class="info-box">
              <strong>📧 Email Timeline</strong><br>
              • <strong>Today:</strong> Deletion initiated (this email)<br>
              • <strong>Day 25:</strong> Final warning email (5 days before deletion)<br>
              • <strong>Day 30:</strong> Permanent deletion completed
            </div>

            <h3>What happens during the grace period:</h3>
            <ul>
              <li>Your account remains accessible if you log in</li>
              <li>All your data is preserved and unchanged</li>
              <li>You can cancel deletion at any time</li>
              <li>You'll receive reminder emails before permanent deletion</li>
            </ul>

            <h3>To cancel deletion:</h3>
            <p>Simply log back into your Rowan account before ${deletionDate.toLocaleDateString()}. This will automatically cancel the deletion process.</p>

            <a href="https://rowan-app.com/restore-account" class="button">🛑 Cancel Deletion - Restore Account</a>

            <p style="margin-top: 15px; font-size: 14px; color: #666;">Or log in at: <a href="https://rowan-app.com/login" style="color: #007bff;">rowan-app.com/login</a></p>

            <p><strong>GDPR Compliance:</strong> This deletion process fulfills your Right to Erasure under GDPR Article 17. All personal data will be permanently removed after the grace period.</p>
          </div>

          <div class="footer">
            <p>Rowan - Your Life, Organized<br>
            This email was sent because you requested account deletion.<br>
            If you did not request this, please contact support immediately.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) throw error;

    // Log email sent for audit trail
    await accountDeletionService.logDeletionAction(userId, 'email_sent', {
      email_type: 'deletion_initiated',
      sent_to: userEmail,
      sent_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending deletion initiated email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

/**
 * Send 30-day warning email (day 25)
 * Sent 5 days before permanent deletion
 */
export async function send30DayWarningEmail(
  userEmail: string,
  userId: string,
  userName?: string,
  deletionDate?: Date
): Promise<EmailResult> {
  try {
    const finalDate = deletionDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const { data, error } = await resend.emails.send({
      from: 'Rowan <noreply@rowan-app.com>',
      to: userEmail,
      subject: '⚠️ Final Warning: Account Deletion in 5 Days',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Final Deletion Warning</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .urgent-box { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; font-size: 16px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>⚠️ Final Warning</h1>
            <h2>Account Deletion in 5 Days</h2>
          </div>

          <div class="content">
            <p>Hello ${userName || 'there'},</p>

            <div class="urgent-box">
              <strong>🚨 URGENT: Your Rowan account will be permanently deleted in 5 days</strong><br>
              <strong>Deletion Date: ${finalDate.toLocaleDateString()}</strong>
            </div>

            <p>This is your final warning before your account and all associated data are permanently deleted. After ${finalDate.toLocaleDateString()}, this action cannot be undone.</p>

            <h3>What will be deleted:</h3>
            <ul>
              <li>All expenses and budget data</li>
              <li>Tasks, goals, and projects</li>
              <li>Calendar events and reminders</li>
              <li>Messages and conversations</li>
              <li>Shopping lists and meal plans</li>
              <li>All other personal data</li>
            </ul>

            <h3>To cancel deletion:</h3>
            <p><strong>Click the button below before ${finalDate.toLocaleDateString()}</strong> to automatically cancel the deletion process.</p>

            <a href="https://rowan-app.com/restore-account" class="button">🛑 CANCEL DELETION - RESTORE ACCOUNT NOW</a>

            <p style="margin-top: 15px; font-size: 14px; color: #666;">Or log in at: <a href="https://rowan-app.com/login" style="color: #dc3545; font-weight: bold;">rowan-app.com/login</a></p>

            <p><strong>⚠️ Important:</strong> If you intended to delete your account, no further action is required. The deletion will proceed automatically on ${finalDate.toLocaleDateString()}.</p>
          </div>

          <div class="footer">
            <p>Rowan - Your Life, Organized<br>
            This is an automated reminder for your account deletion request.<br>
            To stop these emails, log in to cancel deletion or wait for the process to complete.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) throw error;

    // Log email sent for audit trail
    await accountDeletionService.logDeletionAction(userId, 'email_sent', {
      email_type: '30_day_warning',
      sent_to: userEmail,
      sent_at: new Date().toISOString(),
      deletion_date: finalDate.toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending 30-day warning email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

/**
 * Send permanent deletion confirmation email
 * Sent after account has been permanently deleted
 */
export async function sendPermanentDeletionConfirmationEmail(
  userEmail: string,
  userId: string,
  userName?: string
): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Rowan <noreply@rowan-app.com>',
      to: userEmail,
      subject: '✅ Account Permanently Deleted - Confirmation',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Deletion Completed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Account Deletion Complete</h1>
          </div>

          <div class="content">
            <p>Hello ${userName || 'there'},</p>

            <div class="success-box">
              <strong>✅ Your Rowan account has been permanently deleted</strong><br>
              Deletion completed on: <strong>${new Date().toLocaleDateString()}</strong>
            </div>

            <p>This email confirms that your account and all associated data have been permanently removed from our systems as requested.</p>

            <h3>What was deleted:</h3>
            <ul>
              <li>Your user profile and account information</li>
              <li>All expenses, budgets, and financial data</li>
              <li>Tasks, goals, projects, and productivity data</li>
              <li>Calendar events, reminders, and scheduling data</li>
              <li>Messages, conversations, and communication data</li>
              <li>Shopping lists, meal plans, and household data</li>
              <li>All other personal data associated with your account</li>
            </ul>

            <h3>What we retained:</h3>
            <ul>
              <li>This deletion confirmation (for our legal compliance)</li>
              <li>Audit logs of the deletion process (required for GDPR compliance)</li>
              <li>No personal data - only deletion metadata</li>
            </ul>

            <p><strong>GDPR Compliance:</strong> This deletion fulfills your Right to Erasure under GDPR Article 17. Your personal data has been permanently erased from our systems.</p>

            <p>Thank you for using Rowan. If you decide to use our service again in the future, you're welcome to create a new account.</p>
          </div>

          <div class="footer">
            <p>Rowan - Your Life, Organized<br>
            This is the final email regarding your account deletion.<br>
            You will not receive any further communications from us.</p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) throw error;

    // Log email sent for audit trail
    await accountDeletionService.logDeletionAction(userId, 'email_sent', {
      email_type: 'permanent_deletion_confirmation',
      sent_to: userEmail,
      sent_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending permanent deletion confirmation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}