'use client';

/**
 * Late Penalty Settings Component
 * Elegant Apple-style settings panel for managing late penalty configurations
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  Settings2,
  ChevronRight,
  Sparkles,
  Shield,
  Calendar,
  Minus,
  Plus,
  Check,
  X,
  Info,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { LatePenaltySettings as PenaltySettings } from '@/lib/services/rewards/late-penalty-service';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { cn } from '@/lib/utils';

interface LatePenaltySettingsProps {
  className?: string;
  onSettingsChange?: (settings: PenaltySettings) => void;
}

// Default settings matching the server
const DEFAULT_SETTINGS: PenaltySettings = {
  enabled: false,
  default_penalty_points: 5,
  default_grace_period_hours: 2,
  max_penalty_per_chore: 50,
  progressive_penalty: true,
  penalty_multiplier_per_day: 1.5,
  exclude_weekends: false,
  forgiveness_allowed: true,
};

export function LatePenaltySettings({ className, onSettingsChange }: LatePenaltySettingsProps) {
  const { currentSpace } = useSpaces();
  const [settings, setSettings] = useState<PenaltySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<PenaltySettings>(DEFAULT_SETTINGS);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch current settings
  const fetchSettings = useCallback(async () => {
    if (!currentSpace?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/penalties/settings?spaceId=${currentSpace.id}`);
      const data = await response.json();

      if (response.ok && data.settings) {
        setSettings(data.settings);
        setOriginalSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch penalty settings:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  // Save settings
  const handleSave = async () => {
    if (!currentSpace?.id || !hasChanges) return;

    try {
      setSaving(true);
      const response = await fetch('/api/penalties/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: currentSpace.id,
          settings,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOriginalSettings(settings);
        setHasChanges(false);
        setFeedback({ type: 'success', message: 'Settings saved successfully' });
        setTimeout(() => setFeedback(null), 3000);
        onSettingsChange?.(settings);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save settings'
      });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Reset to original
  const handleReset = () => {
    setSettings(originalSettings);
  };

  // Update a single setting
  const updateSetting = <K extends keyof PenaltySettings>(
    key: K,
    value: PenaltySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className={cn('rounded-2xl bg-gray-800 p-6', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl bg-gray-800 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Late Penalties</h3>
              <p className="text-sm text-gray-400">
                Encourage timely completion
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <button
            onClick={() => updateSetting('enabled', !settings.enabled)}
            className={cn(
              'relative w-14 h-8 rounded-full transition-colors duration-200',
              settings.enabled
                ? 'bg-amber-500'
                : 'bg-gray-600'
            )}
          >
            <motion.div
              className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ x: settings.enabled ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {settings.enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-6 space-y-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                {/* Default Penalty Points */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
                      <Minus className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Penalty Points</p>
                      <p className="text-xs text-gray-400">Per day late</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateSetting(
                          'default_penalty_points',
                          Math.max(1, settings.default_penalty_points - 1)
                        )
                      }
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold text-white">
                      {settings.default_penalty_points}
                    </span>
                    <button
                      onClick={() =>
                        updateSetting(
                          'default_penalty_points',
                          Math.min(50, settings.default_penalty_points + 1)
                        )
                      }
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grace Period */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Grace Period</p>
                      <p className="text-xs text-gray-400">Hours after due</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateSetting(
                          'default_grace_period_hours',
                          Math.max(0, settings.default_grace_period_hours - 1)
                        )
                      }
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold text-white">
                      {settings.default_grace_period_hours}h
                    </span>
                    <button
                      onClick={() =>
                        updateSetting(
                          'default_grace_period_hours',
                          Math.min(48, settings.default_grace_period_hours + 1)
                        )
                      }
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Max Penalty */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-900/30 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Max Penalty</p>
                      <p className="text-xs text-gray-400">Points cap</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateSetting(
                          'max_penalty_per_chore',
                          Math.max(10, settings.max_penalty_per_chore - 10)
                        )
                      }
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold text-white">
                      {settings.max_penalty_per_chore}
                    </span>
                    <button
                      onClick={() =>
                        updateSetting(
                          'max_penalty_per_chore',
                          Math.min(200, settings.max_penalty_per_chore + 10)
                        )
                      }
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-gray-700/50 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings2 className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-300">
                    Advanced Settings
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: showAdvanced ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </motion.div>
              </button>

              {/* Advanced Settings Panel */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Progressive Penalty */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <div>
                          <p className="font-medium text-white">
                            Progressive Penalty
                          </p>
                          <p className="text-xs text-gray-400">
                            Penalty increases each day
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          updateSetting('progressive_penalty', !settings.progressive_penalty)
                        }
                        className={cn(
                          'relative w-12 h-7 rounded-full transition-colors duration-200',
                          settings.progressive_penalty
                            ? 'bg-amber-500'
                            : 'bg-gray-600'
                        )}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm"
                          animate={{ x: settings.progressive_penalty ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    {/* Multiplier (only if progressive) */}
                    {settings.progressive_penalty && (
                      <div className="flex items-center justify-between py-2 pl-8">
                        <p className="text-sm text-gray-400">
                          Daily multiplier
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateSetting(
                                'penalty_multiplier_per_day',
                                Math.max(1.1, settings.penalty_multiplier_per_day - 0.1)
                              )
                            }
                            className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-12 text-center font-medium text-white">
                            {settings.penalty_multiplier_per_day.toFixed(1)}x
                          </span>
                          <button
                            onClick={() =>
                              updateSetting(
                                'penalty_multiplier_per_day',
                                Math.min(3, settings.penalty_multiplier_per_day + 0.1)
                              )
                            }
                            className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Exclude Weekends */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium text-white">
                            Exclude Weekends
                          </p>
                          <p className="text-xs text-gray-400">
                            No penalties on Sat/Sun
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          updateSetting('exclude_weekends', !settings.exclude_weekends)
                        }
                        className={cn(
                          'relative w-12 h-7 rounded-full transition-colors duration-200',
                          settings.exclude_weekends
                            ? 'bg-green-500'
                            : 'bg-gray-600'
                        )}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm"
                          animate={{ x: settings.exclude_weekends ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    {/* Allow Forgiveness */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-white">
                            Allow Forgiveness
                          </p>
                          <p className="text-xs text-gray-400">
                            Admins can refund penalties
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          updateSetting('forgiveness_allowed', !settings.forgiveness_allowed)
                        }
                        className={cn(
                          'relative w-12 h-7 rounded-full transition-colors duration-200',
                          settings.forgiveness_allowed
                            ? 'bg-blue-500'
                            : 'bg-gray-600'
                        )}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm"
                          animate={{ x: settings.forgiveness_allowed ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Info Box */}
              <div className="flex gap-3 p-4 rounded-xl bg-amber-900/20 border border-amber-800/50">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200">
                  <p className="font-medium mb-1">How penalties work</p>
                  <p className="text-amber-300">
                    When a chore with penalty enabled is completed late, points are deducted.
                    {settings.progressive_penalty
                      ? ` Penalty starts at ${settings.default_penalty_points} points and increases by ${settings.penalty_multiplier_per_day}x each day.`
                      : ` A flat penalty of ${settings.default_penalty_points} points per day is applied.`}
                    {' '}Maximum deduction is capped at {settings.max_penalty_per_chore} points.
                  </p>
                </div>
              </div>

              {/* Feedback Message */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl',
                      feedback.type === 'success'
                        ? 'bg-green-900/20 text-green-400'
                        : 'bg-red-900/20 text-red-400'
                    )}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{feedback.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Save/Reset Buttons */}
              <AnimatePresence>
                {hasChanges && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex gap-3 pt-2"
                  >
                    <button
                      onClick={handleReset}
                      disabled={saving}
                      className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reset
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium hover:from-amber-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disabled State */}
      {!settings.enabled && (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-gray-400">
            Enable late penalties to encourage timely chore completion
          </p>
        </div>
      )}
    </div>
  );
}

export default LatePenaltySettings;
