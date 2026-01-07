'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Bell, Clock, Calendar, Volume2, VolumeX } from 'lucide-react';
import { logger } from '@/lib/logger';
import {
  smartNudgesService,
  NudgeSettings,
  CreateNudgeSettingsInput
} from '@/lib/services/smart-nudges-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NudgeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings?: NudgeSettings | null;
  onSettingsUpdate?: (settings: NudgeSettings) => void;
}

export function NudgeSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSettingsUpdate
}: NudgeSettingsModalProps) {
  const { user, currentSpace } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<CreateNudgeSettingsInput>({
    space_id: currentSpace?.id || '',
    nudges_enabled: true,
    daily_nudges_enabled: true,
    weekly_summary_enabled: true,
    milestone_reminders_enabled: true,
    deadline_alerts_enabled: true,
    motivation_quotes_enabled: true,
    preferred_nudge_time: '09:00',
    preferred_timezone: 'UTC',
    nudge_frequency_days: 1,
    max_daily_nudges: 3,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    weekend_nudges_enabled: false
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings({
        space_id: currentSettings.space_id,
        nudges_enabled: currentSettings.nudges_enabled,
        daily_nudges_enabled: currentSettings.daily_nudges_enabled,
        weekly_summary_enabled: currentSettings.weekly_summary_enabled,
        milestone_reminders_enabled: currentSettings.milestone_reminders_enabled,
        deadline_alerts_enabled: currentSettings.deadline_alerts_enabled,
        motivation_quotes_enabled: currentSettings.motivation_quotes_enabled,
        preferred_nudge_time: currentSettings.preferred_nudge_time,
        preferred_timezone: currentSettings.preferred_timezone,
        nudge_frequency_days: currentSettings.nudge_frequency_days,
        max_daily_nudges: currentSettings.max_daily_nudges,
        quiet_hours_start: currentSettings.quiet_hours_start,
        quiet_hours_end: currentSettings.quiet_hours_end,
        weekend_nudges_enabled: currentSettings.weekend_nudges_enabled
      });
    } else if (currentSpace) {
      setSettings(prev => ({ ...prev, space_id: currentSpace.id }));
    }
  }, [currentSettings, currentSpace]);

  const handleSave = async () => {
    if (!user || !currentSpace) return;

    try {
      setLoading(true);
      const updatedSettings = await smartNudgesService.upsertNudgeSettings(
        user.id,
        settings
      );
      onSettingsUpdate?.(updatedSettings);
      toast.success('Nudge settings updated!');
    } catch (error) {
      logger.error('Failed to update settings:', error, { component: 'NudgeSettingsModal', action: 'component_action' });
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof CreateNudgeSettingsInput, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleChange = (key: keyof CreateNudgeSettingsInput, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto sm:flex sm:min-h-full sm:items-center sm:justify-center text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full sm:max-w-lg transform overflow-hidden sm:rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all h-full sm:h-auto flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-bold leading-6 text-gray-900 dark:text-white"
                      >
                        Nudge Settings
                      </Dialog.Title>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Customize your goal reminders and notifications
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                  {/* Global Toggle */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {settings.nudges_enabled ? (
                          <Volume2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Smart Nudges
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Enable intelligent goal reminders
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('nudges_enabled', !settings.nudges_enabled)}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          settings.nudges_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                            settings.nudges_enabled ? 'translate-x-6' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Nudge Types */}
                  {settings.nudges_enabled && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">Nudge Types</h4>

                      {/* Daily Nudges */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            Daily Check-ins
                          </label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Daily reminders to review your goals
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('daily_nudges_enabled', !settings.daily_nudges_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.daily_nudges_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                              settings.daily_nudges_enabled ? 'translate-x-5' : 'translate-x-1'
                            )}
                          />
                        </button>
                      </div>

                      {/* Weekly Summary */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            Weekly Summaries
                          </label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Weekly progress reports and insights
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('weekly_summary_enabled', !settings.weekly_summary_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.weekly_summary_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                              settings.weekly_summary_enabled ? 'translate-x-5' : 'translate-x-1'
                            )}
                          />
                        </button>
                      </div>

                      {/* Milestone Reminders */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            Milestone Reminders
                          </label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Celebrate achievements and milestones
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('milestone_reminders_enabled', !settings.milestone_reminders_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.milestone_reminders_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                              settings.milestone_reminders_enabled ? 'translate-x-5' : 'translate-x-1'
                            )}
                          />
                        </button>
                      </div>

                      {/* Deadline Alerts */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            Deadline Alerts
                          </label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Warnings for approaching deadlines
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('deadline_alerts_enabled', !settings.deadline_alerts_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.deadline_alerts_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                              settings.deadline_alerts_enabled ? 'translate-x-5' : 'translate-x-1'
                            )}
                          />
                        </button>
                      </div>

                      {/* Motivation Quotes */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            Motivation Boosts
                          </label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Inspirational messages and encouragement
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('motivation_quotes_enabled', !settings.motivation_quotes_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.motivation_quotes_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                              settings.motivation_quotes_enabled ? 'translate-x-5' : 'translate-x-1'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Timing Settings */}
                  {settings.nudges_enabled && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Timing</span>
                      </h4>

                      {/* Preferred Time */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Preferred Nudge Time
                        </label>
                        <input
                          type="time"
                          value={settings.preferred_nudge_time}
                          onChange={(e) => handleChange('preferred_nudge_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Frequency */}
                      <div className="relative z-50">
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Nudge Frequency (days)
                        </label>
                        <select
                          value={settings.nudge_frequency_days}
                          onChange={(e) => handleChange('nudge_frequency_days', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white relative z-50"
                          style={{ position: 'relative', zIndex: 9999 }}
                        >
                          <option value={1}>Every day</option>
                          <option value={2}>Every 2 days</option>
                          <option value={3}>Every 3 days</option>
                          <option value={7}>Weekly</option>
                        </select>
                      </div>

                      {/* Max Daily Nudges */}
                      <div className="relative z-50">
                        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Max Daily Nudges
                        </label>
                        <select
                          value={settings.max_daily_nudges}
                          onChange={(e) => handleChange('max_daily_nudges', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white relative z-50"
                          style={{ position: 'relative', zIndex: 9999 }}
                        >
                          <option value={1}>1 nudge</option>
                          <option value={2}>2 nudges</option>
                          <option value={3}>3 nudges</option>
                          <option value={5}>5 nudges</option>
                          <option value={10}>10 nudges</option>
                        </select>
                      </div>

                      {/* Weekend Nudges */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            Weekend Nudges
                          </label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Receive nudges on weekends
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('weekend_nudges_enabled', !settings.weekend_nudges_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.weekend_nudges_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                              settings.weekend_nudges_enabled ? 'translate-x-5' : 'translate-x-1'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}