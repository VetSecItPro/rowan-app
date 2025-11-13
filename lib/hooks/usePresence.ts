import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
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
