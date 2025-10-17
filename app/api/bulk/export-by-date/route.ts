import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { bulkExportByDateRange } from '@/lib/services/bulk-operations-service';

/**
 * Bulk Export by Date Range API Endpoint
 *
 * GDPR COMPLIANCE:
 * - Article 20: Right to Data Portability
 * - Article 15: Right of Access
 * - Allows users to export data for specific date ranges
 */

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') as 'expenses' | 'tasks' | 'calendar_events' | 'messages' | 'reminders';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const format = searchParams.get('format') || 'json'; // json or csv

    if (!dataType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Data type, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Export data
    const result = await bulkExportByDateRange(user.id, dataType, startDate, endDate);

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || 'Export failed' }, { status: 500 });
    }

    if (format === 'csv') {
      // Convert to CSV
      if (result.data.length === 0) {
        return NextResponse.json({ error: 'No data found for the specified date range' }, { status: 404 });
      }

      const headers = Object.keys(result.data[0]);
      const csvRows = [
        headers.join(','),
        ...result.data.map(row =>
          headers.map(header => {
            const value = (row as any)[header];
            // Escape values that contain commas, quotes, or newlines
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${dataType}-${startDate}-to-${endDate}.csv"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.count,
      date_range: {
        start: startDate,
        end: endDate,
      },
      export_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Bulk export by date error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
