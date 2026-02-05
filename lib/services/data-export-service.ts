import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

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

type ExportRecord = Record<string, unknown>;

export interface UserDataExport {
  export_info: {
    export_date: string;
    user_id: string;
    format: 'JSON';
    version: '1.0';
  };
  profile: ExportRecord | null;
  partnerships: ExportRecord[];
  expenses: ExportRecord[];
  budgets: ExportRecord[];
  bills: ExportRecord[];
  goals: ExportRecord[];
  goal_contributions: ExportRecord[];
  projects: ExportRecord[];
  tasks: ExportRecord[];
  calendar_events: ExportRecord[];
  reminders: ExportRecord[];
  messages: ExportRecord[];
  shopping_lists: ExportRecord[];
  shopping_items: ExportRecord[];
  meals: ExportRecord[];
  recipes: ExportRecord[];
  households: ExportRecord[];
}

export interface ExportResult {
  success: boolean;
  data?: UserDataExport;
  error?: string;
}

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

/**
 * Exports all user data in GDPR-compliant JSON format.
 *
 * Retrieves data from all user-related tables including profile, partnerships,
 * expenses, budgets, goals, tasks, events, messages, shopping lists, meals, and recipes.
 * Implements GDPR Article 20 (Right to Data Portability) and Article 15 (Right of Access).
 *
 * @param userId - The unique identifier of the user whose data to export
 * @param supabaseClient - Optional Supabase client instance (uses default client if not provided)
 * @returns Result object containing the exported data or an error message
 */
export async function exportAllUserData(userId: string, supabaseClient?: SupabaseClient): Promise<ExportResult> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

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
    const partnershipIds = (partnerships || []).map((p: { partnership_id: string }) => p.partnership_id);

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
        const listIds = shoppingLists.map((l: { id: string }) => l.id);
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
    logger.error('Error exporting user data:', error, { component: 'lib-data-export-service', action: 'service_call' });
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
 * Escapes a value for safe inclusion in a CSV field.
 *
 * Handles special characters (commas, quotes, newlines) by wrapping in quotes
 * and escaping internal quotes.
 *
 * @param value - The value to escape
 * @returns The escaped string safe for CSV inclusion
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';

  const stringValue = String(value);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Converts an array of JSON objects to CSV format.
 *
 * Automatically detects all unique keys across objects for column headers.
 * Nested objects and arrays are serialized to JSON strings.
 *
 * @param data - Array of objects to convert
 * @param includeHeaders - Whether to include a header row (default: true)
 * @returns CSV-formatted string
 */
