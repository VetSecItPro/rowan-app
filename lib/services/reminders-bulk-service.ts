import { remindersService } from './reminders-service';
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
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of reminderIds) {
      try {
        await remindersService.updateReminder(id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Failed to complete reminder ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      errors,
    };
  },

  /**
   * Delete multiple reminders at once
   */
  async deleteReminders(reminderIds: string[]): Promise<BulkOperationResult> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of reminderIds) {
      try {
        await remindersService.deleteReminder(id);
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Failed to delete reminder ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      errors,
    };
  },

  /**
   * Reassign multiple reminders to a new user
   */
  async reassignReminders(reminderIds: string[], newAssigneeId: string | null): Promise<BulkOperationResult> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of reminderIds) {
      try {
        await remindersService.updateReminder(id, {
          assigned_to: newAssigneeId || undefined,
        });
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Failed to reassign reminder ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      errors,
    };
  },

  /**
   * Change priority for multiple reminders
   */
  async changePriority(
    reminderIds: string[],
    newPriority: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<BulkOperationResult> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of reminderIds) {
      try {
        await remindersService.updateReminder(id, {
          priority: newPriority,
        });
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Failed to change priority for reminder ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      errors,
    };
  },

  /**
   * Change category for multiple reminders
   */
  async changeCategory(
    reminderIds: string[],
    newCategory: 'bills' | 'health' | 'work' | 'personal' | 'household'
  ): Promise<BulkOperationResult> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of reminderIds) {
      try {
        await remindersService.updateReminder(id, {
          category: newCategory,
        });
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Failed to change category for reminder ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: failedCount === 0,
      successCount,
      failedCount,
      errors,
    };
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
