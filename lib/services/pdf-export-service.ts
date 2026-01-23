import { createClient } from '@/lib/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { Expense } from './expense-service';

// ==================== TYPES ====================

interface PDFOptions {
  title: string;
  orientation?: 'portrait' | 'landscape';
  includeCharts?: boolean;
}

// ==================== PDF GENERATION ====================

/**
 * Generates a printable HTML template for PDF export
 */
function generatePrintableHTML(content: string, options: PDFOptions): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${options.title}</title>
  <style>
    @page {
      size: ${options.orientation || 'portrait'};
      margin: 20mm;
    }

    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #333;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm;
    }

    h1 {
      font-size: 24pt;
      font-weight: bold;
      margin: 0 0 5mm 0;
      color: #1a1a1a;
      border-bottom: 2pt solid #4f46e5;
      padding-bottom: 3mm;
    }

    h2 {
      font-size: 16pt;
      font-weight: bold;
      margin: 8mm 0 3mm 0;
      color: #4f46e5;
    }

    h3 {
      font-size: 12pt;
      font-weight: 600;
      margin: 5mm 0 2mm 0;
      color: #1a1a1a;
    }

    .header {
      margin-bottom: 10mm;
    }

    .meta-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5mm;
      padding: 3mm;
      background: #f3f4f6;
      border-radius: 2mm;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }

    .meta-value {
      font-size: 11pt;
      font-weight: 600;
      color: #1a1a1a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 3mm 0 5mm 0;
      font-size: 10pt;
    }

    thead {
      background: #4f46e5;
      color: white;
    }

    thead th {
      padding: 3mm;
      text-align: left;
      font-weight: 600;
      border-bottom: 2pt solid #3730a3;
    }

    tbody tr {
      border-bottom: 1pt solid #e5e7eb;
    }

    tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    tbody td {
      padding: 2mm 3mm;
    }

    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
    }

    .amount {
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }

    .total-row {
      font-weight: bold;
      background: #e0e7ff !important;
      border-top: 2pt solid #4f46e5;
    }

    .summary-box {
      background: #f3f4f6;
      padding: 5mm;
      border-radius: 2mm;
      margin: 5mm 0;
      border-left: 3pt solid #4f46e5;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5mm;
      margin-top: 3mm;
    }

    .summary-item {
      text-align: center;
    }

    .summary-label {
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
    }

    .summary-value {
      font-size: 18pt;
      font-weight: bold;
      color: #4f46e5;
    }

    .footer {
      margin-top: 10mm;
      padding-top: 5mm;
      border-top: 1pt solid #e5e7eb;
      font-size: 9pt;
      color: #666;
      text-align: center;
    }

    .category-section {
      margin: 5mm 0;
    }

    .category-header {
      background: #e0e7ff;
      padding: 2mm 3mm;
      font-weight: 600;
      border-left: 3pt solid #4f46e5;
    }
  </style>
</head>
<body>
  ${content}
  <div class="footer">
    <p>Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
    <p>Rowan Family Finance Manager</p>
  </div>
