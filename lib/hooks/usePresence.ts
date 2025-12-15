import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface PresenceUser {
  user_id: string;
  user_email?: string;
  viewing_goal?: string;
  online_at: string;
}

interface UsePresenceOptions {
  channelName: string;
  spaceId: string;
  userId: string;
  userEmail?: string;
}

export function usePresence({ channelName, spaceId, userId, userEmail }: UsePresenceOptions) {
  const [presenceState, setPresenceState] = useState<Record<string, PresenceUser[]>>({});
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!spaceId || !userId) {
      setChannel(null);
      return;
    }

    const supabase = createClient();

    // Create presence channel
    const presenceChannel = supabase.channel(`${channelName}:${spaceId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Track presence state changes
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setPresenceState(state as unknown as Record<string, PresenceUser[]>);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: PresenceUser[] }) => {
        logger.info('User joined:', { component: 'lib-usePresence', data: key, newPresences });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string; leftPresences: PresenceUser[] }) => {
        logger.info('User left:', { component: 'lib-usePresence', data: key, leftPresences });
      })
      .subscribe(async (status: `${REALTIME_SUBSCRIBE_STATES}`) => {
        if (status === 'SUBSCRIBED') {
          // Send initial presence
          await presenceChannel.track({
            user_id: userId,
            user_email: userEmail,
            online_at: new Date().toISOString(),
          });
        }
      });

    setChannel(presenceChannel);

    // Cleanup
    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [channelName, spaceId, userId, userEmail]);

  // Update what goal the user is viewing
  const updateViewingGoal = useCallback(async (goalId: string | null) => {
    if (channel) {
      await channel.track({
        user_id: userId,
        user_email: userEmail,
        viewing_goal: goalId || undefined,
        online_at: new Date().toISOString(),
      });
    }
  }, [channel, userId, userEmail]);

  // Get all online users except current user
  const onlineUsers = Object.values(presenceState)
    .flat()
    .filter((user) => user.user_id !== userId);

  // Get users viewing a specific goal
  const getUsersViewingGoal = useCallback((goalId: string) => {
    return onlineUsers.filter((user) => user.viewing_goal === goalId);
  }, [onlineUsers]);

  return {
    onlineUsers,
    presenceState,
    updateViewingGoal,
    getUsersViewingGoal,
  };
}
