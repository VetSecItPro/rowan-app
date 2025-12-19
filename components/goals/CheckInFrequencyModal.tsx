'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Bell, Settings, Repeat } from 'lucide-react';
import { goalsService } from '@/lib/services/goals-service';
import { hapticLight, hapticSuccess } from '@/lib/utils/haptics';
import { logger } from '@/lib/logger';

interface CheckInFrequencySettings {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number; // 0 = Sunday
  day_of_month?: number; // 1-31
  reminder_time: string; // HH:MM format
  enable_reminders: boolean;
  reminder_days_before: number;
  auto_schedule: boolean;
}

interface CheckInFrequencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Check in every day', icon: '📅' },
  { value: 'weekly', label: 'Weekly', description: 'Check in once per week', icon: '📆' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Check in every 2 weeks', icon: '🗓️' },
  { value: 'monthly', label: 'Monthly', description: 'Check in once per month', icon: '📄' },
] as const;

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const REMINDER_DAYS_OPTIONS = [
  { value: 0, label: 'On the day' },
  { value: 1, label: '1 day before' },
  { value: 2, label: '2 days before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
];

export function CheckInFrequencyModal({ isOpen, onClose, goalId, goalTitle }: CheckInFrequencyModalProps) {
  const [settings, setSettings] = useState<CheckInFrequencySettings>({
    frequency: 'weekly',
    day_of_week: 1, // Monday
    day_of_month: 1,
    reminder_time: '09:00',
    enable_reminders: true,
    reminder_days_before: 0,
    auto_schedule: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingSettings, setHasExistingSettings] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, goalId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const existingSettings = await goalsService.getCheckInSettings(goalId);

      if (existingSettings) {
        setHasExistingSettings(true);
        setSettings({
          frequency: existingSettings.frequency,
          day_of_week: existingSettings.day_of_week || 1,
          day_of_month: existingSettings.day_of_month || 1,
          reminder_time: existingSettings.reminder_time || '09:00',
          enable_reminders: existingSettings.enable_reminders,
          reminder_days_before: existingSettings.reminder_days_before || 0,
          auto_schedule: existingSettings.auto_schedule || false,
        });
      } else {
        setHasExistingSettings(false);
        // Keep default settings
      }
    } catch (error) {
      logger.error('Error loading check-in settings:', error, { component: 'CheckInFrequencyModal', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const settingsToSave = {
        goal_id: goalId,
        frequency: settings.frequency,
        day_of_week: settings.frequency === 'weekly' || settings.frequency === 'biweekly' ? settings.day_of_week : null,
        day_of_month: settings.frequency === 'monthly' ? settings.day_of_month : null,
        reminder_time: settings.reminder_time,
        enable_reminders: settings.enable_reminders,
        reminder_days_before: settings.reminder_days_before,
        auto_schedule: settings.auto_schedule,
      };

      if (hasExistingSettings) {
        await goalsService.updateCheckInSettings({
          ...settingsToSave,
          goal_id: goalId
        });
      } else {
        // Use updateCheckInSettings for both create and update (upsert behavior)
        await goalsService.updateCheckInSettings({
          ...settingsToSave,
          goal_id: goalId
        });
      }

      hapticSuccess();
      onClose();
    } catch (error) {
      logger.error('Error saving check-in settings:', error, { component: 'CheckInFrequencyModal', action: 'component_action' });
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updates: Partial<CheckInFrequencySettings>) => {
    hapticLight();
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const getNextCheckInDate = () => {
    const now = new Date();
    const [hours, minutes] = settings.reminder_time.split(':').map(Number);

    switch (settings.frequency) {
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hours, minutes, 0, 0);
        return tomorrow;

      case 'weekly':
        const nextWeek = new Date(now);
        const daysUntilTarget = (settings.day_of_week! - now.getDay() + 7) % 7;
        nextWeek.setDate(now.getDate() + (daysUntilTarget || 7));
        nextWeek.setHours(hours, minutes, 0, 0);
        return nextWeek;

      case 'biweekly':
        const nextBiweek = new Date(now);
        const biweekDays = (settings.day_of_week! - now.getDay() + 14) % 14;
        nextBiweek.setDate(now.getDate() + (biweekDays || 14));
        nextBiweek.setHours(hours, minutes, 0, 0);
        return nextBiweek;

      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(settings.day_of_month!);
        nextMonth.setHours(hours, minutes, 0, 0);
        return nextMonth;

      default:
        return new Date();
    }
  };

  const formatNextCheckIn = () => {
    const nextDate = getNextCheckInDate();
    return nextDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-2xl sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Check-In Frequency</h2>
                <p className="text-sm text-indigo-100 mt-1">{goalTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-95"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Frequency Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Repeat className="w-5 h-5" />
                  How often do you want to check in?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateSettings({ frequency: option.value })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        settings.frequency === option.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {option.label}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Selection for Weekly/Bi-weekly */}
              {(settings.frequency === 'weekly' || settings.frequency === 'biweekly') && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Which day of the week?
                  </h3>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => updateSettings({ day_of_week: day.value })}
                        className={`p-3 rounded-lg text-center transition-all ${
                          settings.day_of_week === day.value
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-medium text-sm">{day.short}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of Month Selection for Monthly */}
              {settings.frequency === 'monthly' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Which day of the month?
                  </h3>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={settings.day_of_month}
                      onChange={(e) => updateSettings({ day_of_month: parseInt(e.target.value) || 1 })}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-gray-600 dark:text-gray-400">
                      day of each month
                    </span>
                  </div>
                </div>
              )}

              {/* Time Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  What time?
                </h3>
                <input
                  type="time"
                  value={settings.reminder_time}
                  onChange={(e) => updateSettings({ reminder_time: e.target.value })}
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                />
              </div>

              {/* Reminder Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Reminder Settings
                </h3>

                <div className="space-y-4">
                  {/* Enable Reminders Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Enable Reminders
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Get notified when it's time to check in
                      </div>
                    </div>
                    <button
                      onClick={() => updateSettings({ enable_reminders: !settings.enable_reminders })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.enable_reminders ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.enable_reminders ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reminder Timing */}
                  {settings.enable_reminders && (
                    <div className="relative z-50">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Send reminder:
                      </label>
                      <select
                        value={settings.reminder_days_before}
                        onChange={(e) => updateSettings({ reminder_days_before: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 relative z-50"
                        style={{ position: 'relative', zIndex: 9999 }}
                      >
                        {REMINDER_DAYS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Auto-schedule */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Auto-schedule Next Check-in
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Automatically schedule the next check-in after completing one
                      </div>
                    </div>
                    <button
                      onClick={() => updateSettings({ auto_schedule: !settings.auto_schedule })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.auto_schedule ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.auto_schedule ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-2">Preview</h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  Next check-in: <strong>{formatNextCheckIn()}</strong>
                </p>
                {settings.enable_reminders && settings.reminder_days_before > 0 && (
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                    Reminder: {settings.reminder_days_before} day{settings.reminder_days_before !== 1 ? 's' : ''} before
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : hasExistingSettings ? 'Update Settings' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}