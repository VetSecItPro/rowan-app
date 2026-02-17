// Data Export Download API
// Secure download endpoint for user data exports with authentication and access control

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

// GET - Download export file
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const file = url.searchParams.get('file');
    const token = url.searchParams.get('token');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    let userId: string | null = null;

    // Determine authentication method
    if (token) {
      // Token-based access (from email links)
      userId = await validateDownloadToken(token);
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired download token' },
          { status: 401 }
        );
      }
    } else {
      // Session-based access
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Find the export request
    const { data: exportRequest, error: exportError } = await supabase
      .from('data_export_requests')
      .select('id, user_id, status, file_url, expires_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .like('file_url', `%${file.replace(/%/g, '\\%').replace(/_/g, '\\_')}`)
      .single();

    if (exportError || !exportRequest) {
      logger.error('Export request not found:', exportError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { success: false, error: 'Export file not found or access denied' },
        { status: 404 }
      );
    }

    // Check if export has expired
    const expiresAt = new Date(exportRequest.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Download link has expired' },
        { status: 410 } // Gone
      );
    }

    // Log the download
    await supabase
      .from('privacy_email_notifications')
      .insert({
        user_id: userId,
        notification_type: 'data_export_downloaded',
        email_address: file,
      });

    // In a real implementation, you would:
    // 1. Fetch the file from cloud storage (S3, GCS, etc.)
    // 2. Stream the file content to the response
    // 3. Set appropriate headers for download

    // For this mock implementation, we'll return a redirect to a generated file
    return generateMockFileResponse(exportRequest, file);
  } catch (error) {
    logger.error('Download export API error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validate download token
async function validateDownloadToken(token: string): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Look for token in notifications table
    const { data: tokenRecord, error } = await supabase
      .from('privacy_email_notifications')
      .select('user_id, created_at')
      .eq('email_address', token)
      .eq('notification_type', 'download_token')
      .single();

    if (error || !tokenRecord) {
      return null;
    }

    // Check if token is expired (24 hours)
    const tokenDate = new Date(tokenRecord.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return null;
    }

    return tokenRecord.user_id;
  } catch (error) {
    logger.error('Error validating download token:', error, { component: 'api-route', action: 'api_request' });
    return null;
  }
}

type DownloadExportData = {
  exportMetadata: {
    userId: string;
    exportDate: string;
    gdprCompliance: string;
  };
  profile?: Record<string, unknown> | null;
  privacyPreferences?: Record<string, unknown> | null;
  privacyHistory?: Array<Record<string, unknown>>;
};

type ExportRequestRecord = {
  user_id: string;
};

// Generate mock file response (in production this would fetch from storage)
async function generateMockFileResponse(exportRequest: ExportRequestRecord, fileName: string) {
  try {
    // Get user data to generate the file
    const userData = await gatherUserDataForDownload(exportRequest.user_id);

    let fileContent: string;
    let mimeType: string;
    let downloadFileName: string;

    // Determine format from file name
    if (fileName.endsWith('.json')) {
      fileContent = JSON.stringify({
        ...userData,
        _format: 'json',
        _version: '1.0',
        _generated: new Date().toISOString(),
        _gdpr_compliance: 'Article 20 - Right to Data Portability'
      }, null, 2);
      mimeType = 'application/json';
      downloadFileName = fileName;
    } else if (fileName.endsWith('.csv')) {
      fileContent = generateCSVContent(userData);
      mimeType = 'text/csv';
      downloadFileName = fileName;
    } else if (fileName.endsWith('.pdf')) {
      fileContent = generatePDFContent(userData);
      mimeType = 'application/pdf';
      downloadFileName = fileName;
    } else {
      throw new Error('Unsupported file format');
    }

    // Return file as download
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${downloadFileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    logger.error('Error generating file response:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { success: false, error: 'Failed to generate file' },
      { status: 500 }
    );
  }
}

// Simplified data gathering for download (reusing logic from generate-export)
async function gatherUserDataForDownload(userId: string): Promise<DownloadExportData> {
  const supabase = await createClient();

  // Get essential user data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: privacyPrefs } = await supabase
    .from('user_privacy_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: privacyHistory } = await supabase
    .from('privacy_preference_history')
    .select('*')
    .eq('user_id', userId)
    .order('changed_at', { ascending: false })
    .limit(50);

  return {
    exportMetadata: {
      userId,
      exportDate: new Date().toISOString(),
      gdprCompliance: 'Article 20 - Right to Data Portability',
    },
    profile: profile || null,
    privacyPreferences: privacyPrefs || null,
    privacyHistory: privacyHistory || [],
  };
}

// Generate CSV content
function generateCSVContent(userData: DownloadExportData): string {
  let csvContent = 'Rowan Data Export\n';
  csvContent += `Export Date: ${new Date().toISOString()}\n`;
  csvContent += `User ID: ${userData.exportMetadata.userId}\n`;
  csvContent += 'GDPR Article 20 - Right to Data Portability\n\n';

  if (userData.profile) {
    csvContent += 'PROFILE INFORMATION\n';
    csvContent += 'Field,Value\n';
    Object.entries(userData.profile).forEach(([key, value]) => {
      csvContent += `"${key}","${value || ''}"\n`;
    });
    csvContent += '\n';
  }

  if (userData.privacyPreferences) {
    csvContent += 'PRIVACY PREFERENCES\n';
    csvContent += 'Setting,Value\n';
    Object.entries(userData.privacyPreferences).forEach(([key, value]) => {
      csvContent += `"${key}","${value || ''}"\n`;
    });
    csvContent += '\n';
  }

  return csvContent;
}

// Generate PDF content (simplified text format)
function generatePDFContent(userData: DownloadExportData): string {
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

  pdfContent += 'END OF EXPORT\n';
  return pdfContent;
}
