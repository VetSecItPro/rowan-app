import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportAllUserData, getDataSubset } from '@/lib/services/data-export-service';
import type { UserDataExport } from '@/lib/services/data-export-service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { checkExpensiveOperationRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * PDF Export API Endpoint
 *
 * GDPR COMPLIANCE:
 * - Article 20: Right to Data Portability
 * - Article 15: Right of Access
 *
 * Exports user data in formatted PDF with tables
 */

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'all';

    // Export all user data
    const exportResult = await exportAllUserData(user.id, supabase);

    if (!exportResult.success || !exportResult.data) {
      return NextResponse.json({ error: exportResult.error || 'Export failed' }, { status: 500 });
    }

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add header
    doc.setFontSize(20);
    doc.text('Rowan Data Export', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 105, 25, { align: 'center' });
    doc.text(`User: ${user.email}`, 105, 30, { align: 'center' });

    // Add GDPR notice
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      'This export is provided in compliance with GDPR Article 15 (Right of Access) and Article 20 (Right to Data Portability).',
      105,
      40,
      { align: 'center', maxWidth: 180 }
    );
    doc.setTextColor(0);

    let yPosition = 50;

    // Determine what data to include
    const dataTypes: Array<{ key: keyof UserDataExport; title: string }> = [];

    if (dataType === 'all') {
      dataTypes.push(
        { key: 'expenses', title: 'Expenses' },
        { key: 'budgets', title: 'Budgets' },
        { key: 'bills', title: 'Bills' },
        { key: 'goals', title: 'Goals' },
        { key: 'projects', title: 'Projects' },
        { key: 'tasks', title: 'Tasks & Chores' },
        { key: 'calendar_events', title: 'Calendar Events' },
        { key: 'reminders', title: 'Reminders' },
        { key: 'messages', title: 'Messages' },
        { key: 'shopping_lists', title: 'Shopping Lists' },
        { key: 'shopping_items', title: 'Shopping Items' },
        { key: 'meals', title: 'Meals' },
        { key: 'recipes', title: 'Recipes' }
      );
    } else {
      // Get specific data type
      const subset = getDataSubset(exportResult.data, dataType);
      if (subset.data.length > 0) {
        dataTypes.push({ key: dataType as keyof UserDataExport, title: subset.title });
      }
    }

    // Generate tables for each data type
    for (const type of dataTypes) {
      const data = exportResult.data[type.key] as Record<string, unknown>[];

      if (!data || !Array.isArray(data) || data.length === 0) {
        continue;
      }

      // Add section title
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(type.title, 14, yPosition);
      yPosition += 5;

      // Prepare table data
      const headers = Object.keys(data[0]).filter(
        key => !['id', 'user_id', 'partnership_id'].includes(key)
      );

      const tableData = data.map(item => {
        return headers.map(header => {
          const value = item[header];

          // Format dates
          if (header.includes('date') || header.includes('_at')) {
            if (typeof value === 'string' || typeof value === 'number') {
              return new Date(value).toLocaleDateString();
            }
            return '';
          }

          // Format booleans
          if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
          }

          // Format objects
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
          }

          return value?.toString() || '';
        });
      });

      // Add table
      autoTable(doc, {
        head: [headers.map(h => h.replace(/_/g, ' ').toUpperCase())],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [79, 70, 229], // Indigo color
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 10, left: 14, right: 14 },
      });

      // @ts-expect-error - autoTable modifies the doc object
      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Add footer with metadata
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
      doc.text(
        'Generated by Rowan - Your Partnership Management Platform',
        105,
        285,
        { align: 'center' }
      );
    }

    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rowan-data-export-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    logger.error('PDF export error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to generate PDF export' },
      { status: 500 }
    );
  }
}
