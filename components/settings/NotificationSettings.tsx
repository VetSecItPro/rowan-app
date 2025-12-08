'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  Moon,
  Sun,
  Calendar,
  CheckSquare,
  MessageCircle,
  AtSign,
  Users,
  Loader2,
  Save,
  AlertCircle,
  Info,
  BellRing,
  BellOff,
  Send,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { pushService } from '@/lib/services/push-service';

interface NotificationPreferences {
  id: string;
  user_id: string;
  space_id: string | null;
  // Email notifications
  email_enabled: boolean;
  email_due_reminders: boolean;
  email_assignments: boolean;
  email_mentions: boolean;
  email_comments: boolean;
  // In-app notifications
  in_app_enabled: boolean;
  in_app_due_reminders: boolean;
  in_app_assignments: boolean;
  in_app_mentions: boolean;
  in_app_comments: boolean;
  // Notification frequency
  notification_frequency: 'instant' | 'hourly' | 'daily';
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  // Daily digest
  digest_enabled: boolean;
  digest_time: string | null;
  digest_timezone: string;
}

const defaultPreferences: Omit<NotificationPreferences, 'id' | 'user_id' | 'space_id'> = {
  email_enabled: true,
  email_due_reminders: true,
  email_assignments: true,
  email_mentions: true,
  email_comments: false,
  in_app_enabled: true,
  in_app_due_reminders: true,
  in_app_assignments: true,
  in_app_mentions: true,
  in_app_comments: true,
  notification_frequency: 'instant',
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  digest_enabled: false,
  digest_time: '07:00',
  digest_timezone: 'America/Chicago'
};

