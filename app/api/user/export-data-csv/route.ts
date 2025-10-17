import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  exportAllDataToCsv,
  exportExpensesToCsv,
  exportTasksToCsv,
  exportEventsToCsv,
  exportShoppingListsToCsv,
  exportMessagesToCsv,
} from '@/lib/services/data-export-service';

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

export async function GET(request: Request) {
  try {
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
        csvContent = await exportExpensesToCsv(user.id);
        filename = `rowan-expenses-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'tasks':
        csvContent = await exportTasksToCsv(user.id);
        filename = `rowan-tasks-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'events':
        csvContent = await exportEventsToCsv(user.id);
        filename = `rowan-calendar-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'shopping':
        csvContent = await exportShoppingListsToCsv(user.id);
        filename = `rowan-shopping-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'messages':
        csvContent = await exportMessagesToCsv(user.id);
        filename = `rowan-messages-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'all':
      default:
        // For 'all', we'll export the first available CSV (expenses by default)
        // In a real implementation, you'd want to create a ZIP file with all CSVs
        const allCsvs = await exportAllDataToCsv(user.id);
        const firstCsvKey = Object.keys(allCsvs)[0];

        if (!firstCsvKey) {
          return NextResponse.json(
            { error: 'No data available to export' },
            { status: 404 }
          );
        }

        // For now, return a combined response or first file
        // TODO: Implement ZIP file creation for multiple CSV files
        csvContent = allCsvs[firstCsvKey];
        filename = `rowan-data-export-${new Date().toISOString().split('T')[0]}.csv`;

        // Return JSON with all CSV files for now
        return NextResponse.json({
          success: true,
          files: Object.keys(allCsvs),
          message: 'Use ?type= parameter to download specific data types (expenses, tasks, events, shopping, messages)',
          csvData: allCsvs,
        });
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
    console.error('[API] Error exporting CSV data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