function jsonToCsv(data: ExportRecord[], includeHeaders: boolean = true): string {
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
      const value = item[key as keyof ExportRecord];

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
 * Exports user expenses to CSV format.
 *
 * @param userId - The unique identifier of the user
 * @param supabaseClient - Optional Supabase client instance
 * @returns CSV-formatted string of expenses, or empty string if no data
 */
export async function exportExpensesToCsv(userId: string, supabaseClient?: SupabaseClient): Promise<string> {
  const { data } = await exportAllUserData(userId, supabaseClient);

  if (!data || !data.expenses) {
    return '';
  }

  return jsonToCsv(data.expenses);
}

/**
 * Exports user tasks to CSV format.
 *
 * @param userId - The unique identifier of the user
 * @param supabaseClient - Optional Supabase client instance
 * @returns CSV-formatted string of tasks, or empty string if no data
 */
export async function exportTasksToCsv(userId: string, supabaseClient?: SupabaseClient): Promise<string> {
  const { data } = await exportAllUserData(userId, supabaseClient);

  if (!data || !data.tasks) {
    return '';
  }

  return jsonToCsv(data.tasks);
}

/**
 * Exports user calendar events to CSV format.
 *
 * @param userId - The unique identifier of the user
 * @param supabaseClient - Optional Supabase client instance
 * @returns CSV-formatted string of events, or empty string if no data
 */
export async function exportEventsToCsv(userId: string, supabaseClient?: SupabaseClient): Promise<string> {
  const { data } = await exportAllUserData(userId, supabaseClient);

  if (!data || !data.calendar_events) {
    return '';
  }

  return jsonToCsv(data.calendar_events);
}

/**
 * Exports user shopping lists to CSV format.
 *
 * @param userId - The unique identifier of the user
 * @param supabaseClient - Optional Supabase client instance
 * @returns CSV-formatted string of shopping lists, or empty string if no data
 */
export async function exportShoppingListsToCsv(userId: string, supabaseClient?: SupabaseClient): Promise<string> {
  const { data } = await exportAllUserData(userId, supabaseClient);

  if (!data || !data.shopping_lists) {
    return '';
  }

  return jsonToCsv(data.shopping_lists);
}

/**
 * Exports user messages to CSV format.
 *
 * @param userId - The unique identifier of the user
 * @param supabaseClient - Optional Supabase client instance
 * @returns CSV-formatted string of messages, or empty string if no data
 */
export async function exportMessagesToCsv(userId: string, supabaseClient?: SupabaseClient): Promise<string> {
  const { data } = await exportAllUserData(userId, supabaseClient);

  if (!data || !data.messages) {
    return '';
  }

  return jsonToCsv(data.messages);
}

/**
 * Exports all user data to multiple CSV files.
 *
 * Returns a filename-to-content mapping suitable for creating a ZIP archive.
 * Each data type is exported to a separate CSV file for easy spreadsheet import.
 *
 * @param userId - The unique identifier of the user
 * @param supabaseClient - Optional Supabase client instance
 * @returns Object mapping filenames to CSV content strings
 */
export async function exportAllDataToCsv(userId: string, supabaseClient?: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await exportAllUserData(userId, supabaseClient);

  if (!data) {
    return {};
  }

  const csvFiles: Record<string, string> = {};

  // Export each data type to separate CSV file
  type ExportArrayKey = keyof Omit<UserDataExport, 'export_info' | 'profile'>;
  const dataTypes: Array<{ key: ExportArrayKey; filename: string }> = [
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
    const dataArray = data[key];
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

/**
 * PDF EXPORT FUNCTIONALITY
 * ========================
 * Generate formatted PDF documents with tables for better readability
 */

/**
 * Generate a PDF document with formatted tables for user data
 * This uses jsPDF in a browser-compatible way (client-side only)
 */
export interface PdfExportOptions {
  dataType?: 'all' | 'expenses' | 'tasks' | 'calendar_events' | 'messages' | 'shopping' | 'goals';
  includeSummary?: boolean;
}

/**
 * Extracts a specific subset of data from a full export based on data type.
 *
 * Used by PDF export to generate focused reports for specific data categories.
 *
 * @param data - The full user data export object
 * @param dataType - The type of data to extract (e.g., 'expenses', 'tasks', 'goals')
 * @returns Object containing the display title and filtered data array
 */
export function getDataSubset(data: UserDataExport, dataType: string): { title: string; data: ExportRecord[] } {
  const dataMap: Record<string, { title: string; key: keyof UserDataExport }> = {
    'expenses': { title: 'Expenses', key: 'expenses' },
    'tasks': { title: 'Tasks & Chores', key: 'tasks' },
    'calendar_events': { title: 'Calendar Events', key: 'calendar_events' },
    'events': { title: 'Calendar Events', key: 'calendar_events' },
    'messages': { title: 'Messages', key: 'messages' },
    'shopping': { title: 'Shopping Lists & Items', key: 'shopping_lists' },
    'shopping_lists': { title: 'Shopping Lists', key: 'shopping_lists' },
    'goals': { title: 'Goals', key: 'goals' },
  };

  const mapping = dataMap[dataType];
  if (!mapping) {
    return { title: 'Unknown Data Type', data: [] };
  }

  const subsetData = data[mapping.key];
  return {
    title: mapping.title,
    data: (Array.isArray(subsetData) ? subsetData : []) as ExportRecord[]
  };
}
