import { createClient } from '@/lib/supabase/client';

/**
 * Bulk Operations Service
 *
 * GDPR COMPLIANCE:
 * ----------------
 * - Right to Erasure (Article 17): Bulk deletion of user data
 * - Right to Data Portability (Article 20): Bulk export with date ranges
 * - Data Minimization (Article 5): Archive old data to reduce active storage
 *
 * PURPOSE:
 * --------
 * Provides efficient bulk operations for managing large amounts of user data
 */

export interface BulkDeleteResult {
  success: boolean;
  deleted_count?: number;
  error?: string;
}

export interface BulkExportResult {
  success: boolean;
  data?: any[];
  count?: number;
  error?: string;
}

export interface BulkArchiveResult {
  success: boolean;
  archived_count?: number;
  error?: string;
}

/**
 * Bulk delete expenses within a date range
 */
export async function bulkDeleteExpenses(
  partnershipId: string,
  options: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    budgetId?: string;
    selectedIds?: string[];
  }
): Promise<BulkDeleteResult> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('expenses')
      .delete()
      .eq('partnership_id', partnershipId);

    // Filter by selected IDs if provided
    if (options.selectedIds && options.selectedIds.length > 0) {
      query = query.in('id', options.selectedIds);
    } else {
      // Filter by date range
      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }

      // Filter by category
      if (options.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      // Filter by budget
      if (options.budgetId) {
        query = query.eq('budget_id', options.budgetId);
      }
    }

    const { data, error, count } = await query.select('*', { count: 'exact' });

    if (error) {
      console.error('Error bulk deleting expenses:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      deleted_count: count || data?.length || 0,
    };
  } catch (error) {
    console.error('Error bulk deleting expenses:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete expenses',
    };
  }
}

/**
 * Bulk delete tasks within a date range
 */
export async function bulkDeleteTasks(
  partnershipId: string,
  options: {
    startDate?: string;
    endDate?: string;
    completed?: boolean;
    selectedIds?: string[];
  }
): Promise<BulkDeleteResult> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('tasks')
      .delete()
      .eq('partnership_id', partnershipId);

    // Filter by selected IDs if provided
    if (options.selectedIds && options.selectedIds.length > 0) {
      query = query.in('id', options.selectedIds);
    } else {
      // Filter by date range
      if (options.startDate) {
        query = query.gte('created_at', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      // Filter by completion status
      if (options.completed !== undefined) {
        query = query.eq('completed', options.completed);
      }
    }

    const { data, error, count } = await query.select('*', { count: 'exact' });

    if (error) {
      console.error('Error bulk deleting tasks:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      deleted_count: count || data?.length || 0,
    };
  } catch (error) {
    console.error('Error bulk deleting tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete tasks',
    };
  }
}

/**
 * Bulk export data by date range
 */
export async function bulkExportByDateRange(
  userId: string,
  dataType: 'expenses' | 'tasks' | 'calendar_events' | 'messages' | 'reminders',
  startDate: string,
  endDate: string
): Promise<BulkExportResult> {
  try {
    const supabase = createClient();

    // Map data types to their respective tables and date columns
    const tableConfig: Record<string, { table: string; dateColumn: string }> = {
      expenses: { table: 'expenses', dateColumn: 'date' },
      tasks: { table: 'tasks', dateColumn: 'created_at' },
      calendar_events: { table: 'calendar_events', dateColumn: 'start_time' },
      messages: { table: 'messages', dateColumn: 'created_at' },
      reminders: { table: 'reminders', dateColumn: 'reminder_time' },
    };

    const config = tableConfig[dataType];
    if (!config) {
      return { success: false, error: 'Invalid data type' };
    }

    // Query data within date range
    const { data, error, count } = await supabase
      .from(config.table)
      .select('*', { count: 'exact' })
      .gte(config.dateColumn, startDate)
      .lte(config.dateColumn, endDate)
      .order(config.dateColumn, { ascending: false });

    if (error) {
      console.error(`Error exporting ${dataType}:`, error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    console.error(`Error exporting ${dataType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export data',
    };
  }
}

/**
 * Archive old expenses (older than specified date)
 * Moves them to an archived state without deleting
 */
export async function archiveOldExpenses(
  partnershipId: string,
  olderThanDate: string
): Promise<BulkArchiveResult> {
  try {
    const supabase = createClient();

    // Note: This requires an 'archived' column in the expenses table
    // If it doesn't exist, we can add it via migration
    const { data, error, count } = await supabase
      .from('expenses')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('partnership_id', partnershipId)
      .lt('date', olderThanDate)
      .eq('archived', false)
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error archiving expenses:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      archived_count: count || data?.length || 0,
    };
  } catch (error) {
    console.error('Error archiving expenses:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive expenses',
    };
  }
}

/**
 * Archive old tasks (completed and older than specified date)
 */
export async function archiveOldTasks(
  partnershipId: string,
  olderThanDate: string
): Promise<BulkArchiveResult> {
  try {
    const supabase = createClient();

    const { data, error, count } = await supabase
      .from('tasks')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('partnership_id', partnershipId)
      .eq('completed', true)
      .lt('completed_at', olderThanDate)
      .eq('archived', false)
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error archiving tasks:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      archived_count: count || data?.length || 0,
    };
  } catch (error) {
    console.error('Error archiving tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive tasks',
    };
  }
}

/**
 * Archive old calendar events (past events older than specified date)
 */
export async function archiveOldCalendarEvents(
  partnershipId: string,
  olderThanDate: string
): Promise<BulkArchiveResult> {
  try {
    const supabase = createClient();

    const { data, error, count } = await supabase
      .from('calendar_events')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('partnership_id', partnershipId)
      .lt('end_time', olderThanDate)
      .eq('archived', false)
      .select('*', { count: 'exact' });

    if (error) {
      console.error('Error archiving calendar events:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      archived_count: count || data?.length || 0,
    };
  } catch (error) {
    console.error('Error archiving calendar events:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive calendar events',
    };
  }
}

/**
 * Get count of items that would be affected by bulk operation
 * Useful for confirmation dialogs
 */
export async function getExpensesBulkDeleteCount(
  partnershipId: string,
  options: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    budgetId?: string;
    selectedIds?: string[];
  }
): Promise<number> {
  try {
    const supabase = createClient();

    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('partnership_id', partnershipId);

    if (options.selectedIds && options.selectedIds.length > 0) {
      query = query.in('id', options.selectedIds);
    } else {
      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }
      if (options.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }
      if (options.budgetId) {
        query = query.eq('budget_id', options.budgetId);
      }
    }

    const { count } = await query;
    return count || 0;
  } catch (error) {
    console.error('Error getting bulk delete count:', error);
    return 0;
  }
}
