'use client';

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { showError } from '@/lib/utils/toast';

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface UseActiveSessionsReturn {
  activeSessions: ActiveSession[];
  isLoadingSessions: boolean;
  sessionToRevoke: string | null;
  setSessionToRevoke: (id: string | null) => void;
  showRevokeSessionModal: boolean;
  setShowRevokeSessionModal: (show: boolean) => void;
  fetchActiveSessions: () => Promise<void>;
  handleRevokeSession: () => Promise<void>;
}

/** Fetches and manages the user's active authentication sessions */
export function useActiveSessions(): UseActiveSessionsReturn {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [showRevokeSessionModal, setShowRevokeSessionModal] = useState(false);

  const fetchActiveSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      const response = await fetch('/api/user/sessions');
      const result = await response.json();
      if (result.success) {
        setActiveSessions(result.sessions);
      } else {
        logger.error('Failed to load sessions:', undefined, { component: 'useActiveSessions', action: 'execution', details: result.error });
      }
    } catch (error) {
      logger.error('Error loading sessions:', error, { component: 'useActiveSessions', action: 'execution' });
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const handleRevokeSession = useCallback(async () => {
    if (!sessionToRevoke) return;
    try {
      const response = await csrfFetch(`/api/user/sessions/${sessionToRevoke}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionToRevoke));
        setShowRevokeSessionModal(false);
        setSessionToRevoke(null);
      } else {
        showError('Failed to revoke session');
      }
    } catch (error) {
      logger.error('Error revoking session:', error, { component: 'useActiveSessions', action: 'execution' });
      showError('Failed to revoke session');
    }
  }, [sessionToRevoke]);

  return {
    activeSessions, isLoadingSessions,
    sessionToRevoke, setSessionToRevoke,
    showRevokeSessionModal, setShowRevokeSessionModal,
    fetchActiveSessions, handleRevokeSession,
  };
}
