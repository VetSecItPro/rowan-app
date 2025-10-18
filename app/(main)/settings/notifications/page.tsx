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

  // Form state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailDueReminders, setEmailDueReminders] = useState(true);
  const [emailAssignments, setEmailAssignments] = useState(true);
  const [emailMentions, setEmailMentions] = useState(true);
  const [emailComments, setEmailComments] = useState(false);

  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [inAppDueReminders, setInAppDueReminders] = useState(true);
  const [inAppAssignments, setInAppAssignments] = useState(true);
  const [inAppMentions, setInAppMentions] = useState(true);
  const [inAppComments, setInAppComments] = useState(true);

  const [notificationFrequency, setNotificationFrequency] = useState<'instant' | 'hourly' | 'daily' | 'never'>('instant');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

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
        setInAppEnabled(subscribed);
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
          setEmailEnabled(prefs.email_enabled);
          setEmailDueReminders(prefs.email_due_reminders);
          setEmailAssignments(prefs.email_assignments);
          setEmailMentions(prefs.email_mentions);
          setEmailComments(prefs.email_comments);

          setInAppEnabled(prefs.in_app_enabled);
          setInAppDueReminders(prefs.in_app_due_reminders);
          setInAppAssignments(prefs.in_app_assignments);
          setInAppMentions(prefs.in_app_mentions);
          setInAppComments(prefs.in_app_comments);

          setNotificationFrequency(prefs.notification_frequency);
          setQuietHoursEnabled(prefs.quiet_hours_enabled);
          if (prefs.quiet_hours_start) setQuietHoursStart(prefs.quiet_hours_start);
          if (prefs.quiet_hours_end) setQuietHoursEnd(prefs.quiet_hours_end);
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

    try {
      setIsSubscribing(true);

      if (enabled) {
        // Subscribe to push
        await pushSubscriptionService.subscribe(user.id, currentSpace?.id);
        setIsPushSubscribed(true);
        setInAppEnabled(true);
      } else {
        // Unsubscribe from push
        await pushSubscriptionService.unsubscribe(user.id);
        setIsPushSubscribed(false);
        setInAppEnabled(false);
      }
    } catch (error) {
      console.error('Error toggling push subscription:', error);
      alert('Failed to update push notification settings. Please try again.');
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
          email_enabled: emailEnabled,
          email_due_reminders: emailDueReminders,
          email_assignments: emailAssignments,
          email_mentions: emailMentions,
          email_comments: emailComments,
          in_app_enabled: inAppEnabled,
          in_app_due_reminders: inAppDueReminders,
          in_app_assignments: inAppAssignments,
          in_app_mentions: inAppMentions,
          in_app_comments: inAppComments,
          notification_frequency: notificationFrequency,
          quiet_hours_enabled: quietHoursEnabled,
          quiet_hours_start: quietHoursEnabled ? quietHoursStart : undefined,
          quiet_hours_end: quietHoursEnabled ? quietHoursEnd : undefined,
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
              className="btn-touch inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 mb-4 rounded-md active:scale-95 hover-lift shimmer-pink active-press"
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
                  Manage how you receive reminder notifications
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                  </div>
                  <div className="space-y-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-40 mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-56" />
                        </div>
                        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Success Message */}
              {successMessage && (
                <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
                  {successMessage}
                </div>
              )}

              <div className="space-y-6">
                {/* Email Notifications */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Mail className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Email Notifications
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Master Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Enable Email Notifications</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Receive notifications via email</div>
                      </div>
                      <Toggle
                        id="email-enabled"
                        checked={emailEnabled}
                        onChange={setEmailEnabled}
                        color="purple"
                      />
                    </div>

                    {/* Type-specific toggles */}
                    {emailEnabled && (
                      <div className="pl-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-gray-700 dark:text-gray-300">Task assignments</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Get notified when someone assigns you a task</div>
                          </div>
                          <Toggle
                            id="email-assignments"
                            checked={emailAssignments}
                            onChange={setEmailAssignments}
                            color="purple"
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-gray-700 dark:text-gray-300">Due reminders</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Reminders for upcoming and overdue items</div>
                          </div>
                          <Toggle
                            id="email-due-reminders"
                            checked={emailDueReminders}
                            onChange={setEmailDueReminders}
                            color="purple"
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-gray-700 dark:text-gray-300">@Mentions</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">When someone mentions you in a comment</div>
                          </div>
                          <Toggle
                            id="email-mentions"
                            checked={emailMentions}
                            onChange={setEmailMentions}
                            color="purple"
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-gray-700 dark:text-gray-300">Comments</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">New comments on items you're following</div>
                          </div>
                          <Toggle
                            id="email-comments"
                            checked={emailComments}
                            onChange={setEmailComments}
                            color="purple"
                            size="sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Bell className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Push Notifications
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* Master Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Enable push notifications</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {isPushSupported
                            ? 'Allow browser notifications for real-time alerts'
                            : 'Push notifications not supported in this browser'}
                        </div>
                      </div>
                      <Toggle
                        id="push-enabled"
                        checked={isPushSubscribed}
                        onChange={handlePushToggle}
                        color="purple"
                        disabled={!isPushSupported || isSubscribing}
                      />
                    </div>

                    {/* Type-specific toggles */}
                    {isPushSubscribed && (
                      <div className="pl-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-gray-700 dark:text-gray-300">Task assignments</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Browser notifications for task updates</div>
                          </div>
                          <Toggle
                            id="push-assignments"
                            checked={inAppAssignments}
                            onChange={setInAppAssignments}
                            color="purple"
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-gray-700 dark:text-gray-300">Due reminders</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Push notifications for upcoming items</div>
                          </div>
                          <Toggle
                            id="push-due-reminders"
                            checked={inAppDueReminders}
                            onChange={setInAppDueReminders}
                            color="purple"
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-gray-700 dark:text-gray-300">@Mentions & comments</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Notifications for mentions and comments</div>
                          </div>
                          <Toggle
                            id="push-mentions"
                            checked={inAppMentions}
                            onChange={setInAppMentions}
                            color="purple"
                            size="sm"
                          />
                        </div>
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-green-700 dark:text-green-300">
                            <strong>Active:</strong> You'll receive push notifications based on your preferences and quiet hours settings.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notification Frequency */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Notification Frequency
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {(['instant', 'hourly', 'daily', 'never'] as const).map((freq) => (
                      <label key={freq} className="btn-touch flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer active:scale-[0.98] hover-lift shimmer-pink active-press">
                        <input
                          type="radio"
                          name="frequency"
                          value={freq}
                          checked={notificationFrequency === freq}
                          onChange={() => setNotificationFrequency(freq)}
                          className="w-4 h-4 text-pink-600 focus:ring-pink-500 focus:ring-2 notification-radio notification-magnetic-hover notification-ripple-effect"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white capitalize">{freq}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {freq === 'instant' && 'Get notified immediately when events occur'}
                            {freq === 'hourly' && 'Receive a digest of notifications every hour'}
                            {freq === 'daily' && 'Get a daily summary of all notifications'}
                            {freq === 'never' && 'Turn off all notifications'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quiet Hours */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Moon className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Quiet Hours
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Enable Quiet Hours</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Pause notifications during specific hours</div>
                      </div>
                      <Toggle
                        id="quiet-hours-enabled"
                        checked={quietHoursEnabled}
                        onChange={setQuietHoursEnabled}
                        color="purple"
                      />
                    </div>

                    {quietHoursEnabled && (
                      <div className="pl-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-700">
                        <div>
                          <label htmlFor="quiet-hours-start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                            Start Time
                          </label>
                          <input
                            id="quiet-hours-start"
                            type="time"
                            value={quietHoursStart}
                            onChange={(e) => setQuietHoursStart(e.target.value)}
                            className="w-full px-3 sm:px-4 py-3 text-base min-h-[48px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 notification-time-input notification-magnetic-hover notification-ripple-effect hover-lift shimmer-pink"
                          />
                        </div>
                        <div>
                          <label htmlFor="quiet-hours-end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                            End Time
                          </label>
                          <input
                            id="quiet-hours-end"
                            type="time"
                            value={quietHoursEnd}
                            onChange={(e) => setQuietHoursEnd(e.target.value)}
                            className="w-full px-3 sm:px-4 py-3 text-base min-h-[48px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 notification-time-input notification-magnetic-hover notification-ripple-effect hover-lift shimmer-pink"
                          />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Notifications won't be sent during quiet hours, but will still appear in your notification center.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-touch flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-95 hover-lift shimmer-pink active-press focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
