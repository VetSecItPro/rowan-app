'use client';

import { useState } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { useOnlineCount } from '@/hooks/usePresence';
import { PresenceIndicator } from './PresenceIndicator';
import { MemberListItem } from './MemberListItem';
import type { SpaceMemberWithPresence } from '@/lib/types';
import { PresenceStatus } from '@/lib/types';

interface HeaderMemberIndicatorProps {
  spaceId: string | null;
  spaceName?: string;
  className?: string;
}

export function HeaderMemberIndicator({
  spaceId,
  spaceName,
  className = ''
}: HeaderMemberIndicatorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { onlineCount, totalCount, isLoading } = useOnlineCount(spaceId);

  // Don't show anything if no space or loading
  if (!spaceId || isLoading) {
    return null;
  }

  // Single user - just show simple indicator
  if (totalCount <= 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <PresenceIndicator status={PresenceStatus.ONLINE} size="sm" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {spaceName || 'Personal Space'}
        </span>
      </div>
    );
  }

  // Multiple users - show dropdown
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <div className="flex items-center gap-1">
            <PresenceIndicator status={PresenceStatus.ONLINE} size="sm" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {onlineCount}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              /{totalCount}
            </span>
          </div>
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {spaceName || 'Space Members'}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <PresenceIndicator status={PresenceStatus.ONLINE} size="sm" />
                  <span>{onlineCount} online</span>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Member details coming soon!</p>
                <p className="text-xs mt-1">
                  Currently tracking {totalCount} members
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}