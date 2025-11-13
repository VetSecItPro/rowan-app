'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';

interface SpaceMember {
  user_id: string;
  users: {
    name: string;
    color_theme: string;
  };
}

const COLOR_THEMES = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
};

export function SpaceMembersIndicator() {
  const { currentSpace, user } = useAuth();
  const [members, setMembers] = useState<SpaceMember[]>([]);

  useEffect(() => {
    if (!currentSpace) return;
    const supabase = createClient();

    const loadMembers = async () => {
      const { data, error } = await supabase
        .from('space_members')
        .select(`
          user_id,
          users (
            name,
            color_theme
          )
        `)
        .eq('space_id', currentSpace.id);

      if (error) {
        console.error('Failed to load space members:', error);
        return;
      }

      setMembers((data || []) as any);
    };

    loadMembers();

    // Subscribe to member changes
    const channel = supabase
      .channel(`space_members:${currentSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'space_members',
          filter: `space_id=eq.${currentSpace.id}`,
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSpace]);

  if (!currentSpace || members.length === 0) return null;

  return (
    <div className="hidden sm:flex items-center gap-2">
      {members.map((member) => {
        const colorClass = COLOR_THEMES[member.users.color_theme as keyof typeof COLOR_THEMES] || 'bg-gray-600';
        const isCurrentUser = member.user_id === user?.id;
        const firstName = member.users.name.split(' ')[0];

        return (
          <div
            key={member.user_id}
            className={`
              relative group flex items-center px-3 py-1.5 rounded-full
              ${colorClass} text-white font-medium text-sm
              transition-all hover:opacity-90 cursor-pointer
            `}
            title={isCurrentUser ? `${member.users.name} (You)` : member.users.name}
          >
            <span>{firstName}</span>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-50">
              <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-1.5 whitespace-nowrap">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900 dark:border-b-gray-100"></div>
                {member.users.name}
                {isCurrentUser && ' (You)'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
