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
        .select('*, conversations!inner(space_id)', { count: 'exact', head: true })
        .eq('conversations.space_id', spaceId)
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

  // Real-time subscription - listen for any message changes and refetch
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
        (payload) => {
          // Refresh unread count when any message is updated (e.g., marked as read)
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
          // Refresh when new messages arrive
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
      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
      title={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
      aria-label={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
    >
      <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {unreadCount === 0 ? 'No new messages' : `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
      </div>
    </button>
  );
}
