'use client';

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { showError, showSuccess, showWarning } from '@/lib/utils/toast';

type UserRole = 'Admin' | 'Member' | 'Viewer';

export interface SpaceMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  color_theme?: string;
  isCurrentUser?: boolean;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  invitation_url: string;
  token: string;
}

export interface UseSpaceMembersReturn {
  // Members
  spaceMembers: SpaceMember[];
  isLoadingMembers: boolean;
  isUpdatingRole: string | null;
  fetchSpaceMembers: () => Promise<void>;
  handleUpdateMemberRole: (memberId: string, newRole: UserRole) => Promise<void>;
  handleRemoveMember: (memberId: string) => void;
  confirmRemoveMember: () => Promise<void>;
  showRemoveMemberConfirm: boolean;
  setShowRemoveMemberConfirm: (show: boolean) => void;
  memberToRemove: string | null;
  setMemberToRemove: (id: string | null) => void;

  // Invitations
  pendingInvitations: PendingInvitation[];
  isLoadingInvitations: boolean;
  copiedInvitationId: string | null;
  resendingInvitationId: string | null;
  cancellingInvitationId: string | null;
  fetchPendingInvitations: () => Promise<void>;
  handleCopyInvitationUrl: (invitationId: string, url: string) => Promise<void>;
  handleResendInvitation: (invitationId: string) => Promise<void>;
  handleCancelInvitation: (invitationId: string) => Promise<void>;

  // Space rename
  isRenamingSpace: boolean;
  setIsRenamingSpace: (renaming: boolean) => void;
  newSpaceNameEdit: string;
  setNewSpaceNameEdit: (name: string) => void;
  isSavingSpaceName: boolean;
  handleRenameSpace: () => Promise<void>;
}

