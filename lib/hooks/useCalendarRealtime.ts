import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CalendarEvent } from '@/lib/services/calendar-service';
import type { RealtimeChannel, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface PresenceUser {
  user_id: string;
  online_at: string;
  viewing_event_id?: string;
  editing_event_id?: string;
}

export interface CalendarRealtimeState {
  events: CalendarEvent[];
  presence: Record<string, PresenceUser>;
  isConnected: boolean;
}

export function useCalendarRealtime(spaceId: string | undefined, userId: string | undefined) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [presence, setPresence] = useState<Record<string, PresenceUser>>({});
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Handle postgres changes
  const handleEventChange = useCallback((
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setEvents(currentEvents => {
      switch (eventType) {
        case 'INSERT':
          // Add new event if not already in list
          if (!currentEvents.find(e => e.id === newRecord.id)) {
            return [...currentEvents, newRecord as CalendarEvent].sort(
              (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );
          }
          return currentEvents;

        case 'UPDATE':
          // Update existing event
          return currentEvents.map(event =>
            event.id === newRecord.id ? { ...event, ...newRecord } : event
          );

        case 'DELETE':
          // Remove deleted event
          return currentEvents.filter(event => event.id !== oldRecord.id);

        default:
          return currentEvents;
      }
    });
  }, []);

  // Broadcast that user is editing an event
  const broadcastEditing = useCallback((eventId: string | null) => {
    if (!channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'event_editing',
      payload: {
        user_id: userId,
        event_id: eventId,
        timestamp: Date.now()
      }
    });
  }, [channel, userId]);

  // Broadcast that user is viewing an event
  const broadcastViewing = useCallback((eventId: string | null) => {
    if (!channelRef.current) return;

    channelRef.current.track({
      user_id: userId,
      online_at: new Date().toISOString(),
      viewing_event_id: eventId
    });
  }, [userId]);

  useEffect(() => {
    if (!spaceId || !userId) return;

    const supabase = createClient();

    // Create realtime channel
    const realtimeChannel = supabase
      .channel(`calendar:${spaceId}`)
      // Listen to postgres changes on events table
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `space_id=eq.${spaceId}`
        },
        handleEventChange
      )
      // Listen to presence updates
      .on('presence', { event: 'sync' }, () => {
        const state = realtimeChannel.presenceState();
        const presenceMap: Record<string, PresenceUser> = {};

        Object.keys(state).forEach(key => {
          const presences = state[key] as PresenceUser[];
          if (presences.length > 0) {
            presenceMap[key] = presences[0];
          }
        });

        setPresence(presenceMap);
      })
      // Listen to broadcast messages (editing notifications)
      .on('broadcast', { event: 'event_editing' }, (payload: { payload: { user_id?: string; event_id?: string | null; timestamp?: number } }) => {
        // Handle editing notifications
        logger.info('User editing:', { component: 'lib-useCalendarRealtime', data: payload.payload });
      })
      .subscribe(async (status: `${REALTIME_SUBSCRIBE_STATES}`) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);

          // Track own presence
          await realtimeChannel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    channelRef.current = realtimeChannel;

    // Cleanup
    return () => {
      realtimeChannel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [spaceId, userId, handleEventChange]);

  return {
    events,
    presence,
    isConnected,
    broadcastEditing,
    broadcastViewing
  };
}
