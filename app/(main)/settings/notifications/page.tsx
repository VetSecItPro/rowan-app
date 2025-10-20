'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Bell, Mail, Smartphone, Clock, Moon, Save, ArrowLeft } from 'lucide-react';
import { reminderNotificationsService, NotificationPreferences } from '@/lib/services/reminder-notifications-service';
import { pushSubscriptionService } from '@/lib/services/push-subscription-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { Toggle } from '@/components/ui/Toggle';
import Link from 'next/link';

export default function NotificationSettingsPage() {
  const { user, currentSpace } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state - using correct database field names
  const [emailTaskAssignments, setEmailTaskAssignments] = useState(true);
  const [emailEventReminders, setEmailEventReminders] = useState(true);
  const [emailNewMessages, setEmailNewMessages] = useState(true);
  const [emailShoppingLists, setEmailShoppingLists] = useState(true);
  const [emailMealReminders, setEmailMealReminders] = useState(true);
  const [emailGeneralReminders, setEmailGeneralReminders] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState<'realtime' | 'daily' | 'weekly'>('daily');

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushTaskUpdates, setPushTaskUpdates] = useState(true);
  const [pushReminders, setPushReminders] = useState(true);
  const [pushMessages, setPushMessages] = useState(true);
  const [pushShoppingUpdates, setPushShoppingUpdates] = useState(true);
  const [pushEventAlerts, setPushEventAlerts] = useState(true);

  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00:00');
  const [timezone, setTimezone] = useState('UTC');

  // Push subscription state
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Check push support and subscription status
  useEffect(() => {
    const checkPushSupport = async () => {
      const supported = pushSubscriptionService.isSupported();
      setIsPushSupported(supported);

      if (supported && user) {
        const subscribed = await pushSubscriptionService.isSubscribed(user.id);
        setIsPushSubscribed(subscribed);
        setPushEnabled(subscribed);
      }
    };

    checkPushSupport();
  }, [user]);

  // Fetch preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user || !currentSpace) return;

      try {
        setLoading(true);
        const prefs = await reminderNotificationsService.getPreferences(user.id, currentSpace.id);

        if (prefs) {
          setPreferences(prefs);
          // Email preferences - using correct database field names
          setEmailTaskAssignments(prefs.email_task_assignments);
          setEmailEventReminders(prefs.email_event_reminders);
          setEmailNewMessages(prefs.email_new_messages);
          setEmailShoppingLists(prefs.email_shopping_lists);
          setEmailMealReminders(prefs.email_meal_reminders);
          setEmailGeneralReminders(prefs.email_general_reminders);
          setDigestFrequency(prefs.digest_frequency as any);

          // Push preferences - using correct database field names
          setPushEnabled(prefs.push_enabled);
          setPushTaskUpdates(prefs.push_task_updates);
          setPushReminders(prefs.push_reminders);
          setPushMessages(prefs.push_messages);
          setPushShoppingUpdates(prefs.push_shopping_updates);
          setPushEventAlerts(prefs.push_event_alerts);

          // Quiet hours
          setQuietHoursEnabled(prefs.quiet_hours_enabled);
          if (prefs.quiet_hours_start) setQuietHoursStart(prefs.quiet_hours_start);
          if (prefs.quiet_hours_end) setQuietHoursEnd(prefs.quiet_hours_end);
          if (prefs.timezone) setTimezone(prefs.timezone);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user, currentSpace]);

  // Handle push subscription toggle
  const handlePushToggle = async (enabled: boolean) => {
    if (!user) return;

    setIsSubscribing(true);
    try {
      if (enabled) {
        const result = await pushSubscriptionService.subscribe(user.id);
        if (result) {
          setIsPushSubscribed(true);
          setPushEnabled(true);
        } else {
          alert('Failed to enable push notifications. Please check your browser permissions.');
          setPushEnabled(false);
        }
      } else {
        await pushSubscriptionService.unsubscribe(user.id);
        setIsPushSubscribed(false);
        setPushEnabled(false);
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      alert('Failed to update push notification settings.');
      setPushEnabled(!enabled);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Save preferences
  const handleSave = async () => {
    if (!user || !currentSpace) return;

    try {
      setSaving(true);
      await reminderNotificationsService.updatePreferences(
        user.id,
        currentSpace.id,
        {
          // Email preferences - using correct database field names
          email_task_assignments: emailTaskAssignments,
          email_event_reminders: emailEventReminders,
          email_new_messages: emailNewMessages,
          email_shopping_lists: emailShoppingLists,
          email_meal_reminders: emailMealReminders,
          email_general_reminders: emailGeneralReminders,
          digest_frequency: digestFrequency,

          // Push preferences - using correct database field names
          push_enabled: pushEnabled,
          push_task_updates: pushTaskUpdates,
          push_reminders: pushReminders,
          push_messages: pushMessages,
          push_shopping_updates: pushShoppingUpdates,
          push_event_alerts: pushEventAlerts,

          // Quiet hours
          quiet_hours_enabled: quietHoursEnabled,
          quiet_hours_start: quietHoursEnabled ? quietHoursStart : undefined,
          quiet_hours_end: quietHoursEnabled ? quietHoursEnd : undefined,
          timezone: timezone,
        }
      );

      setSuccessMessage('Notification preferences saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user || !currentSpace) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-gray-600 dark:text-gray-400">Please log in to manage notification settings.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings"
              className="btn-touch inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 mb-4 rounded-md active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Link>

            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Notification Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Choose how you want to be notified about updates
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                {successMessage}
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Email Notifications */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Mail className="w-5 h-5 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Email Notifications</h2>
                </div>

                <div className="space-y-4">
                  <Toggle
                    id="email-task-assignments"
                    checked={emailTaskAssignments}
                    onChange={setEmailTaskAssignments}
                    label="Task assignments"
                    description="Get notified when someone assigns you a task"
                  />

                  <Toggle
                    id="email-event-reminders"
                    checked={emailEventReminders}
                    onChange={setEmailEventReminders}
                    label="Event reminders"
                    description="Receive email reminders for upcoming events"
                  />

                  <Toggle
                    id="email-new-messages"
                    checked={emailNewMessages}
                    onChange={setEmailNewMessages}
                    label="New messages"
                    description="Get notified about new messages"
                  />

                  <Toggle
                    id="email-shopping-lists"
                    checked={emailShoppingLists}
                    onChange={setEmailShoppingLists}
                    label="Shopping lists"
                    description="Notifications when shopping lists are ready"
                  />

                  <Toggle
                    id="email-meal-reminders"
                    checked={emailMealReminders}
                    onChange={setEmailMealReminders}
                    label="Meal reminders"
                    description="Reminders for meal prep and cooking"
                  />

                  <Toggle
                    id="email-general-reminders"
                    checked={emailGeneralReminders}
                    onChange={setEmailGeneralReminders}
                    label="General reminders"
                    description="Get notified about general tasks and reminders"
                  />

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email digest frequency
                    </label>
                    <select
                      value={digestFrequency}
                      onChange={(e) => setDigestFrequency(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="realtime">Real-time</option>
                      <option value="daily">Daily digest</option>
                      <option value="weekly">Weekly digest</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Push Notifications */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Push Notifications</h2>
                </div>

                <div className="space-y-4">
                  {!isPushSupported ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Push notifications are not supported in your browser.
                    </p>
                  ) : (
                    <>
                      <Toggle
                        id="push-enabled"
                        checked={pushEnabled}
                        onChange={handlePushToggle}
                        disabled={isSubscribing}
                        label="Enable push notifications"
                        description="Receive instant notifications on your device"
                      />

                      {pushEnabled && (
                        <>
                          <Toggle
                            id="push-reminders"
                            checked={pushReminders}
                            onChange={setPushReminders}
                            label="Task reminders"
                            description="Push notifications for task deadlines"
                          />

                          <Toggle
                            id="push-task-updates"
                            checked={pushTaskUpdates}
                            onChange={setPushTaskUpdates}
                            label="Task updates"
                            description="Get notified about task changes"
                          />

                          <Toggle
                            id="push-messages"
                            checked={pushMessages}
                            onChange={setPushMessages}
                            label="New messages"
                            description="Instant notifications for new messages"
                          />

                          <Toggle
                            id="push-shopping-updates"
                            checked={pushShoppingUpdates}
                            onChange={setPushShoppingUpdates}
                            label="Shopping updates"
                            description="Updates on shopping list changes"
                          />

                          <Toggle
                            id="push-event-alerts"
                            checked={pushEventAlerts}
                            onChange={setPushEventAlerts}
                            label="Event alerts"
                            description="Push notifications for upcoming events"
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Moon className="w-5 h-5 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quiet Hours</h2>
                </div>

                <div className="space-y-4">
                  <Toggle
                    id="quiet-hours-enabled"
                    checked={quietHoursEnabled}
                    onChange={setQuietHoursEnabled}
                    label="Enable quiet hours"
                    description="Pause notifications during specific hours"
                  />

                  {quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start time
                        </label>
                        <input
                          type="time"
                          value={quietHoursStart.slice(0, 5)}
                          onChange={(e) => setQuietHoursStart(e.target.value + ':00')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End time
                        </label>
                        <input
                          type="time"
                          value={quietHoursEnd.slice(0, 5)}
                          onChange={(e) => setQuietHoursEnd(e.target.value + ':00')}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-touch px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}