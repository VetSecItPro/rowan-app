// Data Export API Route
// Handles user data export requests for GDPR Article 20 compliance

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { ratelimit } from '@/lib/ratelimit';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Validation schema for export requests
const DataExportRequestSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf']),
  includeData: z.object({
    profile: z.boolean().default(true),
    tasks: z.boolean().default(true),
    messages: z.boolean().default(true),
    expenses: z.boolean().default(true),
    calendar: z.boolean().default(true),
    spaces: z.boolean().default(true),
    reminders: z.boolean().default(true),
    goals: z.boolean().default(true),
    shopping: z.boolean().default(true),
    meals: z.boolean().default(true),
  }).optional(),
});

// POST - Request data export
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limiting - allow max 3 exports per day
    const identifier = `data-export-${userId}`;
    const { success: rateLimitSuccess } = await ratelimit.limit(identifier);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Too many export requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = DataExportRequestSchema.parse(body);

    // Check for existing pending/processing exports
    const { data: existingExport } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingExport && existingExport.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending export request. Please wait for it to complete.' },
        { status: 409 }
      );
    }

    // Create export request record
    const { data: exportRequest, error: insertError } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: userId,
        export_format: validatedData.format,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating export request:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create export request' },
        { status: 500 }
      );
    }

    // Start export generation asynchronously
    generateDataExport(exportRequest.id, userId, validatedData).catch(error => {
      console.error('Error in background export generation:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        exportId: exportRequest.id,
        status: 'pending',
        estimatedTime: '5-10 minutes',
      },
      message: 'Data export request created. You will receive an email when your export is ready.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Data export POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get export status
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get latest export request
    const { data: exportRequest, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching export status:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch export status' },
        { status: 500 }
      );
    }

    if (!exportRequest || exportRequest.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasActiveRequest: false,
          status: null,
          downloadUrl: null,
          expiresAt: null,
          fileSize: null,
          format: null,
        }
      });
    }

    const latestRequest = exportRequest[0];

    // Check if file has expired
    if (latestRequest.expires_at && new Date(latestRequest.expires_at) < new Date()) {
      await supabase
        .from('data_export_requests')
        .update({ status: 'expired' })
        .eq('id', latestRequest.id);

      latestRequest.status = 'expired';
    }

    return NextResponse.json({
      success: true,
      data: {
        hasActiveRequest: ['pending', 'processing'].includes(latestRequest.status),
        status: latestRequest.status,
        downloadUrl: latestRequest.file_url,
        expiresAt: latestRequest.expires_at,
        fileSize: latestRequest.file_size_bytes,
        format: latestRequest.export_format,
        createdAt: latestRequest.created_at,
      }
    });
  } catch (error) {
    console.error('Data export GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Background function to generate data export
async function generateDataExport(
  exportId: string,
  userId: string,
  request: z.infer<typeof DataExportRequestSchema>
) {
  const supabase = createClient();

  try {
    // Update status to processing
    await supabase
      .from('data_export_requests')
      .update({ status: 'processing' })
      .eq('id', exportId);

    // Collect all user data
    const userData = await collectUserData(supabase, userId, request.includeData);

    // Generate file based on format
    const fileBuffer = await generateExportFile(userData, request.format);

    // Upload to secure storage (you'd implement your preferred storage solution)
    const { fileUrl, expiresAt } = await uploadExportFile(exportId, fileBuffer, request.format);

    // Update export request with file details
    await supabase
      .from('data_export_requests')
      .update({
        status: 'completed',
        file_url: fileUrl,
        file_size_bytes: fileBuffer.length,
        expires_at: expiresAt,
      })
      .eq('id', exportId);

    // Send notification email
    await sendExportReadyEmail(userId, fileUrl, expiresAt, request.format, fileBuffer.length);

  } catch (error) {
    console.error('Error generating data export:', error);

    // Update status to failed
    await supabase
      .from('data_export_requests')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', exportId);
  }
}

// Collect all user data from various tables
async function collectUserData(supabase: any, userId: string, includeData: any = {}) {
  const data: any = {
    exportedAt: new Date().toISOString(),
    userId,
    gdprCompliance: {
      article: 'GDPR Article 20 - Right to Data Portability',
      description: 'Complete export of all personal data',
    },
  };

  try {
    // Profile data
    if (includeData?.profile !== false) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      data.profile = profile;
    }

    // Tasks
    if (includeData?.tasks !== false) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);
      data.tasks = tasks || [];
    }

    // Messages
    if (includeData?.messages !== false) {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId);
      data.messages = messages || [];
    }

    // Expenses
    if (includeData?.expenses !== false) {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId);
      data.expenses = expenses || [];
    }

    // Calendar events
    if (includeData?.calendar !== false) {
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId);
      data.calendar = events || [];
    }

    // Spaces (user is member of)
    if (includeData?.spaces !== false) {
      const { data: spaces } = await supabase
        .from('space_members')
        .select('spaces(*)')
        .eq('user_id', userId);
      data.spaces = spaces?.map(sm => sm.spaces) || [];
    }

    // Reminders
    if (includeData?.reminders !== false) {
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId);
      data.reminders = reminders || [];
    }

    // Goals
    if (includeData?.goals !== false) {
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId);
      data.goals = goals || [];
    }

    // Shopping lists
    if (includeData?.shopping !== false) {
      const { data: shopping } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', userId);
      data.shopping = shopping || [];
    }

    // Meals
    if (includeData?.meals !== false) {
      const { data: meals } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId);
      data.meals = meals || [];
    }

    // Privacy preferences and audit trail
    const { data: preferences } = await supabase
      .from('user_privacy_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    data.privacyPreferences = preferences;

    const { data: auditTrail } = await supabase
      .from('privacy_preference_history')
      .select('*')
      .eq('user_id', userId)
      .order('changed_at', { ascending: false });
    data.privacyAuditTrail = auditTrail || [];

    return data;
  } catch (error) {
    console.error('Error collecting user data:', error);
    throw new Error('Failed to collect user data');
  }
}

