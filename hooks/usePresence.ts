'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getSpaceMembersWithPresence,
  updateUserPresence,
  markUserOffline,
  type PresenceHookData
} from '@/lib/services/presence-service';
import type { SpaceMemberWithPresence } from '@/lib/types';

/**
 * Simple presence hook for React components
 * Provides cached presence data with periodic updates
 */
export function usePresence(spaceId: string | null): PresenceHookData {
  const [members, setMembers] = useState<SpaceMemberWithPresence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate online count
  const onlineCount = members.filter(m => m.presence_status === 'online').length;

  // Refresh presence data
  const refreshPresence = useCallback(async () => {
    if (!spaceId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await getSpaceMembersWithPresence(spaceId);

      if (result.success) {
        setMembers(result.data);
      } else {
        setError(result.error);
        console.error('Failed to fetch presence data:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch presence data';
      setError(errorMessage);
      console.error('Presence hook error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId]);

  // Initialize and manage presence
  useEffect(() => {
    if (!spaceId) return;

    let presenceInterval: NodeJS.Timeout;
    let refreshInterval: NodeJS.Timeout;

    const initializePresence = async () => {
      try {
        // Mark user as online
        await updateUserPresence(spaceId, 'online');

        // Initial data fetch
        await refreshPresence();

        // Set up presence updates every 2 minutes
        presenceInterval = setInterval(async () => {
          try {
            await updateUserPresence(spaceId, 'online');
          } catch (err) {
            console.error('Presence update error:', err);
          }
        }, 2 * 60 * 1000); // 2 minutes

        // Set up data refresh every 30 seconds
        refreshInterval = setInterval(refreshPresence, 30 * 1000); // 30 seconds

      } catch (err) {
        console.error('Failed to initialize presence:', err);
        setError('Failed to initialize presence tracking');
        setIsLoading(false);
      }
    };

    initializePresence();

    // Handle page visibility changes
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Tab hidden - mark offline
        try {
          await markUserOffline(spaceId);
        } catch (err) {
          console.error('Error marking user offline:', err);
        }
      } else {
        // Tab visible - mark online and refresh
        try {
          await updateUserPresence(spaceId, 'online');
          await refreshPresence();
        } catch (err) {
          console.error('Error marking user online:', err);
        }
      }
    };

    // Handle page unload
    const handleBeforeUnload = async () => {
      try {
        await markUserOffline(spaceId);
      } catch (err) {
        console.error('Error on page unload:', err);
      }
    };

    // Add event listeners
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // Cleanup function
    return () => {
      if (presenceInterval) clearInterval(presenceInterval);
      if (refreshInterval) clearInterval(refreshInterval);

      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }

      // Mark user offline on cleanup
      markUserOffline(spaceId).catch(err => {
        console.error('Error during cleanup:', err);
      });
    };
  }, [spaceId, refreshPresence]);

  return {
    members,
    onlineCount,
    isLoading,
    error,
    refreshPresence,
  };
}

/**
 * Simplified hook for just getting online count (for header)
 */
export function useOnlineCount(spaceId: string | null): { onlineCount: number; totalCount: number; isLoading: boolean } {
  const { members, onlineCount, isLoading } = usePresence(spaceId);

  return {
    onlineCount,
    totalCount: members.length,
    isLoading,
  };
}