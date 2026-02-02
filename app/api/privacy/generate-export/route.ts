// Data Export Generation API
// Generates comprehensive user data exports in JSON/CSV/PDF formats for GDPR Article 20 compliance

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Validation schemas
const ExportRequestSchema = z.object({
  exportId: z.string().uuid(),
  userId: z.string().uuid(),
  format: z.enum(['json', 'csv', 'pdf']),
});

// POST - Generate data export (background processing)
export async function POST(request: NextRequest) {
  try {
    // Fail-closed: reject if secret is not configured
    if (!process.env.INTERNAL_API_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    // Verify this is a legitimate system request (internal API call)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { exportId, userId, format } = ExportRequestSchema.parse(body);

    const supabase = await createClient();

    // Update export status to processing
    await supabase
      .from('data_export_requests')
      .update({ status: 'processing' })
      .eq('id', exportId);

    logger.info(`🔄 Starting data export for user ${userId}, format: ${format}`, { component: 'api-route' });

    try {
      // Gather all user data
      const userData = await gatherUserData(userId);

      // Generate export file based on format
      let fileBuffer: Buffer;
      let fileName: string;
      switch (format) {
        case 'json':
          fileBuffer = await generateJSONExport(userData);
          fileName = `rowan-data-export-${userId}-${Date.now()}.json`;
          break;
        case 'csv':
          fileBuffer = await generateCSVExport(userData);
          fileName = `rowan-data-export-${userId}-${Date.now()}.csv`;
          break;
        case 'pdf':
          fileBuffer = await generatePDFExport(userData);
          fileName = `rowan-data-export-${userId}-${Date.now()}.pdf`;
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Upload file to storage (in a real implementation, you'd use S3, GCS, etc.)
      const fileUrl = await uploadExportFile(fileName, fileBuffer);

      // Update export request with completion status
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day download window

      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          file_url: fileUrl,
          file_size_bytes: fileBuffer.length,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', exportId);

      // Send email notification with download link
      await sendExportCompletionEmail(userId, fileUrl, fileName, format, expiresAt);

      logger.info(`✅ Data export completed for user ${userId}, file: ${fileName}`, { component: 'api-route' });

      return NextResponse.json({
        success: true,
        message: 'Data export completed successfully',
        data: {
          exportId,
          fileName,
          fileSize: fileBuffer.length,
          downloadUrl: fileUrl,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (error) {
      logger.error('❌ Data export failed for user ${userId}:', error, { component: 'api-route', action: 'api_request' });

      // Update export status to failed
      await supabase
        .from('data_export_requests')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', exportId);

      // Send error notification email
      await sendExportFailureEmail(userId);

      return NextResponse.json(
        { success: false, error: 'Data export failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Data export API error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Gather comprehensive user data from all relevant tables
async function gatherUserData(userId: string) {
  const supabase = await createClient();

  logger.info(`📊 Gathering data for user ${userId}...`, { component: 'api-route' });

  // User profile and account information
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Privacy preferences
  const { data: privacyPrefs } = await supabase
    .from('user_privacy_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Privacy preference history
  const { data: privacyHistory } = await supabase
    .from('privacy_preference_history')
    .select('*')
    .eq('user_id', userId)
    .order('changed_at', { ascending: false });

  // Email notifications log
  const { data: emailNotifications } = await supabase
    .from('privacy_email_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Account deletion requests (if any)
  const { data: deletionRequests } = await supabase
    .from('account_deletion_requests')
    .select('*')
    .eq('user_id', userId);

  // Data export requests history
  const { data: exportRequests } = await supabase
    .from('data_export_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Get spaces the user is a member of
  const { data: spaceMembers } = await supabase
    .from('space_members')
    .select(`
      *,
      spaces (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq('user_id', userId);

  // Get user's tasks across all spaces
  const spaceIds = (spaceMembers || [])
    .map((sm: SpaceMemberRecord) => sm.space_id)
    .filter((spaceId: string | undefined | null): spaceId is string => Boolean(spaceId));
  const { data: tasks } = spaceIds.length > 0 ? await supabase
    .from('tasks')
    .select('*')
    .in('space_id', spaceIds)
    .eq('assigned_to', userId) : { data: [] };

  // Get user's calendar events
  const { data: calendarEvents } = spaceIds.length > 0 ? await supabase
    .from('calendar_events')
    .select('*')
    .in('space_id', spaceIds)
    .eq('created_by', userId) : { data: [] };

  // Get user's reminders
  const { data: reminders } = spaceIds.length > 0 ? await supabase
    .from('reminders')
    .select('*')
    .in('space_id', spaceIds)
    .eq('created_by', userId) : { data: [] };

  // Get user's messages
  const { data: messages } = spaceIds.length > 0 ? await supabase
    .from('messages')
    .select('*')
    .in('space_id', spaceIds)
    .eq('sender_id', userId) : { data: [] };

  // Get user's goals
  const { data: goals } = spaceIds.length > 0 ? await supabase
    .from('goals')
    .select('*')
    .in('space_id', spaceIds)
    .eq('created_by', userId) : { data: [] };

  const userData: ExportBundle = {
    exportMetadata: {
      userId,
      exportDate: new Date().toISOString(),
      gdprCompliance: 'Article 20 - Right to Data Portability',
      retention: 'Data exported as of export date',
    },
    profile: profile || null,
    privacyPreferences: privacyPrefs || null,
    privacyHistory: privacyHistory || [],
    emailNotifications: emailNotifications || [],
    deletionRequests: deletionRequests || [],
    exportRequests: exportRequests || [],
    spaces: {
      memberships: spaceMembers || [],
      tasks: tasks || [],
      calendarEvents: calendarEvents || [],
      reminders: reminders || [],
      messages: messages || [],
      goals: goals || [],
    },
  };

  logger.info(`✅ Data gathered: ${Object.keys(userData).length} categories`, { component: 'api-route' });
  return userData;
}

// Generate JSON export
type ExportRecord = Record<string, unknown>;

type ExportBundle = {
  exportMetadata: {
    userId: string;
    exportDate: string;
    gdprCompliance: string;
    retention: string;
  };
  profile?: ExportRecord | null;
  privacyPreferences?: ExportRecord | null;
  privacyHistory?: ExportRecord[];
  emailNotifications?: ExportRecord[];
  deletionRequests?: ExportRecord[];
  exportRequests?: ExportRecord[];
  spaces: {
    memberships: ExportRecord[];
    tasks: ExportRecord[];
    calendarEvents: ExportRecord[];
    reminders: ExportRecord[];
    messages: ExportRecord[];
    goals: ExportRecord[];
  };
};

type SpaceMemberRecord = { space_id?: string | null };

// Generate JSON export
async function generateJSONExport(userData: ExportBundle): Promise<Buffer> {
  const exportData = {
    ...userData,
    _format: 'json',
    _version: '1.0',
    _generated: new Date().toISOString(),
  };

  return Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8');
}

// Generate CSV export
async function generateCSVExport(userData: ExportBundle): Promise<Buffer> {
  let csvContent = 'Rowan Data Export\n';
  csvContent += `Export Date: ${new Date().toISOString()}\n`;
  csvContent += `User ID: ${userData.exportMetadata.userId}\n`;
  csvContent += 'GDPR Article 20 - Right to Data Portability\n\n';

  // Profile information
  if (userData.profile) {
    csvContent += 'PROFILE INFORMATION\n';
    csvContent += 'Field,Value\n';
    Object.entries(userData.profile).forEach(([key, value]) => {
      csvContent += `"${key}","${value || ''}"\n`;
    });
    csvContent += '\n';
  }

  // Privacy preferences
  if (userData.privacyPreferences) {
    csvContent += 'PRIVACY PREFERENCES\n';
    csvContent += 'Setting,Value\n';
    Object.entries(userData.privacyPreferences).forEach(([key, value]) => {
      csvContent += `"${key}","${value || ''}"\n`;
    });
    csvContent += '\n';
  }

  // Tasks
  if (userData.spaces.tasks?.length > 0) {
    csvContent += 'TASKS\n';
    csvContent += 'Title,Description,Status,Due Date,Created At\n';
    userData.spaces.tasks.forEach((task: ExportRecord) => {
      csvContent += `"${task.title || ''}","${task.description || ''}","${task.status || ''}","${task.due_date || ''}","${task.created_at || ''}"\n`;
    });
    csvContent += '\n';
  }

  // Calendar events
  if (userData.spaces.calendarEvents?.length > 0) {
    csvContent += 'CALENDAR EVENTS\n';
    csvContent += 'Title,Description,Start Date,End Date,Created At\n';
    userData.spaces.calendarEvents.forEach((event: ExportRecord) => {
      csvContent += `"${event.title || ''}","${event.description || ''}","${event.start_date || ''}","${event.end_date || ''}","${event.created_at || ''}"\n`;
    });
    csvContent += '\n';
  }

  // Privacy history
  if (userData.privacyHistory && userData.privacyHistory.length > 0) {
    csvContent += 'PRIVACY SETTINGS HISTORY\n';
    csvContent += 'Preference,Old Value,New Value,Changed At\n';
    userData.privacyHistory.forEach((change: ExportRecord) => {
      csvContent += `"${change.preference_key || ''}","${change.old_value || ''}","${change.new_value || ''}","${change.changed_at || ''}"\n`;
    });
  }

  return Buffer.from(csvContent, 'utf-8');
}

// Generate PDF export (simplified version - in production you'd use a library like Puppeteer or jsPDF)
async function generatePDFExport(userData: ExportBundle): Promise<Buffer> {
  // This is a simplified PDF-like text format
  // In a real implementation, you'd use a proper PDF library
  let pdfContent = 'ROWAN DATA EXPORT\n';
  pdfContent += '==================\n\n';
  pdfContent += `Export Date: ${new Date().toISOString()}\n`;
  pdfContent += `User ID: ${userData.exportMetadata.userId}\n`;
  pdfContent += 'GDPR Article 20 - Right to Data Portability\n\n';

  if (userData.profile) {
    pdfContent += 'PROFILE INFORMATION\n';
    pdfContent += '-------------------\n';
    Object.entries(userData.profile).forEach(([key, value]) => {
      pdfContent += `${key}: ${value || 'N/A'}\n`;
    });
    pdfContent += '\n';
  }

  if (userData.privacyPreferences) {
    pdfContent += 'PRIVACY PREFERENCES\n';
    pdfContent += '-------------------\n';
    Object.entries(userData.privacyPreferences).forEach(([key, value]) => {
      pdfContent += `${key}: ${value || 'N/A'}\n`;
    });
    pdfContent += '\n';
  }

  pdfContent += 'DATA SUMMARY\n';
  pdfContent += '------------\n';
  pdfContent += `Tasks: ${userData.spaces.tasks?.length || 0}\n`;
  pdfContent += `Calendar Events: ${userData.spaces.calendarEvents?.length || 0}\n`;
  pdfContent += `Messages: ${userData.spaces.messages?.length || 0}\n`;
  pdfContent += `Reminders: ${userData.spaces.reminders?.length || 0}\n`;
  pdfContent += `Goals: ${userData.spaces.goals?.length || 0}\n`;
  pdfContent += `Space Memberships: ${userData.spaces.memberships?.length || 0}\n`;

  // Note: In production, you would use a proper PDF library here
  return Buffer.from(pdfContent, 'utf-8');
}

// Upload export file to storage (mock implementation)
async function uploadExportFile(fileName: string, fileBuffer: Buffer): Promise<string> {
  // In a real implementation, you would upload to S3, Google Cloud Storage, etc.
  // For now, we'll simulate a file URL
  const baseUrl = getAppUrl();
  const fileUrl = `${baseUrl}/api/privacy/download-export?file=${encodeURIComponent(fileName)}`;

  logger.info(`📁 Mock upload: ${fileName} (${fileBuffer.length} bytes)`, { component: 'api-route' });

  // In production, you would:
  // 1. Upload to cloud storage
  // 2. Set appropriate access controls
  // 3. Return the actual download URL

  return fileUrl;
}

// Send export completion email
async function sendExportCompletionEmail(
  userId: string,
  downloadUrl: string,
  fileName: string,
  format: string,
  expiresAt: Date
) {
  try {
    const supabase = await createClient();

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      logger.info('❌ No email found for user, skipping notification', { component: 'api-route' });
      return;
    }

    if (!resend) {
      logger.error('Resend API key not configured', undefined, { component: 'api-route', action: 'api_request' });
      throw new Error('Email service not available');
    }

    if (!resend) {
      logger.error('Resend API key not configured', undefined, { component: 'api-route', action: 'api_request' });
      throw new Error('Email service not available');
    }

    await resend.emails.send({
      from: 'Rowan <noreply@rowan.app>',
      to: profile.email,
      subject: '✅ Your Data Export is Ready',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">✅ Your Data Export is Ready</h2>

          <p>Hi ${profile.full_name || 'there'},</p>

          <p>Your requested data export has been successfully generated and is ready for download.</p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">Export Details</h3>
            <ul style="color: #059669;">
              <li><strong>Format:</strong> ${format.toUpperCase()}</li>
              <li><strong>File Name:</strong> ${fileName}</li>
              <li><strong>Generated:</strong> ${new Date().toLocaleDateString()}</li>
              <li><strong>Expires:</strong> ${expiresAt.toLocaleDateString()} (7 days)</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}"
               style="background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              📥 Download Your Data
            </a>
          </div>

          <div style="background: #fffbeb; border: 1px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">⚠️ Important Notes</h3>
            <ul style="color: #92400e;">
              <li>This download link expires in 7 days for security</li>
              <li>The file contains all your personal data as required by GDPR Article 20</li>
              <li>Keep this data secure and delete it when no longer needed</li>
              <li>Contact support if you have any questions about your data</li>
            </ul>
          </div>

          <p>This export includes your profile information, privacy preferences, and all data associated with your account as of the export date.</p>

          <p>If you didn't request this export, please contact our support team immediately.</p>

          <p>Best regards,<br>The Rowan Team</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated email regarding your data export request under GDPR Article 20.
          </p>
        </div>
      `,
    });

    // Log the notification
    await supabase
      .from('privacy_email_notifications')
      .insert({
        user_id: userId,
        notification_type: 'data_export_completed',
        email_address: profile.email,
      });

    logger.info(`📧 Export completion email sent to ${profile.email}`, { component: 'api-route' });
  } catch (error) {
    logger.error('Error sending export completion email:', error, { component: 'api-route', action: 'api_request' });
  }
}

// Send export failure email
async function sendExportFailureEmail(userId: string) {
  try {
    const supabase = await createClient();

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      logger.info('❌ No email found for user, skipping failure notification', { component: 'api-route' });
      return;
    }

    if (!resend) {
      logger.error('Resend API key not configured', undefined, { component: 'api-route', action: 'api_request' });
      throw new Error('Email service not available');
    }

    await resend.emails.send({
      from: 'Rowan <noreply@rowan.app>',
      to: profile.email,
      subject: '❌ Data Export Failed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">❌ Data Export Failed</h2>

          <p>Hi ${profile.full_name || 'there'},</p>

          <p>We encountered an issue while generating your requested data export.</p>

          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">What happened?</h3>
            <p style="color: #dc2626;">
              A technical error occurred during the export process. Our team has been automatically notified and will investigate the issue.
            </p>
          </div>

          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">What can you do?</h3>
            <ul style="color: #374151;">
              <li>Try requesting the export again in a few minutes</li>
              <li>Contact our support team if the issue persists</li>
              <li>Choose a different export format if you continue having problems</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${getAppUrl()}/settings?tab=privacy-data"
               style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              🔄 Try Again
            </a>
          </div>

          <p>We apologize for the inconvenience. If you continue to experience issues, please contact our support team.</p>

          <p>Best regards,<br>The Rowan Team</p>
        </div>
      `,
    });

    // Log the notification
    await supabase
      .from('privacy_email_notifications')
      .insert({
        user_id: userId,
        notification_type: 'data_export_failed',
        email_address: profile.email,
      });

    logger.info(`📧 Export failure email sent to ${profile.email}`, { component: 'api-route' });
  } catch (error) {
    logger.error('Error sending export failure email:', error, { component: 'api-route', action: 'api_request' });
  }
}
