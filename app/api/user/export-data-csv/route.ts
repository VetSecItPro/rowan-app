import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  exportAllDataToCsv,
  exportExpensesToCsv,
  exportTasksToCsv,
  exportEventsToCsv,
  exportShoppingListsToCsv,
  exportMessagesToCsv,
} from '@/lib/services/data-export-service';
import { checkExpensiveOperationRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

export const dynamic = 'force-dynamic';

/**
 * CSV Data Export API
 *
 * GDPR COMPLIANCE:
 * - Article 20: Right to Data Portability (machine-readable format)
 * - Article 15: Right of Access
 *
 * Supports exporting specific data types or all data in CSV format
 * CSV format is compatible with Excel, Google Sheets, and other spreadsheet software
 */

/** Exports user data in CSV format for GDPR data portability */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Expensive operation rate limit — FIX-007
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkExpensiveOperationRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get export type from query parameters
    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get('type') || 'all'; // all, expenses, tasks, events, shopping, messages

    let csvContent: string;
    let filename: string;

    switch (exportType) {
      case 'expenses':
        csvContent = await exportExpensesToCsv(user.id, supabase);
        filename = `rowan-expenses-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'tasks':
        csvContent = await exportTasksToCsv(user.id, supabase);
        filename = `rowan-tasks-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'events':
        csvContent = await exportEventsToCsv(user.id, supabase);
        filename = `rowan-calendar-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'shopping':
        csvContent = await exportShoppingListsToCsv(user.id, supabase);
        filename = `rowan-shopping-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'messages':
        csvContent = await exportMessagesToCsv(user.id, supabase);
        filename = `rowan-messages-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'all':
      default: {
        // Bundle every CSV into a single ZIP — closes GDPR Article 20 (Data
        // Portability) for users who want a complete export in one download.
        const allCsvs = await exportAllDataToCsv(user.id, supabase);
        const fileNames = Object.keys(allCsvs);

        if (fileNames.length === 0) {
          return NextResponse.json(
            { error: 'No data available to export' },
            { status: 404 }
          );
        }

        const datestamp = new Date().toISOString().split('T')[0];
        const zip = new JSZip();
        for (const key of fileNames) {
          // exportAllDataToCsv returns a map of logical-name → csv string.
          // File each one with a stable, descriptive filename inside the zip.
          zip.file(`rowan-${key}-${datestamp}.csv`, allCsvs[key]);
        }
        // README so a non-technical user opening the ZIP knows what's in it.
        zip.file(
          'README.txt',
          [
            `Rowan personal data export — ${datestamp}`,
            '',
            'This archive contains all data Rowan stores about your account, exported as',
            'CSV files for spreadsheet compatibility.',
            '',
            'Files included:',
            ...fileNames.map((k) => `  - rowan-${k}-${datestamp}.csv`),
            '',
            'Provided per GDPR Article 20 (Right to Data Portability) and Article 15',
            '(Right of Access). For questions: support@rowanapp.com',
          ].join('\n')
        );

        const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
        const zipFilename = `rowan-data-export-${datestamp}.zip`;

        return new NextResponse(zipBuffer as ArrayBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${zipFilename}"`,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        });
      }
    }

    // Return CSV file as downloadable attachment
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('[API] Error exporting CSV data:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
