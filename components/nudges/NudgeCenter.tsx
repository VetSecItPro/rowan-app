'use client';

import { useState, useEffect } from 'react';
import { Bell, Settings, BarChart3, RefreshCw, Lightbulb } from 'lucide-react';
import { NudgeCard } from './NudgeCard';
import { NudgeSettingsModal } from './NudgeSettingsModal';
import { NudgeAnalytics } from './NudgeAnalytics';
import { logger } from '@/lib/logger';
import {
  smartNudgesService,
  SmartNudge,
  NudgeSettings
} from '@/lib/services/smart-nudges-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NudgeCenterProps {
  className?: string;
  limit?: number;
  showHeader?: boolean;
  showSettings?: boolean;
  showAnalytics?: boolean;
  onGoalClick?: (goalId: string) => void;
}

/** Renders the nudge center panel with prioritized AI suggestions. */
export function NudgeCenter({
  className,
  limit = 10,
  showHeader = true,
  showSettings = true,
  showAnalytics = true,
  onGoalClick
}: NudgeCenterProps) {
  const { user, currentSpace } = useAuth();
  const [nudges, setNudges] = useState<SmartNudge[]>([]);
  const [settings, setSettings] = useState<NudgeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  useEffect(() => {
    if (user && currentSpace) {
      loadNudges();
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load functions are stable
  }, [user, currentSpace, limit]);

  const loadNudges = async () => {
    if (!user || !currentSpace) return;

    try {
      setLoading(true);
      const data = await smartNudgesService.getSmartNudges(
        user.id,
        currentSpace.id,
        limit
      );
      setNudges(data);
    } catch (error) {
      logger.error('Failed to load nudges:', error, { component: 'NudgeCenter', action: 'component_action' });
      toast.error('Failed to load nudges');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!user || !currentSpace) return;

    try {
      const data = await smartNudgesService.getNudgeSettings(
        user.id,
        currentSpace.id
      );
      setSettings(data);
    } catch (error) {
      logger.error('Failed to load nudge settings:', error, { component: 'NudgeCenter', action: 'component_action' });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNudges();
    setRefreshing(false);
    toast.success('Nudges refreshed!');
  };

  const handleNudgeAction = async (nudgeId: string, action: 'clicked' | 'dismissed' | 'snoozed') => {
    if (!user || !currentSpace) return;

    try {
      const nudge = nudges.find(n => n.nudge_id === nudgeId);
      if (!nudge) return;

      // Record the nudge history
      const historyEntry = await smartNudgesService.recordNudgeHistory(
        user.id,
        currentSpace.id,
        nudge
      );

      // Mark appropriate action
      switch (action) {
        case 'clicked':
          await smartNudgesService.markNudgeAsClicked(historyEntry.id, true);
          break;
        case 'dismissed':
          await smartNudgesService.dismissNudge(historyEntry.id);
          break;
        case 'snoozed':
          if (nudge.goal_id) {
            await smartNudgesService.snoozeGoalNudges(nudge.goal_id, user.id, 24);
          }
          await smartNudgesService.dismissNudge(historyEntry.id);
          break;
      }

      // Remove nudge from current list
      setNudges(prev => prev.filter(n => n.nudge_id !== nudgeId));

      // Show appropriate toast
      switch (action) {
        case 'clicked':
          toast.success('Great! Keep up the momentum!');
          break;
        case 'dismissed':
          toast.info('Nudge dismissed');
          break;
        case 'snoozed':
          toast.info('Nudge snoozed for 24 hours');
          break;
      }
    } catch (error) {
      logger.error('Failed to handle nudge action:', error, { component: 'NudgeCenter', action: 'component_action' });
      toast.error('Failed to process action');
    }
  };

  const handleGoalClick = (goalId: string) => {
    onGoalClick?.(goalId);
  };

  const handleSettingsUpdate = async (updatedSettings: NudgeSettings) => {
    setSettings(updatedSettings);
    setShowSettingsModal(false);
    toast.success('Nudge settings updated!');

    // Refresh nudges with new settings
    await loadNudges();
  };

  // Filter nudges based on settings
  const filteredNudges = nudges.filter(nudge => {
    if (!settings) return true;

    // Check if nudges are enabled
    if (!settings.nudges_enabled) return false;

    // Check category-specific settings
    switch (nudge.category) {
      case 'reminder':
        return settings.daily_nudges_enabled;
      case 'summary':
        return settings.weekly_summary_enabled;
      case 'milestone':
        return settings.milestone_reminders_enabled;
      case 'deadline':
        return settings.deadline_alerts_enabled;
      case 'motivation':
        return settings.motivation_quotes_enabled;
      default:
        return true;
    }
  });

  // Group nudges by priority and category
  const priorityNudges = filteredNudges.filter(n => n.priority >= 3);
  const regularNudges = filteredNudges.filter(n => n.priority < 3);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {showHeader && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-lg animate-pulse" />
              <div>
                <div className="w-24 h-4 bg-gray-700 rounded animate-pulse" />
                <div className="w-32 h-3 bg-gray-700 rounded animate-pulse mt-1" />
              </div>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Smart Nudges
              </h2>
              <p className="text-sm text-gray-400">
                {filteredNudges.length > 0
                  ? `${filteredNudges.length} suggestion${filteredNudges.length !== 1 ? 's' : ''} for you`
                  : 'You\'re all caught up!'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              title="Refresh nudges"
            >
              <RefreshCw className={cn(
                'w-4 h-4 text-gray-400',
                refreshing && 'animate-spin'
              )} />
            </button>

            {showAnalytics && (
              <button
                onClick={() => setShowAnalyticsModal(true)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                title="View analytics"
              >
                <BarChart3 className="w-4 h-4 text-gray-400" />
              </button>
            )}

            {showSettings && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                title="Nudge settings"
              >
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Priority Nudges */}
      {priorityNudges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white flex items-center space-x-2">
            <span>🔥 Priority</span>
          </h3>
          <div className="space-y-3">
            {priorityNudges.map((nudge) => (
              <NudgeCard
                key={nudge.nudge_id}
                nudge={nudge}
                onAction={handleNudgeAction}
                onGoalClick={handleGoalClick}
                size="medium"
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Nudges */}
      {regularNudges.length > 0 && (
        <div className="space-y-3">
          {priorityNudges.length > 0 && (
            <h3 className="text-sm font-medium text-white">
              Suggestions
            </h3>
          )}
          <div className="space-y-3">
            {regularNudges.map((nudge) => (
              <NudgeCard
                key={nudge.nudge_id}
                nudge={nudge}
                onAction={handleNudgeAction}
                onGoalClick={handleGoalClick}
                size="medium"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredNudges.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            All caught up!
          </h3>
          <p className="text-gray-400 max-w-md mx-auto">
            {settings?.nudges_enabled
              ? "You're doing great! No new nudges right now. Keep working on your goals and we'll help you stay on track."
              : "Smart nudges are disabled. Enable them in settings to get personalized suggestions."
            }
          </p>
          {!settings?.nudges_enabled && showSettings && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Enable Nudges
            </button>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <NudgeSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          currentSettings={settings}
          onSettingsUpdate={handleSettingsUpdate}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <NudgeAnalytics
          isOpen={showAnalyticsModal}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}
    </div>
  );
}