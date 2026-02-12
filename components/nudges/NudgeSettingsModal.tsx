'use client';

import { useState, useEffect } from 'react';
import { Clock, Volume2, VolumeX } from 'lucide-react';
import { logger } from '@/lib/logger';
import {
  smartNudgesService,
  NudgeSettings,
  CreateNudgeSettingsInput
} from '@/lib/services/smart-nudges-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

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

  const footerContent = (
    <div className="flex gap-3">
      <button
        onClick={onClose}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={loading}
        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nudge Settings"
      subtitle="Customize your goal reminders and notifications"
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-blue-500 to-purple-600"
      footer={footerContent}
    >
      <div className="space-y-6">
                  {/* Global Toggle */}
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {settings.nudges_enabled ? (
                          <Volume2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <h4 className="font-medium text-white">
                            Smart Nudges
                          </h4>
                          <p className="text-sm text-gray-400">
                            Enable intelligent goal reminders
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('nudges_enabled', !settings.nudges_enabled)}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          settings.nudges_enabled ? 'bg-blue-600' : 'bg-gray-600'
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
                      <h4 className="font-medium text-white">Nudge Types</h4>

                      {/* Daily Nudges */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-white">
                            Daily Check-ins
                          </label>
                          <p className="text-xs text-gray-400">
                            Daily reminders to review your goals
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('daily_nudges_enabled', !settings.daily_nudges_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.daily_nudges_enabled ? 'bg-blue-600' : 'bg-gray-600'
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
                          <label className="text-sm font-medium text-white">
                            Weekly Summaries
                          </label>
                          <p className="text-xs text-gray-400">
                            Weekly progress reports and insights
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('weekly_summary_enabled', !settings.weekly_summary_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.weekly_summary_enabled ? 'bg-blue-600' : 'bg-gray-600'
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
                          <label className="text-sm font-medium text-white">
                            Milestone Reminders
                          </label>
                          <p className="text-xs text-gray-400">
                            Celebrate achievements and milestones
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('milestone_reminders_enabled', !settings.milestone_reminders_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.milestone_reminders_enabled ? 'bg-blue-600' : 'bg-gray-600'
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
                          <label className="text-sm font-medium text-white">
                            Deadline Alerts
                          </label>
                          <p className="text-xs text-gray-400">
                            Warnings for approaching deadlines
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('deadline_alerts_enabled', !settings.deadline_alerts_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.deadline_alerts_enabled ? 'bg-blue-600' : 'bg-gray-600'
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
                          <label className="text-sm font-medium text-white">
                            Motivation Boosts
                          </label>
                          <p className="text-xs text-gray-400">
                            Inspirational messages and encouragement
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('motivation_quotes_enabled', !settings.motivation_quotes_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.motivation_quotes_enabled ? 'bg-blue-600' : 'bg-gray-600'
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
                      <h4 className="font-medium text-white flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Timing</span>
                      </h4>

                      {/* Preferred Time */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Preferred Nudge Time
                        </label>
                        <input
                          type="time"
                          value={settings.preferred_nudge_time}
                          onChange={(e) => handleChange('preferred_nudge_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                        />
                      </div>

                      {/* Frequency */}
                      <div className="relative z-50">
                        <label className="block text-sm font-medium text-white mb-2">
                          Nudge Frequency (days)
                        </label>
                        <select
                          value={settings.nudge_frequency_days}
                          onChange={(e) => handleChange('nudge_frequency_days', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white relative z-50"
                          style={{ position: 'relative' }}
                        >
                          <option value={1}>Every day</option>
                          <option value={2}>Every 2 days</option>
                          <option value={3}>Every 3 days</option>
                          <option value={7}>Weekly</option>
                        </select>
                      </div>

                      {/* Max Daily Nudges */}
                      <div className="relative z-50">
                        <label className="block text-sm font-medium text-white mb-2">
                          Max Daily Nudges
                        </label>
                        <select
                          value={settings.max_daily_nudges}
                          onChange={(e) => handleChange('max_daily_nudges', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white relative z-50"
                          style={{ position: 'relative' }}
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
                          <label className="text-sm font-medium text-white">
                            Weekend Nudges
                          </label>
                          <p className="text-xs text-gray-400">
                            Receive nudges on weekends
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('weekend_nudges_enabled', !settings.weekend_nudges_enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            settings.weekend_nudges_enabled ? 'bg-blue-600' : 'bg-gray-600'
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
    </Modal>
  );
}