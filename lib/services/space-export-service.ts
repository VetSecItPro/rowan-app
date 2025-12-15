import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// =============================================
// SPACE-SPECIFIC EXPORT SERVICE
// =============================================
// This is completely separate from profile-wide exports
// Only exports data from a specific space when user deletes that space

// =============================================
// VALIDATION SCHEMAS
// =============================================

const SpaceExportSchema = z.object({
  spaceId: z.string().uuid('Invalid space ID'),
  userId: z.string().uuid('Invalid user ID'),
  format: z.enum(['json', 'csv'], { message: 'Format must be json or csv' }),
});

// =============================================
// SPACE DATA TYPES
// =============================================

interface SpaceExportData {
  space: {
    id: string;
    name: string;
    created_at: string;
    user_role: string;
  };
  tasks: any[];
  events: any[];
  reminders: any[];
  messages: any[];
  shopping_lists: any[];
  shopping_items: any[];
  recipes: any[];
  meal_plans: any[];
  chores: any[];
  expenses: any[];
  budgets: any[];
  goals: any[];
  goal_milestones: any[];
  daily_checkins: any[];
  activity_logs: any[];
  export_metadata: {
    exported_at: string;
    export_type: 'space_deletion';
    space_name: string;
    total_records: number;
  };
}

// =============================================
// SPACE EXPORT FUNCTIONS
// =============================================

/**
 * Export all data from a specific space
 * Used when deleting a space to preserve user data
 * @param spaceId - ID of space to export
 * @param userId - ID of user requesting export (must be space owner)
 * @param format - Export format (json or csv)
 * @returns Exported data or error
 */
export async function exportSpaceData(
  spaceId: string,
  userId: string,
  format: 'json' | 'csv' = 'json'
): Promise<{ success: true; data: SpaceExportData | string } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    // Validate input
    const validated = SpaceExportSchema.parse({ spaceId, userId, format });

    // SECURITY: Verify user is owner of the space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return {
        success: false,
        error: 'Only space owners can export space data'
      };
    }

    // Get space details
    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .select('id, name, created_at')
      .eq('id', spaceId)
      .single();

    if (spaceError || !space) {
      return {
        success: false,
        error: 'Space not found'
      };
    }

    // Export all space-specific data
    const exportData: SpaceExportData = {
      space: {
        ...space,
        user_role: membership.role
      },
      tasks: [],
      events: [],
      reminders: [],
      messages: [],
      shopping_lists: [],
      shopping_items: [],
      recipes: [],
      meal_plans: [],
      chores: [],
      expenses: [],
      budgets: [],
      goals: [],
      goal_milestones: [],
      daily_checkins: [],
      activity_logs: [],
      export_metadata: {
        exported_at: new Date().toISOString(),
        export_type: 'space_deletion',
        space_name: space.name,
        total_records: 0
      }
    };

    // Fetch all data types for this space
    const dataQueries = await Promise.allSettled([
      // Tasks
      supabase
        .from('tasks')
        .select('*')
        .eq('space_id', spaceId),

      // Events
      supabase
        .from('events')
        .select('*')
        .eq('space_id', spaceId),

      // Reminders
      supabase
        .from('reminders')
        .select('*')
        .eq('space_id', spaceId),

      // Messages
      supabase
        .from('messages')
        .select('*')
        .eq('space_id', spaceId),

      // Shopping Lists
      supabase
        .from('shopping_lists')
        .select('*')
        .eq('space_id', spaceId),

      // Shopping Items (via shopping lists)
      supabase
        .from('shopping_items')
        .select(`
          *,
          shopping_lists!inner(space_id)
        `)
        .eq('shopping_lists.space_id', spaceId),

      // Recipes
      supabase
        .from('recipes')
        .select('*')
        .eq('space_id', spaceId),

      // Meal Plans
      supabase
        .from('meal_plans')
        .select('*')
        .eq('space_id', spaceId),

      // Chores
      supabase
        .from('chores')
        .select('*')
        .eq('space_id', spaceId),

      // Expenses
      supabase
        .from('expenses')
        .select('*')
        .eq('space_id', spaceId),

      // Budgets
      supabase
        .from('budgets')
        .select('*')
        .eq('space_id', spaceId),

      // Goals
      supabase
        .from('goals')
        .select('*')
        .eq('space_id', spaceId),

      // Goal Milestones (via goals)
      supabase
        .from('goal_milestones')
        .select(`
          *,
          goals!inner(space_id)
        `)
        .eq('goals.space_id', spaceId),

      // Daily Check-ins
      supabase
        .from('daily_checkins')
        .select('*')
        .eq('space_id', spaceId),

      // Activity Logs
      supabase
        .from('activity_logs')
        .select('*')
        .eq('space_id', spaceId)
    ]);

    // Process results and handle errors gracefully
    const dataTypes = [
      'tasks', 'events', 'reminders', 'messages', 'shopping_lists', 'shopping_items',
      'recipes', 'meal_plans', 'chores', 'expenses', 'budgets', 'goals',
      'goal_milestones', 'daily_checkins', 'activity_logs'
    ];

    let totalRecords = 0;

    dataQueries.forEach((result, index) => {
      const dataType = dataTypes[index] as keyof Omit<SpaceExportData, 'space' | 'export_metadata'>;
      if (result.status === 'fulfilled' && result.value.data) {
        exportData[dataType] = result.value.data;
        totalRecords += result.value.data.length;
      } else {
        logger.warn(`Failed to export ${dataType}`, { component: 'lib-space-export-service', error: result.status === 'rejected' ? result.reason : 'No data' });
        exportData[dataType] = [];
      }
    });

    exportData.export_metadata.total_records = totalRecords;

    // Return appropriate format
    if (format === 'json') {
      return { success: true, data: exportData };
    } else {
      // Convert to CSV format
      const csvData = convertSpaceDataToCSV(exportData);
      return { success: true, data: csvData };
    }

  } catch (error) {
    logger.error('[space-export-service] exportSpaceData error:', error, { component: 'lib-space-export-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export space data'
    };
  }
}

