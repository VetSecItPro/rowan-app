'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { Calendar, RefreshCw, Unlink, AlertCircle, CheckCircle, Clock, Loader2, X, Mail, Key, ExternalLink, Link, Upload, FileText } from 'lucide-react';
import { logger } from '@/lib/logger';

interface CalendarConnection {
  id: string;
  provider: 'google' | 'apple' | 'outlook' | 'ics' | 'cozi';
  provider_account_id: string | null;
  sync_status: 'active' | 'syncing' | 'error' | 'token_expired' | 'disconnected';
  sync_direction: 'bidirectional' | 'inbound_only' | 'outbound_only';
  last_sync_at: string | null;
  last_error_message: string | null;
  created_at: string;
  // ICS-specific fields
  ics_url?: string;
  ics_name?: string;
}

const PROVIDER_CONFIG = {
  google: {
    name: 'Google Calendar',
    icon: '/icons/google-calendar.svg',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    description: 'Sync events with your Google Calendar',
  },
  apple: {
    name: 'Apple Calendar',
    icon: '/icons/apple-calendar.svg',
    color: 'text-gray-300',
    bgColor: 'bg-gray-800/50',
    description: 'Sync with iCloud Calendar via CalDAV',
  },
  outlook: {
    name: 'Microsoft Outlook',
    icon: '/icons/outlook-calendar.svg',
    color: 'text-sky-400',
    bgColor: 'bg-sky-900/20',
    description: 'Sync with Outlook.com or Microsoft 365 Calendar',
  },
  ics: {
    name: 'ICS Feed',
    icon: '/icons/ics-feed.svg',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20',
    description: 'Import from any ICS calendar feed URL',
  },
  cozi: {
    name: 'Cozi',
    icon: '/icons/cozi.svg',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    description: 'Import events from your Cozi family calendar',
  },
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string; animate?: boolean }> = {
  active: {
    icon: CheckCircle,
    color: 'text-green-400',
    label: 'Connected',
  },
  syncing: {
    icon: RefreshCw,
    color: 'text-blue-400',
    label: 'Syncing...',
    animate: true,
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    label: 'Error',
  },
  token_expired: {
    icon: Clock,
    color: 'text-amber-400',
    label: 'Reconnect Required',
  },
  disconnected: {
    icon: Unlink,
    color: 'text-gray-400',
    label: 'Disconnected',
  },
};

