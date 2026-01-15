'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Users, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usePresence } from '@/hooks/usePresence';
import { MemberListItem } from '@/components/presence/MemberListItem';
import { PresenceIndicator } from '@/components/presence/PresenceIndicator';
import { getPendingInvitations } from '@/lib/services/invitations-service';
import { removeMember, changeMemberRole } from '@/lib/services/member-management-service';
import type { SpaceMemberWithPresence, SpaceInvitation } from '@/lib/types';
import { PresenceStatus } from '@/lib/types';
import { logger } from '@/lib/logger';

interface EnhancedMemberManagementProps {
  spaceId: string;
  currentUserId: string;
  currentUserRole: string;
  onInviteClick: () => void;
}

export function EnhancedMemberManagement({
  spaceId,
  currentUserId,
  currentUserRole,
  onInviteClick
}: EnhancedMemberManagementProps) {
  const { members, onlineCount, isLoading, error, refreshPresence } = usePresence(spaceId);
  const [pendingInvitations, setPendingInvitations] = useState<SpaceInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);

  // Load pending invitations
  useEffect(() => {
    async function loadInvitations() {
      if (!spaceId || !currentUserId) return;

      try {
        const result = await getPendingInvitations(spaceId, currentUserId);
        if (result.success) {
          setPendingInvitations(result.data);
        }
      } catch (err) {
        logger.error('Failed to load invitations:', err, { component: 'EnhancedMemberManagement', action: 'component_action' });
      } finally {
        setInvitationsLoading(false);
      }
    }

    loadInvitations();
  }, [spaceId, currentUserId]);

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the space?')) {
      return;
    }

    try {
      const result = await removeMember(spaceId, memberId, currentUserId);

      if (result.success) {
        toast.success('Member removed successfully');
        await refreshPresence(); // Refresh the member list
      } else {
        toast.error(result.error || 'Failed to remove member');
      }
    } catch (error) {
      logger.error('Error removing member:', error, { component: 'EnhancedMemberManagement', action: 'component_action' });
      toast.error('Failed to remove member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const result = await changeMemberRole(
        spaceId,
        memberId,
        newRole as 'member' | 'admin',
        currentUserId
      );

      if (result.success) {
        toast.success(`Member role updated to ${newRole}`);
        await refreshPresence(); // Refresh the member list
      } else {
        toast.error(result.error || 'Failed to update member role');
      }
    } catch (error) {
      logger.error('Error changing member role:', error, { component: 'EnhancedMemberManagement', action: 'component_action' });
      toast.error('Failed to update member role');
    }
  };

  if (isLoading && invitationsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        <span className="ml-2 text-sm text-gray-400">Loading members...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
        <button
          onClick={refreshPresence}
          className="mt-2 text-sm text-red-400 hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Member Overview */}
      <div className="bg-gradient-to-br from-purple-50 from-purple-900/20 to-blue-900/20 border border-purple-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Space Members
          </h4>
          <button
            onClick={refreshPresence}
            className="p-1 hover:bg-gray-800/50 rounded transition-colors"
            title="Refresh presence data"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <PresenceIndicator status={PresenceStatus.ONLINE} size="sm" />
            <span>{onlineCount} online</span>
          </div>
          <div className="flex items-center gap-2">
            <PresenceIndicator status={PresenceStatus.OFFLINE} size="sm" />
            <span>{members.length - onlineCount} offline</span>
          </div>
          <span>•</span>
          <span>{members.length} total members</span>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-base font-medium text-white">Active Members</h5>
          <button
            onClick={onInviteClick}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        {members.length === 0 ? (
          <div className="p-6 bg-gray-900/50 border border-gray-700 rounded-xl text-center">
            <p className="text-sm text-gray-400">No members found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <MemberListItem
                key={member.user_id}
                member={member}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onRemoveMember={handleRemoveMember}
                onChangeRole={handleChangeRole}
                showActions={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-base font-medium text-white">Pending Invitations</h5>
          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {invitation.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    Invited as {invitation.role} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-xs text-yellow-400 font-medium">
                  Pending
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}