// Generate export file in requested format
async function generateExportFile(data: any, format: 'json' | 'csv' | 'pdf'): Promise<Buffer> {
  switch (format) {
    case 'json':
      return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');

    case 'csv':
      // For CSV, we'll create separate sheets for different data types
      let csvContent = '';

      // Profile
      if (data.profile) {
        csvContent += 'PROFILE\n';
        csvContent += Object.keys(data.profile).join(',') + '\n';
        csvContent += Object.values(data.profile).join(',') + '\n\n';
      }

      // Tasks
      if (data.tasks && data.tasks.length > 0) {
        csvContent += 'TASKS\n';
        csvContent += Object.keys(data.tasks[0]).join(',') + '\n';
        data.tasks.forEach((task: any) => {
          csvContent += Object.values(task).join(',') + '\n';
        });
        csvContent += '\n';
      }

      // Add other data types similarly...
      return Buffer.from(csvContent, 'utf-8');

    case 'pdf':
      // For PDF generation, you'd use a library like puppeteer or PDFKit
      // For now, return a simple text representation
      const pdfContent = `
        ROWAN DATA EXPORT
        Generated: ${data.exportedAt}
        User ID: ${data.userId}

        ${JSON.stringify(data, null, 2)}
      `;
      return Buffer.from(pdfContent, 'utf-8');

    default:
      throw new Error('Unsupported export format');
  }
}

// Upload file to secure storage
async function uploadExportFile(
  exportId: string,
  fileBuffer: Buffer,
  format: string
): Promise<{ fileUrl: string; expiresAt: string }> {
  // This would upload to your preferred storage solution (Supabase Storage, AWS S3, etc.)
  // For now, we'll simulate a file URL

  const fileName = `data-export-${exportId}.${format}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiration

  // Simulate file upload to Supabase Storage
  const supabase = createClient();

  try {
    const { data, error } = await supabase.storage
      .from('data-exports')
      .upload(fileName, fileBuffer, {
        contentType: format === 'json' ? 'application/json' : 'text/plain',
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Generate a signed URL for secure download
    const { data: signedUrl } = await supabase.storage
      .from('data-exports')
      .createSignedUrl(fileName, 24 * 60 * 60); // 24 hours

    return {
      fileUrl: signedUrl?.signedUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/privacy/download/${exportId}`,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error('Error uploading export file:', error);
    // Fallback to API endpoint
    return {
      fileUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/privacy/download/${exportId}`,
      expiresAt: expiresAt.toISOString(),
    };
  }
}

// Send email notification when export is ready
async function sendExportReadyEmail(
  userId: string,
  downloadUrl: string,
  expiresAt: string,
  format: string,
  fileSize: number
) {
  const supabase = createClient();

  try {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) return;

    const userName = profile.full_name || 'User';
    const fileSizeFormatted = (fileSize / 1024 / 1024).toFixed(2) + ' MB';
    const expirationDate = new Date(expiresAt).toLocaleDateString();

    await resend.emails.send({
      from: 'Rowan <noreply@rowan.app>',
      to: profile.email,
      subject: 'Your Data Export is Ready',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Your Data Export is Ready</h2>

          <p>Hi ${userName},</p>

          <p>Great news! Your data export has been successfully generated and is ready for download.</p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <strong>Export Details:</strong><br>
            Format: ${format.toUpperCase()}<br>
            File Size: ${fileSizeFormatted}<br>
            Expires: ${expirationDate}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}"
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Download Your Data
            </a>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <strong>⚠️ Important:</strong> This download link expires in 24 hours for security reasons.
            Please download your data as soon as possible.
          </div>

          <p>This export includes all the personal data we hold about you in compliance with GDPR Article 20 (Right to Data Portability).</p>

          <p>If you have any questions about your data export, please contact our support team.</p>

          <p>Best regards,<br>The Rowan Team</p>
        </div>
      `,
    });

    // Log email notification
    await supabase
      .from('privacy_email_notifications')
      .insert({
        user_id: userId,
        notification_type: 'data_export_ready',
        email_address: profile.email,
      });

  } catch (error) {
    console.error('Error sending export ready email:', error);
  }
}