/**
 * Convert space export data to CSV format
 * @param data - Space export data
 * @returns CSV string
 */
function convertSpaceDataToCSV(data: SpaceExportData): string {
  const csvSections: string[] = [];

  // Space metadata
  csvSections.push('# SPACE INFORMATION');
  csvSections.push('Field,Value');
  csvSections.push(`Space ID,${data.space.id}`);
  csvSections.push(`Space Name,${data.space.name}`);
  csvSections.push(`Created At,${data.space.created_at}`);
  csvSections.push(`Your Role,${data.space.user_role}`);
  csvSections.push(`Exported At,${data.export_metadata.exported_at}`);
  csvSections.push(`Total Records,${data.export_metadata.total_records}`);
  csvSections.push('');

  // Helper function to convert array to CSV
  const arrayToCSV = (items: any[], title: string): string => {
    if (items.length === 0) return `# ${title}\nNo data\n`;

    const headers = Object.keys(items[0]);
    const csvRows = [
      `# ${title}`,
      headers.join(','),
      ...items.map(item =>
        headers.map(header => {
          const value = item[header];
          // Escape CSV values
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        }).join(',')
      ),
      ''
    ];
    return csvRows.join('\n');
  };

  // Add each data type
  csvSections.push(arrayToCSV(data.tasks, 'TASKS'));
  csvSections.push(arrayToCSV(data.events, 'EVENTS'));
  csvSections.push(arrayToCSV(data.reminders, 'REMINDERS'));
  csvSections.push(arrayToCSV(data.messages, 'MESSAGES'));
  csvSections.push(arrayToCSV(data.shopping_lists, 'SHOPPING LISTS'));
  csvSections.push(arrayToCSV(data.shopping_items, 'SHOPPING ITEMS'));
  csvSections.push(arrayToCSV(data.recipes, 'RECIPES'));
  csvSections.push(arrayToCSV(data.meal_plans, 'MEAL PLANS'));
  csvSections.push(arrayToCSV(data.chores, 'CHORES'));
  csvSections.push(arrayToCSV(data.expenses, 'EXPENSES'));
  csvSections.push(arrayToCSV(data.budgets, 'BUDGETS'));
  csvSections.push(arrayToCSV(data.goals, 'GOALS'));
  csvSections.push(arrayToCSV(data.goal_milestones, 'GOAL MILESTONES'));
  csvSections.push(arrayToCSV(data.daily_checkins, 'DAILY CHECK-INS'));
  csvSections.push(arrayToCSV(data.activity_logs, 'ACTIVITY LOGS'));

  return csvSections.join('\n');
}

/**
 * Get space export summary (for preview before deletion)
 * @param spaceId - ID of space
 * @param userId - ID of user
 * @returns Summary of what will be exported
 */
export async function getSpaceExportSummary(
  spaceId: string,
  userId: string
): Promise<{ success: true; data: Record<string, number> } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    // Verify user is owner of the space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return {
        success: false,
        error: 'Only space owners can view export summary'
      };
    }

    // Count records for each data type
    const countQueries = await Promise.allSettled([
      supabase.from('tasks').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('events').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('reminders').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('messages').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('shopping_lists').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('recipes').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('meal_plans').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('chores').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('expenses').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('budgets').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('goals').select('id', { count: 'exact' }).eq('space_id', spaceId),
      supabase.from('daily_checkins').select('id', { count: 'exact' }).eq('space_id', spaceId),
    ]);

    const dataTypes = [
      'tasks', 'events', 'reminders', 'messages', 'shopping_lists',
      'recipes', 'meal_plans', 'chores', 'expenses', 'budgets', 'goals', 'daily_checkins'
    ];

    const summary: Record<string, number> = {};
    let totalCount = 0;

    countQueries.forEach((result, index) => {
      const dataType = dataTypes[index];
      if (result.status === 'fulfilled') {
        const count = result.value.count || 0;
        summary[dataType] = count;
        totalCount += count;
      } else {
        summary[dataType] = 0;
      }
    });

    summary.total = totalCount;

    return { success: true, data: summary };

  } catch (error) {
    logger.error('[space-export-service] getSpaceExportSummary error:', error, { component: 'lib-space-export-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to get export summary'
    };
  }
}