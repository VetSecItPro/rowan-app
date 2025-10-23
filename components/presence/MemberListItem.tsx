import { useState } from 'react';
import { MoreVertical, Shield, Crown, User, Trash2 } from 'lucide-react';
import { PresenceIndicator } from './PresenceIndicator';
import type { SpaceMemberWithPresence } from '@/lib/types';

interface MemberListItemProps {
  member: SpaceMemberWithPresence;
  currentUserId?: string;
  currentUserRole?: string;
  onRemoveMember?: (memberId: string) => void;
  onChangeRole?: (memberId: string, newRole: string) => void;
  showActions?: boolean;
}

export function MemberListItem({
  member,
  currentUserId,
  currentUserRole,
  onRemoveMember,
  onChangeRole,
  showActions = false
}: MemberListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isCurrentUser = member.user_id === currentUserId;
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  const formatLastActivity = (lastActivity?: string) => {
    if (!lastActivity) return '';

    const now = new Date();
    const activity = new Date(lastActivity);
    const diffMinutes = Math.floor((now.getTime() - activity.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        {/* Avatar with Presence Indicator */}
        <div className="relative">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1">
            <PresenceIndicator status={member.presence_status} size="sm" />
          </div>
        </div>

        {/* Member Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {member.name}
              {isCurrentUser && <span className="text-gray-500"> (You)</span>}
            </h4>
            {getRoleIcon(member.role)}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{member.email}</span>
            <span>•</span>
            <span>{getRoleLabel(member.role)}</span>
            {member.presence_status === 'online' ? (
              <span className="text-green-600 dark:text-green-400">• Online</span>
            ) : (
              <span>• {formatLastActivity(member.last_activity) || 'Offline'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions Menu */}
      {showActions && canManageMembers && !isCurrentUser && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="btn-icon-mobile hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]">
              {member.role !== 'admin' && onChangeRole && (
                <button
                  onClick={() => {
                    onChangeRole(member.user_id, 'admin');
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Shield className="w-3 h-3" />
                  Make Admin
                </button>
              )}
              {member.role === 'admin' && onChangeRole && (
                <button
                  onClick={() => {
                    onChangeRole(member.user_id, 'member');
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <User className="w-3 h-3" />
                  Make Member
                </button>
              )}
              {onRemoveMember && (
                <button
                  onClick={() => {
                    onRemoveMember(member.user_id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}