// Toggle component
const Toggle = memo(function Toggle({
  enabled,
  onChange,
  disabled = false
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        ${enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
});

// Section component
const Section = memo(function Section({
  title,
  description,
  icon: Icon,
  children
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-4">{children}</div>
    </div>
  );
});

// Setting row component
const SettingRow = memo(function SettingRow({
  label,
  description,
  icon: Icon,
  children
}: {
  label: string;
  description?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && (
          <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
});

// Time picker component
const TimePicker = memo(function TimePicker({
  value,
  onChange,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
        bg-white dark:bg-gray-700 text-gray-900 dark:text-white
        focus:ring-2 focus:ring-purple-500 focus:border-transparent
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    />
  );
});

// Timezone selector
const TimezoneSelector = memo(function TimezoneSelector({
  value,
  onChange,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const timezones = [
    { value: 'America/New_York', label: 'Eastern (ET)' },
    { value: 'America/Chicago', label: 'Central (CT)' },
    { value: 'America/Denver', label: 'Mountain (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
    { value: 'America/Anchorage', label: 'Alaska (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
        bg-white dark:bg-gray-700 text-gray-900 dark:text-white
        focus:ring-2 focus:ring-purple-500 focus:border-transparent
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {timezones.map((tz) => (
        <option key={tz.value} value={tz.value}>
          {tz.label}
        </option>
      ))}
    </select>
  );
});


export function NotificationSettings() {
  const { user, currentSpace } = useAuthWithSpaces();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushTestLoading, setPushTestLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushTestSuccess, setPushTestSuccess] = useState(false);

  // Load preferences
  useEffect(() => {
    async function loadPreferences() {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setPreferences(data);
        } else {
          // Create default preferences
          const newPrefs = {
            user_id: user.id,
            space_id: currentSpace?.id || null,
            ...defaultPreferences
          };

          const { data: created, error: createError } = await supabase
            .from('user_notification_preferences')
            .insert(newPrefs)
            .select()
            .single();

          if (createError) throw createError;
          setPreferences(created);
        }
      } catch (err) {
        console.error('Error loading notification preferences:', err);
        setError('Failed to load notification preferences');
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, [user, currentSpace?.id]);

  // Initialize push notifications
  useEffect(() => {
    async function initPush() {
      const supported = pushService.isSupported();
      setPushSupported(supported);

      if (supported) {
        setPushPermission(pushService.getPermissionStatus());
        const subscription = await pushService.getCurrentSubscription();
        setPushSubscribed(!!subscription);
      }
    }

    initPush();
  }, []);

  // Handle push subscription toggle
  const handlePushToggle = useCallback(async () => {
    setPushLoading(true);
    setPushError(null);

    try {
      if (pushSubscribed) {
        // Unsubscribe
        const success = await pushService.unsubscribe();
        if (success) {
          setPushSubscribed(false);
        } else {
          setPushError('Failed to disable push notifications');
        }
      } else {
        // Subscribe
        const subscription = await pushService.subscribe();
        if (subscription) {
          setPushSubscribed(true);
          setPushPermission('granted');
        }
      }
    } catch (err) {
      console.error('Push toggle error:', err);
      if (err instanceof Error) {
        if (err.message.includes('denied')) {
          setPushError('Notifications are blocked. Please enable them in your browser settings.');
          setPushPermission('denied');
        } else {
          setPushError(err.message);
        }
      }
    } finally {
      setPushLoading(false);
    }
  }, [pushSubscribed]);

  // Send test push notification
  const handleTestPush = useCallback(async () => {
    setPushTestLoading(true);
    setPushError(null);

    try {
      const result = await pushService.sendTestNotification();
      if (result.success) {
        setPushTestSuccess(true);
        setTimeout(() => setPushTestSuccess(false), 3000);
      } else {
        setPushError(result.error || 'Failed to send test notification');
      }
    } catch (err) {
      console.error('Test push error:', err);
      setPushError(err instanceof Error ? err.message : 'Failed to send test notification');
    } finally {
      setPushTestLoading(false);
    }
  }, []);

  // Update preference
  const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
    setHasChanges(true);
    setSuccess(false);
  }, [preferences]);

  // Save preferences
  const savePreferences = useCallback(async () => {
    if (!preferences || !user) return;

    try {
      setSaving(true);
      setError(null);
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('user_notification_preferences')
        .update({
          email_enabled: preferences.email_enabled,
          email_due_reminders: preferences.email_due_reminders,
          email_assignments: preferences.email_assignments,
          email_mentions: preferences.email_mentions,
          email_comments: preferences.email_comments,
          in_app_enabled: preferences.in_app_enabled,
          in_app_due_reminders: preferences.in_app_due_reminders,
          in_app_assignments: preferences.in_app_assignments,
          in_app_mentions: preferences.in_app_mentions,
          in_app_comments: preferences.in_app_comments,
          notification_frequency: preferences.notification_frequency,
          quiet_hours_enabled: preferences.quiet_hours_enabled,
          quiet_hours_start: preferences.quiet_hours_start,
          quiet_hours_end: preferences.quiet_hours_end,
          digest_enabled: preferences.digest_enabled,
          digest_time: preferences.digest_time,
          digest_timezone: preferences.digest_timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', preferences.id);

      if (updateError) throw updateError;

      setHasChanges(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }, [preferences, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading notification settings...</span>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="flex items-center justify-center py-12 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        Failed to load notification settings
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-3xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage how and when you receive notifications</p>
        </div>
        <button
          onClick={savePreferences}
          disabled={saving || !hasChanges}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${hasChanges
              ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : success ? (
            <>
              <CheckSquare className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Push Notifications */}
      <Section
        title="Push Notifications"
        description="Get notified in real-time on this device"
        icon={BellRing}
      >
        {!pushSupported ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">Not Supported</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Push notifications are not supported in this browser. Try using Chrome, Firefox, or Safari.
                </p>
              </div>
            </div>
          </div>
        ) : pushPermission === 'denied' ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <BellOff className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800 dark:text-red-200">Notifications Blocked</p>
                <p className="text-red-700 dark:text-red-300">
                  Push notifications have been blocked. To enable them, click the lock icon in your browser&apos;s address bar and allow notifications.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <SettingRow
              label="Enable Push Notifications"
              description="Receive instant notifications on this device"
            >
              {pushLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              ) : (
                <Toggle
                  enabled={pushSubscribed}
                  onChange={handlePushToggle}
                />
              )}
            </SettingRow>

            {pushSubscribed && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <SettingRow
                  label="Test Notification"
                  description="Send a test push to verify it's working"
                  icon={Send}
                >
                  <button
                    onClick={handleTestPush}
                    disabled={pushTestLoading}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      pushTestSuccess
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                    }`}
                  >
                    {pushTestLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : pushTestSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Sent!
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Test
                      </>
                    )}
                  </button>
                </SettingRow>
              </div>
            )}

            {pushError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {pushError}
              </div>
            )}
          </>
        )}
      </Section>

      {/* Email Notifications */}
      <Section
        title="Email Notifications"
        description="Control which emails you receive"
        icon={Mail}
      >
        <SettingRow
          label="Enable Email Notifications"
          description="Master toggle for all email notifications"
        >
          <Toggle
            enabled={preferences.email_enabled}
            onChange={(v) => updatePreference('email_enabled', v)}
          />
        </SettingRow>

        <div className={`space-y-3 pt-2 ${!preferences.email_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <SettingRow
            label="Due Date Reminders"
            description="Get notified about upcoming deadlines"
            icon={Clock}
          >
            <Toggle
              enabled={preferences.email_due_reminders}
              onChange={(v) => updatePreference('email_due_reminders', v)}
              disabled={!preferences.email_enabled}
            />
          </SettingRow>

          <SettingRow
            label="Task Assignments"
            description="When someone assigns a task to you"
            icon={CheckSquare}
          >
            <Toggle
              enabled={preferences.email_assignments}
              onChange={(v) => updatePreference('email_assignments', v)}
              disabled={!preferences.email_enabled}
            />
          </SettingRow>

          <SettingRow
            label="Mentions"
            description="When someone mentions you in a comment"
            icon={AtSign}
          >
            <Toggle
              enabled={preferences.email_mentions}
              onChange={(v) => updatePreference('email_mentions', v)}
              disabled={!preferences.email_enabled}
            />
          </SettingRow>

          <SettingRow
            label="Comments"
            description="Activity on items you're following"
            icon={MessageCircle}
          >
            <Toggle
              enabled={preferences.email_comments}
              onChange={(v) => updatePreference('email_comments', v)}
              disabled={!preferences.email_enabled}
            />
          </SettingRow>
        </div>
      </Section>

      {/* AI-Powered Daily Digest - Featured Section */}
      <Section
        title="AI Daily Briefing"
        description="Your personalized morning assistant"
        icon={Calendar}
      >
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">✨</span>
            </div>
            <div className="text-sm">
              <p className="font-semibold text-purple-900 dark:text-purple-100">JARVIS-Style Morning Briefing</p>
              <p className="text-purple-700 dark:text-purple-300 mt-1">
                Wake up to a personalized email that reads like your own AI assistant. Get a conversational
                summary of your day followed by a quick-reference schedule - events, tasks, meals, and reminders
                all in one beautiful email.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
                  AI-Powered
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300">
                  Personalized
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
                  Once Daily
                </span>
              </div>
            </div>
          </div>
        </div>

        <SettingRow
          label="Enable Daily Briefing"
          description="Receive your AI-powered morning summary"
        >
          <Toggle
            enabled={preferences.digest_enabled}
            onChange={(v) => updatePreference('digest_enabled', v)}
          />
        </SettingRow>

        <div className={`space-y-4 pt-3 ${!preferences.digest_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <SettingRow
            label="Delivery Time"
            description="Choose when to receive your briefing"
            icon={Clock}
          >
            <TimePicker
              value={preferences.digest_time || '07:00'}
              onChange={(v) => updatePreference('digest_time', v)}
              disabled={!preferences.digest_enabled}
            />
          </SettingRow>

          <SettingRow
            label="Timezone"
            description="Your local timezone"
            icon={Sun}
          >
            <TimezoneSelector
              value={preferences.digest_timezone}
              onChange={(v) => updatePreference('digest_timezone', v)}
              disabled={!preferences.digest_enabled}
            />
          </SettingRow>
        </div>
      </Section>

      {/* Quiet Hours */}
      <Section
        title="Quiet Hours"
        description="Pause notifications during specific times"
        icon={Moon}
      >
        <SettingRow
          label="Enable Quiet Hours"
          description="No notifications during these hours"
        >
          <Toggle
            enabled={preferences.quiet_hours_enabled}
            onChange={(v) => updatePreference('quiet_hours_enabled', v)}
          />
        </SettingRow>

        <div className={`flex items-center gap-4 pt-2 ${!preferences.quiet_hours_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">From</span>
            <TimePicker
              value={preferences.quiet_hours_start || '22:00'}
              onChange={(v) => updatePreference('quiet_hours_start', v)}
              disabled={!preferences.quiet_hours_enabled}
            />
          </div>
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">To</span>
            <TimePicker
              value={preferences.quiet_hours_end || '07:00'}
              onChange={(v) => updatePreference('quiet_hours_end', v)}
              disabled={!preferences.quiet_hours_enabled}
            />
          </div>
        </div>
      </Section>


      {/* In-App Notifications */}
      <Section
        title="In-App Notifications"
        description="Notifications shown within the app"
        icon={Smartphone}
      >
        <SettingRow
          label="Enable In-App Notifications"
          description="Show notifications in the app"
        >
          <Toggle
            enabled={preferences.in_app_enabled}
            onChange={(v) => updatePreference('in_app_enabled', v)}
          />
        </SettingRow>

        <div className={`space-y-3 pt-2 ${!preferences.in_app_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <SettingRow
            label="Due Date Reminders"
            icon={Clock}
          >
            <Toggle
              enabled={preferences.in_app_due_reminders}
              onChange={(v) => updatePreference('in_app_due_reminders', v)}
              disabled={!preferences.in_app_enabled}
            />
          </SettingRow>

          <SettingRow
            label="Task Assignments"
            icon={CheckSquare}
          >
            <Toggle
              enabled={preferences.in_app_assignments}
              onChange={(v) => updatePreference('in_app_assignments', v)}
              disabled={!preferences.in_app_enabled}
            />
          </SettingRow>

          <SettingRow
            label="Mentions"
            icon={AtSign}
          >
            <Toggle
              enabled={preferences.in_app_mentions}
              onChange={(v) => updatePreference('in_app_mentions', v)}
              disabled={!preferences.in_app_enabled}
            />
          </SettingRow>

          <SettingRow
            label="Comments"
            icon={MessageCircle}
          >
            <Toggle
              enabled={preferences.in_app_comments}
              onChange={(v) => updatePreference('in_app_comments', v)}
              disabled={!preferences.in_app_enabled}
            />
          </SettingRow>
        </div>
      </Section>
    </motion.div>
  );
}

export default NotificationSettings;