export const CalendarConnections = memo(function CalendarConnections() {
  const { currentSpace } = useAuthWithSpaces();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Email prompt modal state (for OAuth providers)
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'outlook' | null>(null);

  // Apple-specific state for app-specific password
  const [showAppleModal, setShowAppleModal] = useState(false);
  const [appleEmail, setAppleEmail] = useState('');
  const [applePassword, setApplePassword] = useState('');

  // ICS feed modal state
  const [showIcsModal, setShowIcsModal] = useState(false);
  const [icsUrl, setIcsUrl] = useState('');
  const [icsName, setIcsName] = useState('');
  const [icsMode, setIcsMode] = useState<'url' | 'file'>('url');
  const [icsFile, setIcsFile] = useState<File | null>(null);
  const [icsFileContent, setIcsFileContent] = useState('');

  // Cozi modal state
  const [showCoziModal, setShowCoziModal] = useState(false);
  const [coziUrl, setCoziUrl] = useState('');
  const [coziFamilyMember, setCoziFamilyMember] = useState('');

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
        logger.error('Failed to fetch connections:', fetchError, { component: 'CalendarConnections', action: 'component_action' });
        // Don't show error for empty table or permission issues on new spaces
        if (fetchError.code !== 'PGRST116') {
          setError('Failed to load calendar connections');
        }
      }
      setConnections(data || []);
    } catch (err) {
      logger.error('Failed to fetch connections:', err, { component: 'CalendarConnections', action: 'component_action' });
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
    } else if (successParam === 'outlook_connected') {
      setSuccess('Outlook Calendar connected successfully! Starting initial sync...');
      fetchConnections();
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorParam) {
      setError(messageParam || `Failed to connect: ${errorParam}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchConnections]);

  // Opens the appropriate modal based on provider
  const handleConnectClick = (provider: 'google' | 'apple' | 'outlook' | 'ics' | 'cozi') => {
    if (!currentSpace?.id) {
      setError('No space selected. Please select a space first.');
      return;
    }
    setError(null);

    if (provider === 'apple') {
      // Apple uses app-specific password modal
      setAppleEmail('');
      setApplePassword('');
      setShowAppleModal(true);
    } else if (provider === 'ics') {
      // ICS uses URL input modal
      setIcsUrl('');
      setIcsName('');
      setShowIcsModal(true);
    } else if (provider === 'cozi') {
      // Cozi uses its own URL input modal
      setCoziUrl('');
      setCoziFamilyMember('');
      setShowCoziModal(true);
    } else if (provider === 'google' || provider === 'outlook') {
      // Google and Outlook use OAuth email hint modal
      setSelectedProvider(provider);
      setEmailInput('');
      setShowEmailModal(true);
    }
  };

  // Handle ICS file selection
  const handleIcsFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.ics') && !file.type.includes('calendar')) {
      setError('Please select a valid .ics file');
      return;
    }

    // Validate file size (1MB max)
    if (file.size > 1024 * 1024) {
      setError('File is too large. Maximum size is 1MB.');
      return;
    }

    setIcsFile(file);

    // Read file content
    try {
      const content = await file.text();
      setIcsFileContent(content);
      // Auto-fill name from file name if empty
      if (!icsName) {
        setIcsName(file.name.replace('.ics', ''));
      }
    } catch (err) {
      logger.error('Failed to read ICS file:', err, { component: 'CalendarConnections', action: 'component_action' });
      setError('Failed to read the ICS file');
    }
  };

  // Handle ICS feed connection (URL mode) or file upload
  const handleIcsConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSpace?.id) return;

    const trimmedName = icsName.trim();

    if (!trimmedName) {
      setError('Please enter a name for this calendar');
      return;
    }

    // Handle file upload mode
    if (icsMode === 'file') {
      if (!icsFileContent) {
        setError('Please select an ICS file to upload');
        return;
      }

      setConnecting('ics');
      setShowIcsModal(false);

      try {
        const response = await fetch('/api/calendar/import/ics-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ics_content: icsFileContent,
            space_id: currentSpace.id,
            file_name: icsFile?.name || trimmedName,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || 'Failed to import ICS file');
        }

        setSuccess(`ICS file imported successfully! ${data.events_imported} events added.`);
        // Reset file state
        setIcsFile(null);
        setIcsFileContent('');
        setIcsMode('url');
      } catch (err) {
        logger.error('[CalendarConnections] ICS file import error:', err, { component: 'CalendarConnections', action: 'component_action' });
        setError(err instanceof Error ? err.message : 'Failed to import ICS file');
      } finally {
        setConnecting(null);
      }
      return;
    }

    // Handle URL mode
    const trimmedUrl = icsUrl.trim();

    if (!trimmedUrl) {
      setError('Please enter an ICS feed URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl.replace('webcal://', 'https://'));
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setConnecting('ics');
    setShowIcsModal(false);

    try {
      const response = await fetch('/api/calendar/connect/ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmedUrl,
          name: trimmedName,
          space_id: currentSpace.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to connect ICS feed');
      }

      setSuccess(`ICS feed "${data.feed_name}" connected successfully! Imported ${data.initial_sync?.events_imported || 0} events.`);
      fetchConnections();
    } catch (err) {
      logger.error('[CalendarConnections] ICS connect error:', err, { component: 'CalendarConnections', action: 'component_action' });
      setError(err instanceof Error ? err.message : 'Failed to connect ICS feed');
    } finally {
      setConnecting(null);
    }
  };

  // Handle Cozi calendar connection
  const handleCoziConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSpace?.id) return;

    const trimmedUrl = coziUrl.trim();
    const trimmedMember = coziFamilyMember.trim();

    if (!trimmedUrl) {
      setError('Please enter your Cozi calendar URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl.replace('webcal://', 'https://'));
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setConnecting('cozi');
    setShowCoziModal(false);

    try {
      const response = await fetch('/api/calendar/connect/cozi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmedUrl,
          family_member: trimmedMember || undefined,
          space_id: currentSpace.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || data.hint || 'Failed to connect Cozi calendar');
      }

      setSuccess(`Cozi calendar "${data.calendar_name}" connected successfully! Imported ${data.initial_sync?.events_imported || 0} events.`);
      fetchConnections();
    } catch (err) {
      logger.error('[CalendarConnections] Cozi connect error:', err, { component: 'CalendarConnections', action: 'component_action' });
      setError(err instanceof Error ? err.message : 'Failed to connect Cozi calendar');
    } finally {
      setConnecting(null);
    }
  };

  // Handle Apple CalDAV connection (app-specific password flow)
  const handleAppleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentSpace?.id) return;

    const trimmedEmail = appleEmail.trim().toLowerCase();
    const trimmedPassword = applePassword.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and app-specific password');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate app-specific password format (xxxx-xxxx-xxxx-xxxx)
    const passwordPattern = /^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/i;
    if (!passwordPattern.test(trimmedPassword)) {
      setError('Invalid app-specific password format. Expected: xxxx-xxxx-xxxx-xxxx');
      return;
    }

    setConnecting('apple');
    setShowAppleModal(false);

    try {
      const response = await fetch('/api/calendar/connect/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          app_specific_password: trimmedPassword,
          space_id: currentSpace.id,
          sync_direction: 'bidirectional',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to connect Apple Calendar');
      }

      setSuccess('Apple Calendar connected successfully! Initial sync will begin shortly.');
      fetchConnections();
    } catch (err) {
      logger.error('[CalendarConnections] Apple connect error:', err, { component: 'CalendarConnections', action: 'component_action' });
      setError(err instanceof Error ? err.message : 'Failed to connect Apple Calendar');
    } finally {
      setConnecting(null);
    }
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

    logger.info('[CalendarConnections] Connecting:', { component: 'CalendarConnections', data: { provider: selectedProvider, space_id: currentSpace.id, email: trimmedEmail } });
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
      logger.info('[CalendarConnections] API response:', { component: 'CalendarConnections', data: { status: response.status, data } });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate connection');
      }

      // Redirect to OAuth provider
      if (data.auth_url) {
        logger.info('[CalendarConnections] Redirecting to OAuth:', { component: 'CalendarConnections', data: data.auth_url });
        window.location.href = data.auth_url;
      }
    } catch (err) {
      logger.error('[CalendarConnections] Connection error:', err, { component: 'CalendarConnections', action: 'component_action' });
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
      logger.error('Sync error:', err, { component: 'CalendarConnections', action: 'component_action' });
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
      logger.error('Disconnect error:', err, { component: 'CalendarConnections', action: 'component_action' });
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
        <h3 className="text-lg font-semibold text-white">
          Calendar Integrations
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          Connect external calendars to sync events with Rowan. External calendars take priority in case of conflicts.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg bg-red-900/20 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-200">Error</p>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-800"
          >
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-900/20 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-300">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-400 hover:text-green-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid gap-4">
        {(['google', 'apple', 'outlook', 'cozi', 'ics'] as const).map((provider) => {
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
                  ? 'border-gray-700'
                  : 'border-dashed border-gray-600'
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
                    <h4 className="font-medium text-white">
                      {config.name}
                    </h4>
                    <p className="text-sm text-gray-400 mt-0.5">
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
                        <span className="text-xs text-gray-400">
                          Last sync: {formatLastSync(connection.last_sync_at)}
                        </span>

                        {/* Account */}
                        {connection.provider_account_id && (
                          <span className="text-xs text-gray-400">
                            {connection.provider_account_id}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    {connection?.last_error_message && connection.sync_status === 'error' && (
                      <p className="text-xs text-red-400 mt-2">
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
                        className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50"
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
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
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
                      disabled={connecting === provider}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {connecting === provider ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting...
                        </span>
                      ) : (
                        'Connect'
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
      <div className="rounded-lg bg-purple-900/20 p-4">
        <h4 className="text-sm font-medium text-purple-200">
          How Calendar Sync Works
        </h4>
        <ul className="mt-2 text-sm text-purple-300 space-y-1">
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
            className="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 ${PROVIDER_CONFIG[selectedProvider].bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Calendar className={`h-5 w-5 ${PROVIDER_CONFIG[selectedProvider].color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Connect {PROVIDER_CONFIG[selectedProvider].name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-1 text-gray-500 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEmailSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-4">
                  Enter the email address associated with the {PROVIDER_CONFIG[selectedProvider].name} account you want to connect.
                  {selectedProvider === 'google' && (
                    <span className="block mt-2 text-xs text-gray-500">
                      This can be a Gmail address or a Google Workspace account.
                    </span>
                  )}
                  {selectedProvider === 'outlook' && (
                    <span className="block mt-2 text-xs text-gray-500">
                      This can be an Outlook.com, Hotmail, Live, or Microsoft 365 account.
                    </span>
                  )}
                </p>

                <label
                  htmlFor="calendar-email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  {selectedProvider === 'google' ? 'Google Account Email' : selectedProvider === 'outlook' ? 'Microsoft Account Email' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="calendar-email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={selectedProvider === 'google' ? 'yourname@gmail.com' : selectedProvider === 'outlook' ? 'yourname@outlook.com' : 'email@example.com'}
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
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
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors font-medium"
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

              <p className="text-xs text-center text-gray-400">
                You&apos;ll be redirected to {selectedProvider === 'google' ? 'Google' : selectedProvider === 'outlook' ? 'Microsoft' : 'the provider'} to authorize access to your calendar.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Apple Calendar Modal (App-Specific Password) */}
      {showAppleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAppleModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 ${PROVIDER_CONFIG.apple.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Calendar className={`h-5 w-5 ${PROVIDER_CONFIG.apple.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Connect Apple Calendar
                  </h3>
                </div>
                <button
                  onClick={() => setShowAppleModal(false)}
                  className="p-1 text-gray-500 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAppleConnect} className="p-6 space-y-4">
              <div className="rounded-lg bg-amber-900/20 p-3 text-sm">
                <p className="font-medium text-amber-200 mb-1">
                  App-Specific Password Required
                </p>
                <p className="text-amber-300 text-xs">
                  Apple Calendar requires an app-specific password for third-party apps.
                  <a
                    href="https://appleid.apple.com/account/manage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 ml-1 text-amber-200 underline hover:no-underline"
                  >
                    Generate one at appleid.apple.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              {/* Email Input */}
              <div>
                <label
                  htmlFor="apple-email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Apple ID Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="apple-email"
                    value={appleEmail}
                    onChange={(e) => setAppleEmail(e.target.value)}
                    placeholder="yourname@icloud.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* App-Specific Password Input */}
              <div>
                <label
                  htmlFor="apple-password"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  App-Specific Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="apple-password"
                    value={applePassword}
                    onChange={(e) => setApplePassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 font-mono"
                    autoComplete="off"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Format: xxxx-xxxx-xxxx-xxxx (16 lowercase letters with dashes)
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppleModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!appleEmail.trim() || !applePassword.trim()}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect
                </button>
              </div>

              <p className="text-xs text-center text-gray-400">
                Your credentials are encrypted and stored securely. We never see your password.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ICS Feed Modal */}
      {showIcsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowIcsModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 ${PROVIDER_CONFIG.ics.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Link className={`h-5 w-5 ${PROVIDER_CONFIG.ics.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Import ICS Calendar Feed
                  </h3>
                </div>
                <button
                  onClick={() => setShowIcsModal(false)}
                  className="p-1 text-gray-500 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleIcsConnect} className="p-6 space-y-4">
              {/* Mode Toggle */}
              <div className="flex rounded-xl bg-gray-700 p-1">
                <button
                  type="button"
                  onClick={() => setIcsMode('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    icsMode === 'url'
                      ? 'bg-gray-800 text-purple-400 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Link className="h-4 w-4" />
                  Subscribe to URL
                </button>
                <button
                  type="button"
                  onClick={() => setIcsMode('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    icsMode === 'file'
                      ? 'bg-gray-800 text-purple-400 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Upload File
                </button>
              </div>

              <div className="rounded-lg bg-purple-900/20 p-3 text-sm">
                <p className="font-medium text-purple-200 mb-1">
                  {icsMode === 'url' ? 'One-Way Subscription' : 'One-Time Import'}
                </p>
                <p className="text-purple-300 text-xs">
                  {icsMode === 'url'
                    ? 'Events from the ICS feed will be imported into Rowan and synced every 15 minutes. Changes you make in Rowan won\'t sync back.'
                    : 'Events from the ICS file will be imported once. Upload new files to add more events.'
                  }
                </p>
              </div>

              {/* Calendar Name Input */}
              <div>
                <label
                  htmlFor="ics-name"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Calendar Name
                </label>
                <input
                  type="text"
                  id="ics-name"
                  value={icsName}
                  onChange={(e) => setIcsName(e.target.value)}
                  placeholder="e.g., Work Calendar, Sports Schedule"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                  autoFocus
                />
              </div>

              {/* URL Input (URL mode) */}
              {icsMode === 'url' && (
                <div>
                  <label
                    htmlFor="ics-url"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    ICS Feed URL
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="url"
                      id="ics-url"
                      value={icsUrl}
                      onChange={(e) => setIcsUrl(e.target.value)}
                      placeholder="https://example.com/calendar.ics or webcal://..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Supports HTTPS and webcal:// URLs. The feed will be synced every 15 minutes.
                  </p>
                </div>
              )}

              {/* File Upload (File mode) */}
              {icsMode === 'file' && (
                <div>
                  <label
                    htmlFor="ics-file"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    ICS File
                  </label>
                  <label
                    htmlFor="ics-file"
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      icsFile
                        ? 'border-purple-400 bg-purple-900/20'
                        : 'border-gray-600 hover:border-purple-400 hover:bg-gray-700'
                    }`}
                  >
                    {icsFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-purple-500" />
                        <span className="text-sm font-medium text-purple-400">
                          {icsFile.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          Click to change file
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-sm font-medium text-gray-300">
                          Drop .ics file here or click to browse
                        </span>
                        <span className="text-xs text-gray-400">
                          Maximum file size: 1MB
                        </span>
                      </div>
                    )}
                    <input
                      id="ics-file"
                      type="file"
                      accept=".ics,text/calendar"
                      className="hidden"
                      onChange={handleIcsFileSelect}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-400">
                    Upload .ics files from email invites or exported calendars.
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIcsModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !icsName.trim() ||
                    (icsMode === 'url' && !icsUrl.trim()) ||
                    (icsMode === 'file' && !icsFileContent)
                  }
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {icsMode === 'url' ? 'Subscribe to Feed' : 'Import File'}
                </button>
              </div>

              <p className="text-xs text-center text-gray-400">
                {icsMode === 'url'
                  ? 'Common sources: Google Calendar, Outlook, school/organization calendars, sports schedules'
                  : 'Upload .ics files from email invites, exported calendars, or calendar apps'
                }
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Cozi Calendar Modal */}
      {showCoziModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCoziModal(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 ${PROVIDER_CONFIG.cozi.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Calendar className={`h-5 w-5 ${PROVIDER_CONFIG.cozi.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Connect Cozi Calendar
                  </h3>
                </div>
                <button
                  onClick={() => setShowCoziModal(false)}
                  className="p-1 text-gray-500 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCoziConnect} className="p-6 space-y-4">
              <div className="rounded-lg bg-orange-900/20 p-3 text-sm">
                <p className="font-medium text-orange-200 mb-1">
                  One-Way Import from Cozi
                </p>
                <p className="text-orange-300 text-xs">
                  Events from your Cozi calendar will be imported into Rowan. Changes you make in Rowan won&apos;t sync back to Cozi.
                </p>
              </div>

              <div className="rounded-lg bg-blue-900/20 p-3 text-sm">
                <p className="font-medium text-blue-200 mb-2">
                  How to get your Cozi calendar URL:
                </p>
                <ol className="text-blue-300 text-xs space-y-1 list-decimal list-inside">
                  <li>Sign in to <a href="https://my.cozi.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">my.cozi.com</a></li>
                  <li>Go to <strong>Settings → Shared Cozi Calendars</strong></li>
                  <li>Toggle sharing to &quot;Shared&quot; for the calendar you want</li>
                  <li>Click &quot;VIEW OR SEND COZI URL&quot; → &quot;COPY COZI URL&quot;</li>
                </ol>
              </div>

              {/* Family Member Name (Optional) */}
              <div>
                <label
                  htmlFor="cozi-member"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Family Member (Optional)
                </label>
                <input
                  type="text"
                  id="cozi-member"
                  value={coziFamilyMember}
                  onChange={(e) => setCoziFamilyMember(e.target.value)}
                  placeholder="e.g., Mom, Dad, Kids, All Family"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-400"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Leave blank for &quot;Cozi Family Calendar&quot;
                </p>
              </div>

              {/* URL Input */}
              <div>
                <label
                  htmlFor="cozi-url"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Cozi Calendar URL
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    id="cozi-url"
                    value={coziUrl}
                    onChange={(e) => setCoziUrl(e.target.value)}
                    placeholder="https://...cozi.com/..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCoziModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!coziUrl.trim()}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect Cozi
                </button>
              </div>

              <p className="text-xs text-center text-gray-400">
                The calendar will sync automatically every 15 minutes
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