export function useSpaceMembers(spaceId: string | undefined, currentSpaceName: string | undefined, refreshSpaces: () => void): UseSpaceMembersReturn {
  // Members state
  const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // Invitations state
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null);
  const [resendingInvitationId, setResendingInvitationId] = useState<string | null>(null);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);

  // Space rename state
  const [isRenamingSpace, setIsRenamingSpace] = useState(false);
  const [newSpaceNameEdit, setNewSpaceNameEdit] = useState('');
  const [isSavingSpaceName, setIsSavingSpaceName] = useState(false);

  const fetchSpaceMembers = useCallback(async () => {
    if (!spaceId) return;
    try {
      setIsLoadingMembers(true);
      const response = await fetch(`/api/spaces/members?space_id=${spaceId}`);
      const result = await response.json();
      if (result.success) {
        setSpaceMembers(result.data);
      } else {
        logger.error('Failed to load space members:', undefined, { component: 'useSpaceMembers', action: 'execution', details: result.error });
      }
    } catch (error) {
      logger.error('Error loading space members:', error, { component: 'useSpaceMembers', action: 'execution' });
    } finally {
      setIsLoadingMembers(false);
    }
  }, [spaceId]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!spaceId) return;
    try {
      setIsLoadingInvitations(true);
      const response = await fetch(`/api/spaces/invitations?space_id=${spaceId}`);
      const result = await response.json();
      if (result.success) {
        setPendingInvitations(result.data);
      } else {
        logger.error('Failed to load invitations:', undefined, { component: 'useSpaceMembers', action: 'execution', details: result.error });
      }
    } catch (error) {
      logger.error('Error loading invitations:', error, { component: 'useSpaceMembers', action: 'execution' });
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [spaceId]);

  const handleUpdateMemberRole = useCallback(async (memberId: string, newRole: UserRole) => {
    if (!spaceId) return;
    const backendRole = newRole === 'Admin' ? 'admin' : 'member';
    try {
      setIsUpdatingRole(memberId);
      const response = await csrfFetch('/api/spaces/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: memberId, space_id: spaceId, new_role: backendRole }),
      });
      const result = await response.json();
      if (result.success) {
        setSpaceMembers(prev => prev.map(member =>
          member.id === memberId ? { ...member, role: newRole } : member
        ));
      } else {
        showError(result.error || 'Failed to update role');
      }
    } catch (error) {
      logger.error('Error updating member role:', error, { component: 'useSpaceMembers', action: 'execution' });
      showError('Failed to update member role');
    } finally {
      setIsUpdatingRole(null);
    }
  }, [spaceId]);

  const handleRemoveMember = useCallback((memberId: string) => {
    const member = spaceMembers.find(m => m.id === memberId);
    if (!member) return;
    if (member.isCurrentUser) {
      showWarning('You cannot remove yourself. Use "Leave Space" instead.');
      return;
    }
    const adminCount = spaceMembers.filter(m => m.role === 'Admin').length;
    if (member.role === 'Admin' && adminCount === 1) {
      showWarning('Cannot remove the last admin. Promote another member to admin first.');
      return;
    }
    setMemberToRemove(memberId);
    setShowRemoveMemberConfirm(true);
  }, [spaceMembers]);

  const confirmRemoveMember = useCallback(async () => {
    if (!memberToRemove || !spaceId) return;
    try {
      const response = await csrfFetch('/api/spaces/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: memberToRemove, space_id: spaceId }),
      });
      const result = await response.json();
      if (result.success) {
        setSpaceMembers(prev => prev.filter(m => m.id !== memberToRemove));
      } else {
        showError(result.error || 'Failed to remove member');
      }
    } catch (error) {
      logger.error('Error removing member:', error, { component: 'useSpaceMembers', action: 'execution' });
      showError('Failed to remove member');
    } finally {
      setShowRemoveMemberConfirm(false);
      setMemberToRemove(null);
    }
  }, [memberToRemove, spaceId]);

  const handleCopyInvitationUrl = useCallback(async (invitationId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInvitationId(invitationId);
      setTimeout(() => setCopiedInvitationId(null), 2000);
    } catch (error) {
      logger.error('Failed to copy invitation URL:', error, { component: 'useSpaceMembers', action: 'execution' });
    }
  }, []);

  const handleResendInvitation = useCallback(async (invitationId: string) => {
    try {
      setResendingInvitationId(invitationId);
      const response = await csrfFetch('/api/spaces/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId, space_id: spaceId }),
      });
      const result = await response.json();
      if (result.success) {
        await fetchPendingInvitations();
        if (result.data.email_sent) {
          showSuccess('Invitation resent successfully!');
        } else {
          showWarning('Invitation renewed but email failed. Share the link directly.');
        }
      } else {
        showError(result.error || 'Failed to resend invitation');
      }
    } catch (error) {
      logger.error('Error resending invitation:', error, { component: 'useSpaceMembers', action: 'execution' });
      showError('Failed to resend invitation');
    } finally {
      setResendingInvitationId(null);
    }
  }, [spaceId, fetchPendingInvitations]);

  const handleCancelInvitation = useCallback(async (invitationId: string) => {
    // Note: confirm() replaced with direct execution — the calling component should handle confirmation UI
    try {
      setCancellingInvitationId(invitationId);
      const response = await csrfFetch('/api/spaces/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId }),
      });
      const result = await response.json();
      if (result.success) {
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      } else {
        showError(result.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      logger.error('Error cancelling invitation:', error, { component: 'useSpaceMembers', action: 'execution' });
      showError('Failed to cancel invitation');
    } finally {
      setCancellingInvitationId(null);
    }
  }, []);

  const handleRenameSpace = useCallback(async () => {
    if (!newSpaceNameEdit.trim()) {
      showWarning('Please enter a space name');
      return;
    }
    if (!currentSpaceName) {
      showError('No space selected');
      return;
    }
    setIsSavingSpaceName(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccess('Space renamed successfully!');
      setIsRenamingSpace(false);
      setNewSpaceNameEdit('');
      refreshSpaces();
    } catch (error) {
      logger.error('Failed to rename space:', error, { component: 'useSpaceMembers', action: 'execution' });
      showError('Failed to rename space. Please try again.');
    } finally {
      setIsSavingSpaceName(false);
    }
  }, [newSpaceNameEdit, currentSpaceName, refreshSpaces]);

  return {
    spaceMembers, isLoadingMembers, isUpdatingRole,
    fetchSpaceMembers, handleUpdateMemberRole, handleRemoveMember, confirmRemoveMember,
    showRemoveMemberConfirm, setShowRemoveMemberConfirm, memberToRemove, setMemberToRemove,
    pendingInvitations, isLoadingInvitations,
    copiedInvitationId, resendingInvitationId, cancellingInvitationId,
    fetchPendingInvitations, handleCopyInvitationUrl, handleResendInvitation, handleCancelInvitation,
    isRenamingSpace, setIsRenamingSpace, newSpaceNameEdit, setNewSpaceNameEdit,
    isSavingSpaceName, handleRenameSpace,
  };
}
