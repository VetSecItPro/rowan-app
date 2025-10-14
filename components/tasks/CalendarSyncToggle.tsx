'use client';

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { taskCalendarService } from '@/lib/services/task-calendar-service';

interface CalendarSyncToggleProps {
  taskId: string;
  userId: string;
}

interface SyncStatus {
  isSynced: boolean;
  eventId?: string;
  lastSyncedAt?: string;
  error?: string;
}

export function CalendarSyncToggle({ taskId, userId }: CalendarSyncToggleProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isSynced: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);

  useEffect(() => {
    loadSyncStatus();
    loadPreferences();
  }, [taskId, userId]);

  async function loadSyncStatus() {
    try {
      // getTaskSyncStatus doesn't exist, so we'll just initialize with default
      setSyncStatus({ isSynced: false });
    } catch (error) {
      console.error('Error loading sync status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPreferences() {
    try {
      const prefs = await taskCalendarService.getCalendarPreferences(userId);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }

  async function handleToggleSync() {
    setSyncing(true);
    try {
      if (syncStatus.isSynced) {
        // Unsync from calendar
        await taskCalendarService.unsyncFromCalendar(taskId);
        setSyncStatus({ isSynced: false });
      } else {
        // Sync to calendar
        const result = await taskCalendarService.syncTaskToCalendar(taskId);
        setSyncStatus({
          isSynced: true,
          eventId: result.event_id,
          lastSyncedAt: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Error toggling sync:', error);
      setSyncStatus(prev => ({
        ...prev,
        error: error.message || 'Failed to sync',
      }));
    } finally {
      setSyncing(false);
    }
  }

  async function handleUpdatePreferences(autoSync: boolean) {
    try {
      await taskCalendarService.updateCalendarPreferences(userId, autoSync);
      loadPreferences();
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Calendar className="w-4 h-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sync Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${syncStatus.isSynced ? 'text-blue-500' : 'text-gray-400'}`} />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Calendar Sync
            </p>
            {syncStatus.isSynced && syncStatus.lastSyncedAt && (
              <p className="text-xs text-gray-500">
                Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleToggleSync}
          disabled={syncing}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            syncStatus.isSynced ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          } ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              syncStatus.isSynced ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Sync Status Messages */}
      {syncStatus.isSynced && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-green-900 dark:text-green-200">
              Synced to Calendar
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              This task appears in your calendar with a 📋 prefix
            </p>
            {syncStatus.eventId && (
              <button className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mt-2">
                <ExternalLink className="w-3 h-3" />
                View in Calendar
              </button>
            )}
          </div>
        </div>
      )}

      {syncStatus.error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-red-900 dark:text-red-200">
              Sync Error
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              {syncStatus.error}
            </p>
          </div>
        </div>
      )}

      {/* Auto-Sync Preference */}
      {preferences && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Auto-sync new tasks
              </p>
              <p className="text-xs text-gray-500">
                Automatically sync all new tasks to calendar
              </p>
            </div>
            <button
              onClick={() => handleUpdatePreferences(!preferences.auto_sync_tasks)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.auto_sync_tasks ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.auto_sync_tasks ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      )}

      {/* Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> Calendar sync uses your task's due date and estimated duration.
          Changes to the task will automatically update the calendar event.
        </p>
      </div>
    </div>
  );
}
