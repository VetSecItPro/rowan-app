'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('space_id', spaceId)
        .eq('read', false)
        .neq('sender_id', userId);

      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
  }, [userId, spaceId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('messages_unread_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          // Refresh unread count when messages change
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, spaceId]);

  return (
    <button
      onClick={onBellClick}
      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
    >
      <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