</body>
</html>
  `;
}

/**
 * Opens a print dialog for PDF export
 */
function printToPDF(html: string) {
  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  // Write content to iframe
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for content to load, then print
  setTimeout(() => {
    iframe.contentWindow?.print();
    // Clean up after print dialog closes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 500);
}

// ==================== MONTHLY EXPENSE SUMMARY ====================

/**
 * Exports monthly expense summary as PDF
 */
export async function exportMonthlyExpenseSummary(
  spaceId: string,
  year: number,
  month: number
): Promise<void> {
  const supabase = createClient();

  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));

  // Get expenses
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('space_id', spaceId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'))
    .order('date', { ascending: false });

  if (error) throw error;

  // Calculate totals by category
  const categoryTotals: Record<string, { total: number; count: number; expenses: Expense[] }> = {};
  let grandTotal = 0;

  expenses?.forEach((expense: Expense) => {
    const category = expense.category || 'Uncategorized';
    if (!categoryTotals[category]) {
      categoryTotals[category] = { total: 0, count: 0, expenses: [] };
    }
    categoryTotals[category].total += parseFloat(expense.amount.toString());
    categoryTotals[category].count += 1;
    categoryTotals[category].expenses.push(expense);
    grandTotal += parseFloat(expense.amount.toString());
  });

  // Generate HTML content
  const content = `
    <div class="header">
      <h1>Monthly Expense Summary</h1>
      <div class="meta-info">
        <div class="meta-item">
          <span class="meta-label">Period</span>
          <span class="meta-value">${format(startDate, 'MMMM yyyy')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Total Transactions</span>
          <span class="meta-value">${expenses?.length || 0}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Total Amount</span>
          <span class="meta-value">$${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>

    <div class="summary-box">
      <h3>Category Summary</h3>
      <div class="summary-grid">
        ${Object.entries(categoryTotals)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 3)
          .map(
            ([category, data]) => `
          <div class="summary-item">
            <div class="summary-label">${category}</div>
            <div class="summary-value">$${data.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>

    <h2>Expenses by Category</h2>

    ${Object.entries(categoryTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .map(
        ([category, data]) => `
      <div class="category-section">
        <div class="category-header">
          ${category} - $${data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${data.count} transactions)
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Payment Method</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.expenses
              .map(
                (expense) => `
              <tr>
                <td>${expense.date ? format(new Date(expense.date), 'MMM dd') : '-'}</td>
                <td>${expense.description || expense.title}</td>
                <td>${expense.payment_method || '-'}</td>
                <td class="text-right amount">$${parseFloat(expense.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
      )
      .join('')}

    <table>
      <tbody>
        <tr class="total-row">
          <td colspan="3" class="text-right"><strong>GRAND TOTAL</strong></td>
          <td class="text-right amount">$${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
  `;

  const html = generatePrintableHTML(content, {
    title: `Expense Summary - ${format(startDate, 'MMMM yyyy')}`,
    orientation: 'portrait',
  });

  printToPDF(html);
}

// ==================== PROJECT COST REPORT ====================

/**
 * Exports project cost report as PDF
 */
export async function exportProjectCostReport(projectId: string): Promise<void> {
  const supabase = createClient();

  // Get project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  // Get project expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (expensesError) throw expensesError;

  // Calculate totals by category
  const categoryTotals: Record<string, number> = {};
  expenses?.forEach((expense: Expense) => {
    const category = expense.category || 'Uncategorized';
    categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(expense.amount.toString());
  });

  const content = `
    <div class="header">
      <h1>Project Cost Report</h1>
      <div class="meta-info">
        <div class="meta-item">
          <span class="meta-label">Project Name</span>
          <span class="meta-value">${project.name}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Status</span>
          <span class="meta-value">${project.status}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Priority</span>
          <span class="meta-value">${project.priority}</span>
        </div>
      </div>
    </div>

    ${
      project.description
        ? `
      <div class="summary-box">
        <h3>Description</h3>
        <p>${project.description}</p>
      </div>
    `
        : ''
    }

    <div class="summary-box">
      <h3>Budget Summary</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Estimated Budget</div>
          <div class="summary-value">$${(project.estimated_budget || 0).toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Actual Cost</div>
          <div class="summary-value">$${project.actual_cost.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Variance</div>
          <div class="summary-value" style="color: ${project.budget_variance < 0 ? '#10b981' : '#ef4444'}">
            ${project.budget_variance < 0 ? '-' : '+'}$${Math.abs(project.budget_variance).toLocaleString()}
          </div>
        </div>
      </div>
    </div>

    <h2>Cost Breakdown by Category</h2>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th class="text-right">Amount</th>
          <th class="text-right">% of Total</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(categoryTotals)
          .sort((a, b) => b[1] - a[1])
          .map(
            ([category, total]) => `
          <tr>
            <td>${category}</td>
            <td class="text-right amount">$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">${((total / project.actual_cost) * 100).toFixed(1)}%</td>
          </tr>
        `
          )
          .join('')}
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="text-right amount">$${project.actual_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="text-right">100%</td>
        </tr>
      </tbody>
    </table>

    <div class="page-break"></div>

    <h2>Detailed Expense List</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Payment Method</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${
          expenses
            ?.map(
              (expense: Expense) => `
          <tr>
            <td>${expense.date ? format(new Date(expense.date), 'MMM dd, yyyy') : '-'}</td>
            <td>${expense.description || expense.title}</td>
            <td>${expense.category || '-'}</td>
            <td>${expense.payment_method || '-'}</td>
            <td class="text-right amount">$${parseFloat(expense.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `
            )
            .join('') || '<tr><td colspan="5" class="text-center">No expenses recorded</td></tr>'
        }
      </tbody>
    </table>
  `;

  const html = generatePrintableHTML(content, {
    title: `Project Cost Report - ${project.name}`,
    orientation: 'portrait',
  });

  printToPDF(html);
}

// Export service object
export const pdfExportService = {
  exportMonthlyExpenseSummary,
  exportProjectCostReport,
};
