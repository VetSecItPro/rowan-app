import { createClient } from '@/lib/supabase/client';
import type { Reminder } from './reminders-service';

// =============================================
// BULK OPERATIONS SERVICE
// =============================================
// Provides batch operations for reminders

export interface BulkOperationResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors: string[];
}

export const remindersBulkService = {
  /**
   * Complete multiple reminders at once
   */
  async completeReminders(reminderIds: string[]): Promise<BulkOperationResult> {
    const errors: string[] = [];

    if (reminderIds.length === 0) {
      return { success: true, successCount: 0, failedCount: 0, errors };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('reminders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .in('id', reminderIds)
      .select('id');

    if (error) {
      errors.push(`Failed to complete reminders: ${error.message}`);
      return { success: false, successCount: 0, failedCount: reminderIds.length, errors };
    }

    const successCount = data?.length ?? 0;
    const failedCount = reminderIds.length - successCount;

    if (failedCount > 0) {
      const updatedIds = new Set((data || []).map((r: { id: string }) => r.id));
      const missingIds = reminderIds.filter((id) => !updatedIds.has(id));
      errors.push(`Reminders not found or not updated: ${missingIds.join(', ')}`);
    }

    return { success: failedCount === 0, successCount, failedCount, errors };
  },

  /**
   * Delete multiple reminders at once
   */
  async deleteReminders(reminderIds: string[]): Promise<BulkOperationResult> {
    const errors: string[] = [];

    if (reminderIds.length === 0) {
      return { success: true, successCount: 0, failedCount: 0, errors };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('reminders')
      .delete()
      .in('id', reminderIds)
      .select('id');

    if (error) {
      errors.push(`Failed to delete reminders: ${error.message}`);
      return { success: false, successCount: 0, failedCount: reminderIds.length, errors };
    }

    const successCount = data?.length ?? 0;
    const failedCount = reminderIds.length - successCount;

    if (failedCount > 0) {
      const deletedIds = new Set((data || []).map((r: { id: string }) => r.id));
      const missingIds = reminderIds.filter((id) => !deletedIds.has(id));
      errors.push(`Reminders not found or not deleted: ${missingIds.join(', ')}`);
    }

    return { success: failedCount === 0, successCount, failedCount, errors };
  },

  /**
   * Reassign multiple reminders to a new user
   */
  async reassignReminders(reminderIds: string[], newAssigneeId: string | null): Promise<BulkOperationResult> {
    const errors: string[] = [];

    if (reminderIds.length === 0) {
      return { success: true, successCount: 0, failedCount: 0, errors };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('reminders')
      .update({ assigned_to: newAssigneeId })
      .in('id', reminderIds)
      .select('id');

    if (error) {
      errors.push(`Failed to reassign reminders: ${error.message}`);
      return { success: false, successCount: 0, failedCount: reminderIds.length, errors };
    }

    const successCount = data?.length ?? 0;
    const failedCount = reminderIds.length - successCount;

    if (failedCount > 0) {
      const updatedIds = new Set((data || []).map((r: { id: string }) => r.id));
      const missingIds = reminderIds.filter((id) => !updatedIds.has(id));
      errors.push(`Reminders not found or not reassigned: ${missingIds.join(', ')}`);
    }

    return { success: failedCount === 0, successCount, failedCount, errors };
  },

  /**
   * Change priority for multiple reminders
   */
  async changePriority(
    reminderIds: string[],
    newPriority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<BulkOperationResult> {
    const errors: string[] = [];

    if (reminderIds.length === 0) {
      return { success: true, successCount: 0, failedCount: 0, errors };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('reminders')
      .update({ priority: newPriority })
      .in('id', reminderIds)
      .select('id');

    if (error) {
      errors.push(`Failed to change priority for reminders: ${error.message}`);
      return { success: false, successCount: 0, failedCount: reminderIds.length, errors };
    }

    const successCount = data?.length ?? 0;
    const failedCount = reminderIds.length - successCount;

    if (failedCount > 0) {
      const updatedIds = new Set((data || []).map((r: { id: string }) => r.id));
      const missingIds = reminderIds.filter((id) => !updatedIds.has(id));
      errors.push(`Reminders not found or priority not changed: ${missingIds.join(', ')}`);
    }

    return { success: failedCount === 0, successCount, failedCount, errors };
  },

  /**
   * Change category for multiple reminders
   */
  async changeCategory(
    reminderIds: string[],
    newCategory: 'bills' | 'health' | 'work' | 'personal' | 'household'
  ): Promise<BulkOperationResult> {
    const errors: string[] = [];

    if (reminderIds.length === 0) {
      return { success: true, successCount: 0, failedCount: 0, errors };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('reminders')
      .update({ category: newCategory })
      .in('id', reminderIds)
      .select('id');

    if (error) {
      errors.push(`Failed to change category for reminders: ${error.message}`);
      return { success: false, successCount: 0, failedCount: reminderIds.length, errors };
    }

    const successCount = data?.length ?? 0;
    const failedCount = reminderIds.length - successCount;

    if (failedCount > 0) {
      const updatedIds = new Set((data || []).map((r: { id: string }) => r.id));
      const missingIds = reminderIds.filter((id) => !updatedIds.has(id));
      errors.push(`Reminders not found or category not changed: ${missingIds.join(', ')}`);
    }

    return { success: failedCount === 0, successCount, failedCount, errors };
  },

  /**
   * Export reminders to JSON
   */
  exportToJSON(reminders: Reminder[]): string {
    return JSON.stringify(reminders, null, 2);
  },

  /**
   * Export reminders to CSV
   */
  exportToCSV(reminders: Reminder[]): string {
    if (reminders.length === 0) return '';

    // CSV headers
    const headers = [
      'ID',
      'Title',
      'Description',
      'Category',
      'Priority',
      'Status',
      'Reminder Time',
      'Assigned To',
      'Created At',
    ];

    // CSV rows
    const rows = reminders.map((reminder) => [
      reminder.id,
      `"${(reminder.title || '').replace(/"/g, '""')}"`,
      `"${(reminder.description || '').replace(/"/g, '""')}"`,
      reminder.category,
      reminder.priority,
      reminder.status,
      reminder.reminder_time || '',
      reminder.assignee?.name || '',
      reminder.created_at,
    ]);

    // Combine headers and rows
    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  },

  /**
   * Download file helper
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
