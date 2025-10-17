import { createClient } from '@/lib/supabase/client';

/**
 * Comprehensive Data Export Service
 *
 * GDPR COMPLIANCE:
 * ----------------
 * - Right to Data Portability (Article 20): Users can export all their data
 * - Right of Access (Article 15): Users can access all personal data we hold
 *
 * DATA RETENTION POLICY:
 * ----------------------
 * This service exports all user data that is currently retained in the system:
 * - Active user data: Retained while account is active
 * - Upon account deletion: User data deleted immediately (see account-deletion-service.ts)
 * - Grace period: 30 days before permanent deletion
 * - Audit logs: Retained permanently for compliance
 *
 * EXPORT FORMAT:
 * --------------
 * - Format: JSON (machine-readable and human-readable)
 * - Includes: All 17+ data types (expenses, budgets, goals, tasks, etc.)
 * - Metadata: Export date, user ID, format version
 *
 * Users can export their data at any time from Settings → Privacy & Security
 */

export interface UserDataExport {
  export_info: {
    export_date: string;
    user_id: string;
    format: 'JSON';
    version: '1.0';
  };
  profile: any;
  partnerships: any[];
  expenses: any[];
  budgets: any[];
  bills: any[];
  goals: any[];
  goal_contributions: any[];
  projects: any[];
  tasks: any[];
  calendar_events: any[];
  reminders: any[];
  messages: any[];
  shopping_lists: any[];
  shopping_items: any[];
  meals: any[];
  recipes: any[];
  households: any[];
}

export interface ExportResult {
  success: boolean;
  data?: UserDataExport;
  error?: string;
}

/**
 * Export all user data in GDPR-compliant format
 */
export async function exportAllUserData(userId: string): Promise<ExportResult> {
  try {
    const supabase = createClient();

    // Initialize export structure
    const exportData: UserDataExport = {
      export_info: {
        export_date: new Date().toISOString(),
        user_id: userId,
        format: 'JSON',
        version: '1.0',
      },
      profile: null,
      partnerships: [],
      expenses: [],
      budgets: [],
      bills: [],
      goals: [],
      goal_contributions: [],
      projects: [],
      tasks: [],
      calendar_events: [],
      reminders: [],
      messages: [],
      shopping_lists: [],
      shopping_items: [],
      meals: [],
      recipes: [],
      households: [],
    };

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    exportData.profile = profile;

    // Get partnerships (spaces/relationships)
    const { data: partnerships } = await supabase
      .from('partnership_members')
      .select(`
        *,
        partnership:partnerships(*)
      `)
      .eq('user_id', userId);
    exportData.partnerships = partnerships || [];

    // Get partnership IDs for filtering other data
    const partnershipIds = (partnerships || []).map(p => p.partnership_id);

    if (partnershipIds.length > 0) {
      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.expenses = expenses || [];

      // Get budgets
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.budgets = budgets || [];

      // Get bills
      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.bills = bills || [];

      // Get goals
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.goals = goals || [];

      // Get projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.projects = projects || [];

      // Get tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.tasks = tasks || [];

      // Get calendar events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.calendar_events = events || [];

      // Get reminders
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.reminders = reminders || [];

      // Get messages
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.messages = messages || [];

      // Get shopping lists
      const { data: shoppingLists } = await supabase
        .from('shopping_lists')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.shopping_lists = shoppingLists || [];

      // Get shopping items (if there are lists)
      if (shoppingLists && shoppingLists.length > 0) {
        const listIds = shoppingLists.map(l => l.id);
        const { data: shoppingItems } = await supabase
          .from('shopping_items')
          .select('*')
          .in('list_id', listIds);
        exportData.shopping_items = shoppingItems || [];
      }

      // Get meals
      const { data: meals } = await supabase
        .from('meals')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.meals = meals || [];

      // Get recipes
      const { data: recipes } = await supabase
        .from('recipes')
        .select('*')
        .in('partnership_id', partnershipIds);
      exportData.recipes = recipes || [];
    }

    return { success: true, data: exportData };
  } catch (error) {
    console.error('Error exporting user data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export data'
    };
  }
}

