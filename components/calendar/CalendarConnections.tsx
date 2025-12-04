'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { Calendar, RefreshCw, Unlink, AlertCircle, CheckCircle, Clock, Loader2, X, Mail } from 'lucide-react';

interface CalendarConnection {
  id: string;
  provider: 'google' | 'apple' | 'cozi';
  provider_account_id: string | null;
  sync_status: 'active' | 'syncing' | 'error' | 'token_expired' | 'disconnected';
  sync_direction: 'bidirectional' | 'inbound_only' | 'outbound_only';
  last_sync_at: string | null;
  last_error_message: string | null;
  created_at: string;
}

const PROVIDER_CONFIG = {
  google: {
    name: 'Google Calendar',
    icon: '/icons/google-calendar.svg',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    description: 'Sync events with your Google Calendar',
  },
  apple: {
    name: 'Apple Calendar',
    icon: '/icons/apple-calendar.svg',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    description: 'Sync with iCloud Calendar via CalDAV',
  },
  cozi: {
    name: 'Cozi',
    icon: '/icons/cozi.svg',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    description: 'Import events from your Cozi family calendar',
  },
};

const STATUS_CONFIG = {
  active: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    label: 'Connected',
  },
  syncing: {
    icon: RefreshCw,
    color: 'text-blue-600 dark:text-blue-400',
    label: 'Syncing...',
    animate: true,
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    label: 'Error',
  },
  token_expired: {
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    label: 'Reconnect Required',
  },
  disconnected: {
    icon: Unlink,
    color: 'text-gray-500 dark:text-gray-400',
    label: 'Disconnected',
  },
};

