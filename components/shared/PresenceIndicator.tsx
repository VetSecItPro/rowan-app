'use client';

import { Users } from 'lucide-react';
import type { PresenceUser } from '@/lib/hooks/usePresence';

interface PresenceIndicatorProps {
  users: PresenceUser[];
  maxDisplay?: number;
}

/** Renders avatar stack showing online users with overflow count. */
export function PresenceIndicator({ users, maxDisplay = 3 }: PresenceIndicatorProps) {
  if (users.length === 0) return null;

  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {displayUsers.map((user, index) => (
          <div
            key={user.user_id}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-gray-800 flex items-center justify-center text-white text-xs font-medium"
            title={user.user_email || 'Anonymous user'}
            style={{ zIndex: displayUsers.length - index }}
          >
            {user.user_email ? user.user_email.charAt(0).toUpperCase() : '?'}
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className="w-8 h-8 rounded-full bg-gray-600 border-2 border-gray-800 flex items-center justify-center text-white text-xs font-medium"
            title={`${remainingCount} more user${remainingCount > 1 ? 's' : ''}`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </div>
  );
}

interface OnlineUsersIndicatorProps {
  count: number;
}

/** Displays a compact count of currently online space members. */
export function OnlineUsersIndicator({ count }: OnlineUsersIndicatorProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/20 border border-green-800 rounded-lg text-green-300 text-sm">
      <div className="relative">
        <Users className="w-4 h-4" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      <span className="font-medium">
        {count} {count === 1 ? 'partner' : 'partners'} online
      </span>
    </div>
  );
}
