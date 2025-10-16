import { createClient } from '@/lib/supabase/client';
import type { Expense } from './expense-service';
import type { Project } from './project-tracking-service';

// =====================================================
// CSV EXPORT SERVICE
// =====================================================

/**
 * Convert expenses to CSV format
 */
export function expensesToCSV(expenses: Expense[]): string {
  // CSV Headers
  const headers = [
    'Date',
    'Description',
    'Category',
    'Amount',
    'Payment Method',
    'Paid By',
    'Split Type',
    'Recurring',
    'Notes',
  ];

  // Convert expenses to CSV rows
  const rows = expenses.map((expense) => [
    expense.date,
    `"${expense.description.replace(/"/g, '""')}"`, // Escape quotes
    expense.category || '',
    expense.amount.toFixed(2),
    expense.payment_method || '',
    expense.paid_by || '',
    expense.split_type || '',
    expense.is_recurring ? 'Yes' : 'No',
    expense.notes ? `"${expense.notes.replace(/"/g, '""')}"` : '',
  ]);

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export expenses for a date range
 */
export async function exportExpenses(
  spaceId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const supabase = createClient();

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('space_id', spaceId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;

  const csvContent = expensesToCSV(expenses || []);
  const filename = `expenses_${startDate}_to_${endDate}.csv`;

  downloadCSV(csvContent, filename);
}

/**
 * Export all expenses for a year (for tax purposes)
 */
export async function exportYearlyExpenses(spaceId: string, year: number): Promise<void> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  await exportExpenses(spaceId, startDate, endDate);
}

/**
 * Export monthly expenses
 */
export async function exportMonthlyExpenses(
  spaceId: string,
  year: number,
  month: number
): Promise<void> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  await exportExpenses(spaceId, startDate, endDate);
}

// =====================================================
// PROJECT COST EXPORT
// =====================================================

/**
 * Convert project data to CSV format for insurance/contractors
 */
export function projectToCSV(project: Project, expenses: Expense[]): string {
  // Project Summary
  const summary = [
    ['Project Name', project.name],
    ['Status', project.status],
    ['Priority', project.priority],
    ['Location', project.location || 'N/A'],
    ['Start Date', project.start_date || 'N/A'],
    ['Estimated Completion', project.estimated_completion_date || 'N/A'],
    ['Actual Completion', project.actual_completion_date || 'N/A'],
    ['', ''],
    ['Budget Summary', ''],
    ['Estimated Budget', `$${project.estimated_budget?.toLocaleString() || '0'}`],
    ['Actual Cost', `$${project.actual_cost.toLocaleString()}`],
    ['Variance', `$${project.budget_variance.toLocaleString()}`],
    ['Variance %', `${project.variance_percentage}%`],
    ['', ''],
    ['Detailed Expenses', ''],
  ];

  // Expense Headers
  const expenseHeaders = ['Date', 'Description', 'Category', 'Amount', 'Payment Method', 'Notes'];

  // Expense Rows
  const expenseRows = expenses.map((expense) => [
    expense.date,
    `"${expense.description.replace(/"/g, '""')}"`,
    expense.category || '',
    `$${expense.amount.toFixed(2)}`,
    expense.payment_method || '',
    expense.notes ? `"${expense.notes.replace(/"/g, '""')}"` : '',
  ]);

  // Combine all sections
  const csvContent = [
    ...summary.map((row) => row.join(',')),
    expenseHeaders.join(','),
    ...expenseRows.map((row) => row.join(',')),
    '',
    ['Total Expenses', '', '', `$${project.actual_cost.toFixed(2)}`, '', ''],
  ].join('\n');

  return csvContent;
}

/**
 * Export project cost report
 */
export async function exportProjectCosts(projectId: string): Promise<void> {
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

  const csvContent = projectToCSV(project, expenses || []);
  const filename = `project_${project.name.replace(/[^a-z0-9]/gi, '_')}_costs.csv`;

  downloadCSV(csvContent, filename);
}

// =====================================================
// CATEGORY BREAKDOWN EXPORT
// =====================================================

/**
 * Export expenses grouped by category
 */
export async function exportCategoryBreakdown(
  spaceId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const supabase = createClient();

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('space_id', spaceId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('category', { ascending: true });

  if (error) throw error;

  // Group by category
  const grouped = (expenses || []).reduce((acc, expense) => {
    const category = expense.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  // Build CSV with category sections
  const csvRows: string[] = ['Category,Date,Description,Amount,Payment Method'];

  Object.keys(grouped)
    .sort()
    .forEach((category) => {
      const categoryExpenses = grouped[category];
      const categoryTotal = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      csvRows.push(''); // Empty row
      csvRows.push(`${category} (Total: $${categoryTotal.toFixed(2)})`);

      categoryExpenses.forEach((expense) => {
        csvRows.push(
          [
            '',
            expense.date,
            `"${expense.description.replace(/"/g, '""')}"`,
            expense.amount.toFixed(2),
            expense.payment_method || '',
          ].join(',')
        );
      });
    });

  const csvContent = csvRows.join('\n');
  const filename = `category_breakdown_${startDate}_to_${endDate}.csv`;

  downloadCSV(csvContent, filename);
}

// Export service object
export const exportService = {
  exportExpenses,
  exportYearlyExpenses,
  exportMonthlyExpenses,
  exportProjectCosts,
  exportCategoryBreakdown,
  expensesToCSV,
  projectToCSV,
  downloadCSV,
};