export function CalendarConnections() {
  const { currentSpace } = useAuthWithSpaces();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Email prompt modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'apple' | 'cozi' | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!currentSpace?.id) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('space_id', currentSpace.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch connections:', fetchError);
        // Don't show error for empty table or permission issues on new spaces
        if (fetchError.code !== 'PGRST116') {
          setError('Failed to load calendar connections');
        }
      }
      setConnections(data || []);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
      // Don't show error to user for initial load issues
    } finally {
      setLoading(false);
    }
  }, [currentSpace?.id]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Check URL params for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successParam = params.get('success');
    const errorParam = params.get('error');
    const messageParam = params.get('message');

    if (successParam === 'google_connected') {
      setSuccess('Google Calendar connected successfully! Starting initial sync...');
      fetchConnections();
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorParam) {
      setError(messageParam || `Failed to connect: ${errorParam}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchConnections]);

  // Opens the email prompt modal
  const handleConnectClick = (provider: 'google' | 'apple' | 'cozi') => {
    if (!currentSpace?.id) {
      setError('No space selected. Please select a space first.');
      return;
    }
    setSelectedProvider(provider);
    setEmailInput('');
    setShowEmailModal(true);
    setError(null);
  };

  // Validates email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Proceeds with OAuth after email is entered
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProvider || !currentSpace?.id) return;

    const trimmedEmail = emailInput.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter an email address');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // For Google, validate it's a Gmail or Google Workspace email
    if (selectedProvider === 'google' && !trimmedEmail.includes('@gmail.') && !trimmedEmail.includes('@googlemail.')) {
      // Allow any email - Google Workspace accounts can have custom domains
      // Just show a note that it should be a Google account
    }

    console.log('[CalendarConnections] Connecting:', { provider: selectedProvider, space_id: currentSpace.id, email: trimmedEmail });
    setConnecting(selectedProvider);
    setShowEmailModal(false);

    try {
      const response = await fetch(`/api/calendar/connect/${selectedProvider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          space_id: currentSpace.id,
          sync_direction: 'bidirectional',
          login_hint: trimmedEmail,
        }),
      });

      const data = await response.json();
      console.log('[CalendarConnections] API response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate connection');
      }

      // Redirect to OAuth provider
      if (data.auth_url) {
        console.log('[CalendarConnections] Redirecting to OAuth:', data.auth_url);
        window.location.href = data.auth_url;
      }
    } catch (err) {
      console.error('[CalendarConnections] Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect calendar');
      setConnecting(null);
    }
  };

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId);
    setError(null);

    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: connectionId,
          sync_type: 'incremental',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSuccess(`Sync complete: ${data.events_synced} events processed`);
      fetchConnections();
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync calendar');
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this calendar? Synced events will remain in Rowan.')) {
      return;
    }

    setDisconnecting(connectionId);
    setError(null);

    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: connectionId,
          delete_synced_events: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect');
      }

      setSuccess('Calendar disconnected successfully');
      fetchConnections();
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect calendar');
    } finally {
      setDisconnecting(null);
    }
  };

  const getConnectionForProvider = (provider: string) => {
    return connections.find(
      (c) => c.provider === provider && c.sync_status !== 'disconnected'
    );
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never synced';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Calendar Integrations
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Connect external calendars to sync events with Rowan. External calendars take priority in case of conflicts.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800"
          >
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid gap-4">
        {(['google', 'apple', 'cozi'] as const).map((provider) => {
          const config = PROVIDER_CONFIG[provider];
          const connection = getConnectionForProvider(provider);
          const isConnected = connection && connection.sync_status !== 'disconnected';
          const statusConfig = connection ? STATUS_CONFIG[connection.sync_status] : null;
          const StatusIcon = statusConfig?.icon;

          return (
            <div
              key={provider}
              className={`rounded-xl border ${
                isConnected
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-dashed border-gray-300 dark:border-gray-600'
              } p-4 transition-all hover:shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* Provider Icon */}
                  <div className={`p-3 rounded-lg ${config.bgColor}`}>
                    <Calendar className={`h-6 w-6 ${config.color}`} />
                  </div>

                  {/* Provider Info */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {config.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {config.description}
                    </p>

                    {isConnected && connection && (
                      <div className="flex items-center gap-4 mt-2">
                        {/* Status */}
                        <div className="flex items-center gap-1.5">
                          {StatusIcon && (
                            <StatusIcon
                              className={`h-4 w-4 ${statusConfig?.color} ${
                                statusConfig?.animate ? 'animate-spin' : ''
                              }`}
                            />
                          )}
                          <span className={`text-xs font-medium ${statusConfig?.color}`}>
                            {statusConfig?.label}
                          </span>
                        </div>

                        {/* Last Sync */}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Last sync: {formatLastSync(connection.last_sync_at)}
                        </span>

                        {/* Account */}
                        {connection.provider_account_id && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {connection.provider_account_id}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    {connection?.last_error_message && connection.sync_status === 'error' && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        {connection.last_error_message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isConnected && connection ? (
                    <>
                      {/* Sync Button */}
                      <button
                        onClick={() => handleSync(connection.id)}
                        disabled={syncing === connection.id || connection.sync_status === 'syncing'}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Sync now"
                      >
                        <RefreshCw
                          className={`h-5 w-5 ${
                            syncing === connection.id || connection.sync_status === 'syncing'
                              ? 'animate-spin'
                              : ''
                          }`}
                        />
                      </button>

                      {/* Disconnect Button */}
                      <button
                        onClick={() => handleDisconnect(connection.id)}
                        disabled={disconnecting === connection.id}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Disconnect"
                      >
                        {disconnecting === connection.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Unlink className="h-5 w-5" />
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnectClick(provider)}
                      disabled={connecting === provider || provider !== 'google'}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        provider === 'google'
                          ? 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {connecting === provider ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting...
                        </span>
                      ) : provider === 'google' ? (
                        'Connect'
                      ) : (
                        'Coming Soon'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-4">
        <h4 className="text-sm font-medium text-purple-900 dark:text-purple-200">
          How Calendar Sync Works
        </h4>
        <ul className="mt-2 text-sm text-purple-800 dark:text-purple-300 space-y-1">
          <li>• Events from connected calendars are synced to your Rowan calendar</li>
          <li>• Changes in external calendars automatically update in Rowan</li>
          <li>• If there&apos;s a conflict, external calendar events take priority</li>
          <li>• Synced events are marked and can&apos;t be edited in Rowan</li>
        </ul>
      </div>

      {/* Email Prompt Modal */}
      {showEmailModal && selectedProvider && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEmailModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 ${PROVIDER_CONFIG[selectedProvider].bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Calendar className={`h-5 w-5 ${PROVIDER_CONFIG[selectedProvider].color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Connect {PROVIDER_CONFIG[selectedProvider].name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEmailSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Enter the email address associated with the {PROVIDER_CONFIG[selectedProvider].name} account you want to connect.
                  {selectedProvider === 'google' && (
                    <span className="block mt-2 text-xs text-gray-500 dark:text-gray-500">
                      This can be a Gmail address or a Google Workspace account.
                    </span>
                  )}
                </p>

                <label
                  htmlFor="calendar-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {selectedProvider === 'google' ? 'Google Account Email' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="calendar-email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={selectedProvider === 'google' ? 'yourname@gmail.com' : 'email@example.com'}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!emailInput.trim()}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                You&apos;ll be redirected to {selectedProvider === 'google' ? 'Google' : selectedProvider === 'apple' ? 'Apple' : 'Cozi'} to authorize access to your calendar.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