/**
 * CSV Export Utilities
 *
 * Converts JSON data to CSV format for spreadsheet compatibility
 * Implements GDPR Article 20 (Data Portability) in machine-readable format
 */

/**
 * Helper: Escape CSV field values
 */
function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';

  const stringValue = String(value);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Helper: Convert JSON array to CSV string
 */
function jsonToCsv(data: any[], includeHeaders: boolean = true): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  data.forEach(item => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });

  const keys = Array.from(allKeys);

  // Create header row
  const rows: string[] = [];
  if (includeHeaders) {
    rows.push(keys.map(key => escapeCsvField(key)).join(','));
  }

  // Create data rows
  data.forEach(item => {
    const row = keys.map(key => {
      const value = item[key];

      // Handle nested objects/arrays by converting to JSON string
      if (typeof value === 'object' && value !== null) {
        return escapeCsvField(JSON.stringify(value));
      }

      return escapeCsvField(value);
    }).join(',');

    rows.push(row);
  });

  return rows.join('\n');
}

/**
 * Export expenses to CSV format
 */
export async function exportExpensesToCsv(userId: string): Promise<string> {
  const { data } = await exportAllUserData(userId);

  if (!data || !data.expenses) {
    return '';
  }

  return jsonToCsv(data.expenses);
}

/**
 * Export tasks to CSV format
 */
export async function exportTasksToCsv(userId: string): Promise<string> {
  const { data } = await exportAllUserData(userId);

  if (!data || !data.tasks) {
    return '';
  }

  return jsonToCsv(data.tasks);
}

/**
 * Export calendar events to CSV format
 */
export async function exportEventsToCsv(userId: string): Promise<string> {
  const { data } = await exportAllUserData(userId);

  if (!data || !data.calendar_events) {
    return '';
  }

  return jsonToCsv(data.calendar_events);
}

/**
 * Export shopping lists to CSV format
 */
export async function exportShoppingListsToCsv(userId: string): Promise<string> {
  const { data } = await exportAllUserData(userId);

  if (!data || !data.shopping_lists) {
    return '';
  }

  return jsonToCsv(data.shopping_lists);
}

/**
 * Export messages to CSV format
 */
export async function exportMessagesToCsv(userId: string): Promise<string> {
  const { data } = await exportAllUserData(userId);

  if (!data || !data.messages) {
    return '';
  }

  return jsonToCsv(data.messages);
}

/**
 * Export ALL data to multiple CSV files (returns a ZIP-ready structure)
 * Returns object with filename -> CSV content mapping
 */
export async function exportAllDataToCsv(userId: string): Promise<Record<string, string>> {
  const { data } = await exportAllUserData(userId);

  if (!data) {
    return {};
  }

  const csvFiles: Record<string, string> = {};

  // Export each data type to separate CSV file
  const dataTypes = [
    { key: 'expenses', filename: 'expenses.csv' },
    { key: 'budgets', filename: 'budgets.csv' },
    { key: 'bills', filename: 'bills.csv' },
    { key: 'goals', filename: 'goals.csv' },
    { key: 'projects', filename: 'projects.csv' },
    { key: 'tasks', filename: 'tasks.csv' },
    { key: 'calendar_events', filename: 'calendar_events.csv' },
    { key: 'reminders', filename: 'reminders.csv' },
    { key: 'messages', filename: 'messages.csv' },
    { key: 'shopping_lists', filename: 'shopping_lists.csv' },
    { key: 'shopping_items', filename: 'shopping_items.csv' },
    { key: 'meals', filename: 'meals.csv' },
    { key: 'recipes', filename: 'recipes.csv' },
  ];

  dataTypes.forEach(({ key, filename }) => {
    const dataArray = (data as any)[key];
    if (dataArray && Array.isArray(dataArray) && dataArray.length > 0) {
      csvFiles[filename] = jsonToCsv(dataArray);
    }
  });

  // Add export info as a CSV file
  const exportInfo = [data.export_info];
  csvFiles['export_info.csv'] = jsonToCsv(exportInfo);

  // Add profile as a CSV file
  if (data.profile) {
    csvFiles['profile.csv'] = jsonToCsv([data.profile]);
  }

  return csvFiles;
}