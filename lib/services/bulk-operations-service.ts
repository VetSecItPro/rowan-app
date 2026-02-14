import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

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
  data?: Record<string, unknown>[];
  count?: number;
  error?: string;
}

export interface BulkArchiveResult {
  success: boolean;
  archived_count?: number;
  error?: string;
}

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

/**
 * Bulk delete expenses within a date range
 */
export async function bulkDeleteExpenses(
  spaceId: string,
  options: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    budgetId?: string;
    selectedIds?: string[];
  },
  supabaseClient?: SupabaseClient
): Promise<BulkDeleteResult> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    let query = supabase
      .from('expenses')
      .delete()
      .eq('space_id', spaceId);

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

    const { data, error } = await query.select('id');
    const count = data?.length || 0;

    if (error) {
      logger.error('Error bulk deleting expenses:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return {
      success: true,
      deleted_count: count,
    };
  } catch (error) {
    logger.error('Error bulk deleting expenses:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
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
  spaceId: string,
  options: {
    startDate?: string;
    endDate?: string;
    completed?: boolean;
    selectedIds?: string[];
  },
  supabaseClient?: SupabaseClient
): Promise<BulkDeleteResult> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    let query = supabase
      .from('tasks')
      .delete()
      .eq('space_id', spaceId);

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
        query = options.completed
          ? query.eq('status', 'completed')
          : query.neq('status', 'completed');
      }
    }

    const { data, error } = await query.select('id');
    const count = data?.length || 0;

    if (error) {
      logger.error('Error bulk deleting tasks:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return {
      success: true,
      deleted_count: count,
    };
  } catch (error) {
    logger.error('Error bulk deleting tasks:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete tasks',
    };
  }
}

/**
 * Bulk export data by date range
 * SECURITY: Only exports data from spaces the user is a member of
 */
export async function bulkExportByDateRange(
  userId: string,
  dataType: 'expenses' | 'tasks' | 'calendar_events' | 'messages' | 'reminders',
  startDate: string,
  endDate: string,
  supabaseClient?: SupabaseClient
): Promise<BulkExportResult> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    // SECURITY: First get all spaces the user is a member of
    const { data: userSpaces, error: spacesError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId);

    if (spacesError) {
      logger.error('Error fetching user spaces:', spacesError, { component: 'lib-bulk-operations-service', action: 'service_call' });
      return { success: false, error: 'Failed to verify user permissions' };
    }

    if (!userSpaces || userSpaces.length === 0) {
      // User has no spaces - return empty result
      return { success: true, data: [], count: 0 };
    }

    const spaceIds = userSpaces.map((s: { space_id: string }) => s.space_id);

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

    // SECURITY: Query data within date range AND filtered by user's spaces
    const { data, error, count } = await supabase
      .from(config.table)
      .select('*')
      .in('space_id', spaceIds)
      .gte(config.dateColumn, startDate)
      .lte(config.dateColumn, endDate)
      .order(config.dateColumn, { ascending: false });

    if (error) {
      logger.error('Error exporting ${dataType}:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data || [],
      count: count || 0,
    };
  } catch (error) {
    logger.error('Error exporting ${dataType}:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export data',
    };
  }
}

/**
 * Archive (delete) old expenses older than specified date.
 * The expenses table has no `archived` column, so archiving = deletion.
 */
export async function archiveOldExpenses(
  spaceId: string,
  olderThanDate: string,
  supabaseClient?: SupabaseClient
): Promise<BulkArchiveResult> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    const { data, error } = await supabase
      .from('expenses')
      .delete()
      .eq('space_id', spaceId)
      .lt('date', olderThanDate)
      .select('id');

    if (error) {
      logger.error('Error archiving expenses:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return {
      success: true,
      archived_count: data?.length || 0,
    };
  } catch (error) {
    logger.error('Error archiving expenses:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive expenses',
    };
  }
}

/**
 * Archive (delete) old completed tasks older than specified date.
 * The tasks table has no `archived` column, so archiving = deletion of completed tasks.
 */
export async function archiveOldTasks(
  spaceId: string,
  olderThanDate: string,
  supabaseClient?: SupabaseClient
): Promise<BulkArchiveResult> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('space_id', spaceId)
      .eq('status', 'completed')
      .lt('completed_at', olderThanDate)
      .select('id');

    if (error) {
      logger.error('Error archiving tasks:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return {
      success: true,
      archived_count: data?.length || 0,
    };
  } catch (error) {
    logger.error('Error archiving tasks:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive tasks',
    };
  }
}

/**
 * Archive (delete) old past calendar events older than specified date.
 * The calendar_events table has no `archived` column, so archiving = deletion.
 * Uses start_time since end_time may be null on some events.
 */
export async function archiveOldCalendarEvents(
  spaceId: string,
  olderThanDate: string,
  supabaseClient?: SupabaseClient
): Promise<BulkArchiveResult> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    const { data, error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('space_id', spaceId)
      .lt('start_time', olderThanDate)
      .select('id');

    if (error) {
      logger.error('Error archiving calendar events:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
      return { success: false, error: error.message };
    }

    return {
      success: true,
      archived_count: data?.length || 0,
    };
  } catch (error) {
    logger.error('Error archiving calendar events:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
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
  spaceId: string,
  options: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    budgetId?: string;
    selectedIds?: string[];
  },
  supabaseClient?: SupabaseClient
): Promise<number> {
  try {
    const supabase = getSupabaseClient(supabaseClient);

    let query = supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('space_id', spaceId);

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
    logger.error('Error getting bulk delete count:', error, { component: 'lib-bulk-operations-service', action: 'service_call' });
    return 0;
  }
}
