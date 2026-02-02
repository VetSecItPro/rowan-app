'use client';

import { useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface MessageNotificationBellProps {
  userId: string;
  spaceId: string;
  onBellClick?: () => void;
}

export function MessageNotificationBell({
  userId,
  spaceId,
  onBellClick,
}: MessageNotificationBellProps) {
  const countRef = useRef(0);
  const store = useMemo(() => {
    const listeners = new Set<() => void>();

    return {
      getSnapshot: () => countRef.current,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      setCount: (next: number) => {
        if (countRef.current === next) return;
        countRef.current = next;
        listeners.forEach((listener) => listener());
      },
    };
  }, []);

  const unreadCount = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const supabase = useMemo(() => createClient(), []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*, conversations!inner(space_id)', { count: 'exact', head: true })
        .eq('conversations.space_id', spaceId)
        .eq('read', false)
        .neq('sender_id', userId);

      if (error) {
        logger.error('Error fetching unread count:', error, { component: 'MessageNotificationBell', action: 'component_action' });
        return;
      }

      store.setCount(count || 0);
    } catch (error) {
      logger.error('Error fetching unread count:', error, { component: 'MessageNotificationBell', action: 'component_action' });
    }
  }, [spaceId, store, supabase, userId]);

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Real-time subscription - listen for message changes and refetch
  // Note: messages table has no direct space_id column (goes through conversations),
  // so we can't filter server-side in postgres_changes. The fetchUnreadCount query
  // properly filters by conversations.space_id, so incorrect data is never shown.
  useEffect(() => {
    const channel = supabase
      .channel(`messages_unread_count_${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadCount, spaceId, supabase]);

  return (
    <button
      onClick={onBellClick}
      className="relative p-2 rounded-full hover:bg-gray-700 transition-colors group"
      title={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
      aria-label={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
    >
      <Bell className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-gray-800">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-gray-100 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
        {unreadCount === 0 ? 'No new messages' : `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
      </div>
    </button>
  );
}
