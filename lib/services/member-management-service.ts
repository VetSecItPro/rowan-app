import { createClient } from '@/lib/supabase/server';
import type { SpaceMemberRole } from '@/lib/types';
import { logger } from '@/lib/logger';

// =============================================
// MEMBER MANAGEMENT SERVICE
// =============================================

/**
 * Remove a member from a space
 * Only admins and owners can remove members
 */
export async function removeMember(
  spaceId: string,
  memberUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Check if requesting user has permission (admin or owner)
    const { data: requestingMember, error: authError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', requestingUserId)
      .single();

    if (authError || !requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
      return {
        success: false,
        error: 'You do not have permission to remove members'
      };
    }

    // Prevent self-removal (use leave space instead)
    if (memberUserId === requestingUserId) {
      return {
        success: false,
        error: 'Cannot remove yourself. Use "Leave Space" instead.'
      };
    }

    // Get member being removed
    const { data: memberToRemove, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', memberUserId)
      .single();

    if (memberError || !memberToRemove) {
      return {
        success: false,
        error: 'Member not found'
      };
    }

    // Prevent removing the last admin
    if (memberToRemove.role === 'admin' || memberToRemove.role === 'owner') {
      const { data: adminCount } = await supabase
        .from('space_members')
        .select('user_id', { count: 'exact' })
        .eq('space_id', spaceId)
        .in('role', ['admin', 'owner']);

      if (adminCount && adminCount.length <= 1) {
        return {
          success: false,
          error: 'Cannot remove the last admin. Promote another member first.'
        };
      }
    }

    // Remove the member
    const { error: removeError } = await supabase
      .from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', memberUserId);

    if (removeError) {
      logger.error('[member-management] removeMember error:', removeError, { component: 'lib-member-management-service', action: 'service_call' });
      return {
        success: false,
        error: 'Failed to remove member'
      };
    }

    // Also clean up their presence record
    await supabase
      .from('user_presence')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', memberUserId);

    return { success: true };
  } catch (error) {
    logger.error('[member-management] removeMember error:', error, { component: 'lib-member-management-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to remove member'
    };
  }
}

/**
 * Change a member's role in a space
 * Only admins and owners can change roles
 */
export async function changeMemberRole(
  spaceId: string,
  memberUserId: string,
  newRole: 'member' | 'admin',
  requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Check if requesting user has permission (admin or owner)
    const { data: requestingMember, error: authError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', requestingUserId)
      .single();

    if (authError || !requestingMember || !['owner', 'admin'].includes(requestingMember.role)) {
      return {
        success: false,
        error: 'You do not have permission to change member roles'
      };
    }

    // Prevent self role change
    if (memberUserId === requestingUserId) {
      return {
        success: false,
        error: 'Cannot change your own role'
      };
    }

    // Get current member data
    const { data: currentMember, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', memberUserId)
      .single();

    if (memberError || !currentMember) {
      return {
        success: false,
        error: 'Member not found'
      };
    }

    // If demoting the last admin, prevent it
    if ((currentMember.role === 'admin' || currentMember.role === 'owner') && newRole === 'member') {
      const { data: adminCount } = await supabase
        .from('space_members')
        .select('user_id', { count: 'exact' })
        .eq('space_id', spaceId)
        .in('role', ['admin', 'owner']);

      if (adminCount && adminCount.length <= 1) {
        return {
          success: false,
          error: 'Cannot demote the last admin. Promote another member first.'
        };
      }
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from('space_members')
      .update({ role: newRole })
      .eq('space_id', spaceId)
      .eq('user_id', memberUserId);

    if (updateError) {
      logger.error('[member-management] changeMemberRole error:', updateError, { component: 'lib-member-management-service', action: 'service_call' });
      return {
        success: false,
        error: 'Failed to update member role'
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('[member-management] changeMemberRole error:', error, { component: 'lib-member-management-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to update member role'
    };
  }
}

/**
 * Leave a space (for the current user)
 */
export async function leaveSpace(
  spaceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get user's current role
    const { data: userMember, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !userMember) {
      return {
        success: false,
        error: 'You are not a member of this space'
      };
    }

    // If user is admin/owner, check if they're the last one
    if (userMember.role === 'admin' || userMember.role === 'owner') {
      const { data: adminCount } = await supabase
        .from('space_members')
        .select('user_id', { count: 'exact' })
        .eq('space_id', spaceId)
        .in('role', ['admin', 'owner']);

      if (adminCount && adminCount.length <= 1) {
        return {
          success: false,
          error: 'You are the last admin. Please promote another member before leaving.'
        };
      }
    }

    // Remove the user from the space
    const { error: removeError } = await supabase
      .from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', userId);

    if (removeError) {
      logger.error('[member-management] leaveSpace error:', removeError, { component: 'lib-member-management-service', action: 'service_call' });
      return {
        success: false,
        error: 'Failed to leave space'
      };
    }

    // Clean up presence record
    await supabase
      .from('user_presence')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', userId);

    return { success: true };
  } catch (error) {
    logger.error('[member-management] leaveSpace error:', error, { component: 'lib-member-management-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to leave space'
    };
  }
}

/**
 * Cancel/revoke an invitation
 */
export async function cancelInvitation(
  invitationId: string,
  requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('space_invitations')
      .select('space_id, status')
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      return {
        success: false,
        error: 'Invitation not found'
      };
    }

    // Check if requesting user has permission
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', invitation.space_id)
      .eq('user_id', requestingUserId)
      .single();

    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return {
        success: false,
        error: 'You do not have permission to cancel invitations'
      };
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('space_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (updateError) {
      logger.error('[member-management] cancelInvitation error:', updateError, { component: 'lib-member-management-service', action: 'service_call' });
      return {
        success: false,
        error: 'Failed to cancel invitation'
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('[member-management] cancelInvitation error:', error, { component: 'lib-member-management-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to cancel invitation'
    };
  }
}