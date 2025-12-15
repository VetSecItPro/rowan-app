import { createClient } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';
import type { Space, SpaceMember, CreateSpaceInput } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// =============================================
// VALIDATION SCHEMAS
// =============================================

const CreateSpaceSchema = z.object({
  name: z.string()
    .min(1, 'Space name is required')
    .max(100, 'Space name too long')
    .trim(),
});

const UpdateSpaceSchema = z.object({
  name: z.string()
    .min(1, 'Space name is required')
    .max(100, 'Space name too long')
    .trim()
    .optional(),
});

// =============================================
// SPACE CRUD OPERATIONS
// =============================================

/**
 * Create a new space and add the creator as owner
 * @param name - Space name
 * @param userId - User ID of the creator
 * @param supabaseClient - Optional Supabase client (uses admin client for API routes to bypass RLS)
 * @returns Created space or error
 */
export async function createSpace(
  name: string,
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<{ success: true; data: Space } | { success: false; error: string }> {
  try {
    // Use admin client when called from server (supabaseClient provided), otherwise use regular client
    // Admin client bypasses RLS which is needed for space creation
    const supabase = supabaseClient ? supabaseAdmin : createClient();

    // Validate input
    const validated = CreateSpaceSchema.parse({ name });

    // Create shared space for the user
    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .insert({
        name: validated.name,
        is_personal: false,
        auto_created: false,
      })
      .select()
      .single();

    if (spaceError) {
      logger.error('createSpace INSERT error', spaceError instanceof Error ? spaceError : new Error(JSON.stringify(spaceError)), { component: 'lib-spaces-service', action: 'service_call', details: JSON.stringify(spaceError) });
      throw spaceError;
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('space_members')
      .insert({
        space_id: space.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      logger.error('createSpace member INSERT error', memberError instanceof Error ? memberError : new Error(JSON.stringify(memberError)), { component: 'lib-spaces-service', action: 'service_call', details: { memberError: JSON.stringify(memberError), spaceId: space.id, userId } });
      // Cleanup: delete the space if member creation failed
      await supabase.from('spaces').delete().eq('id', space.id);
      throw memberError;
    }

    return { success: true, data: space };
  } catch (error) {
    logger.error('[spaces-service] createSpace error:', error, { component: 'lib-spaces-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create space'
    };
  }
}

/**
 * Get all spaces a user belongs to
 * @param userId - User ID
 * @returns Array of spaces with member role
 */
export async function getUserSpaces(
  userId: string
): Promise<{ success: true; data: (Space & { role: string })[] } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('space_members')
      .select(`
        role,
        spaces (
          id,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) {
      logger.error('[spaces-service] getUserSpaces error:', error, { component: 'lib-spaces-service', action: 'service_call' });
      throw error;
    }

    // Transform the data to include role at the top level
    const spaces = data.map((item: any) => ({
      ...item.spaces,
      role: item.role,
    }));

    return { success: true, data: spaces };
  } catch (error) {
    logger.error('[spaces-service] getUserSpaces error:', error, { component: 'lib-spaces-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to fetch user spaces'
    };
  }
}

/**
 * Get a single space by ID
 * @param spaceId - Space ID
 * @param userId - User ID (for authorization check)
 * @returns Space data or error
 */
export async function getSpace(
  spaceId: string,
  userId: string
): Promise<{ success: true; data: Space & { role: string } } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    // Check if user is a member of this space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return {
        success: false,
        error: 'You do not have access to this space'
      };
    }

    // Get space details
    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .single();

    if (spaceError) {
      logger.error('[spaces-service] getSpace error:', spaceError, { component: 'lib-spaces-service', action: 'service_call' });
      throw spaceError;
    }

    return {
      success: true,
      data: { ...space, role: membership.role }
    };
  } catch (error) {
    logger.error('[spaces-service] getSpace error:', error, { component: 'lib-spaces-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to fetch space'
    };
  }
}

/**
 * Get all members of a space
 * @param spaceId - Space ID
 * @param userId - User ID (for authorization check)
 * @returns Array of space members with user details
 */
export async function getSpaceMembers(
  spaceId: string,
  userId: string
): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    // Check if user is a member of this space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return {
        success: false,
        error: 'You do not have access to this space'
      };
    }

    // Get all members with user details
    const { data, error } = await supabase
      .from('space_members')
      .select(`
        space_id,
        user_id,
        role,
        joined_at,
        users (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('space_id', spaceId)
      .order('joined_at', { ascending: true });

    if (error) {
      logger.error('[spaces-service] getSpaceMembers error:', error, { component: 'lib-spaces-service', action: 'service_call' });
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    logger.error('[spaces-service] getSpaceMembers error:', error, { component: 'lib-spaces-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to fetch space members'
    };
  }
}

/**
 * Update space details
 * @param spaceId - Space ID
 * @param userId - User ID (for authorization check)
 * @param updates - Space updates
 * @returns Updated space or error
 */
export async function updateSpace(
  spaceId: string,
  userId: string,
  updates: { name?: string }
): Promise<{ success: true; data: Space } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    // Validate input
    const validated = UpdateSpaceSchema.parse(updates);

    // Check if user is owner or admin
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return {
        success: false,
        error: 'You do not have permission to update this space'
      };
    }

    // Update space
    const { data: space, error: updateError } = await supabase
      .from('spaces')
      .update(validated)
      .eq('id', spaceId)
      .select()
      .single();

    if (updateError) {
      logger.error('[spaces-service] updateSpace error:', updateError, { component: 'lib-spaces-service', action: 'service_call' });
      throw updateError;
    }

    return { success: true, data: space };
  } catch (error) {
    logger.error('[spaces-service] updateSpace error:', error, { component: 'lib-spaces-service', action: 'service_call' });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update space'
    };
  }
}

/**
 * Delete a space (owner only)
 * @param spaceId - Space ID
 * @param userId - User ID (for authorization check)
 * @returns Success or error
 */
export async function deleteSpace(
  spaceId: string,
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    // Check if user is owner
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return {
        success: false,
        error: 'Only the space owner can delete the space'
      };
    }

    // Delete space (cascade will handle space_members)
    const { error: deleteError } = await supabase
      .from('spaces')
      .delete()
      .eq('id', spaceId);

    if (deleteError) {
      logger.error('[spaces-service] deleteSpace error:', deleteError, { component: 'lib-spaces-service', action: 'service_call' });
      throw deleteError;
    }

    return { success: true };
  } catch (error) {
    logger.error('[spaces-service] deleteSpace error:', error, { component: 'lib-spaces-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to delete space'
    };
  }
}

/**
 * Remove a member from a space (admin/owner only)
 * @param spaceId - Space ID
 * @param userId - User ID making the request
 * @param targetUserId - User ID to remove
 * @returns Success or error
 */
export async function removeMember(
  spaceId: string,
  userId: string,
  targetUserId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    // Check if requester is owner or admin
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return {
        success: false,
        error: 'You do not have permission to remove members'
      };
    }

    // Cannot remove the owner
    const { data: targetMember } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', targetUserId)
      .single();

    if (targetMember?.role === 'owner') {
      return {
        success: false,
        error: 'Cannot remove the space owner'
      };
    }

    // Remove member
    const { error: removeError } = await supabase
      .from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', targetUserId);

    if (removeError) {
      logger.error('[spaces-service] removeMember error:', removeError, { component: 'lib-spaces-service', action: 'service_call' });
      throw removeError;
    }

    return { success: true };
  } catch (error) {
    logger.error('[spaces-service] removeMember error:', error, { component: 'lib-spaces-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to remove member'
    };
  }
}

/**
 * Update a member's role (owner only)
 * @param spaceId - Space ID
 * @param userId - User ID making the request (must be owner)
 * @param targetUserId - User ID to update
 * @param newRole - New role (admin or member)
 * @returns Success or error
 */
export async function updateMemberRole(
  spaceId: string,
  userId: string,
  targetUserId: string,
  newRole: 'admin' | 'member'
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    // Check if requester is owner
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return {
        success: false,
        error: 'Only the space owner can change member roles'
      };
    }

    // Cannot change owner's role
    if (targetUserId === userId) {
      return {
        success: false,
        error: 'Cannot change your own role as owner'
      };
    }

    // Update role
    const { error: updateError } = await supabase
      .from('space_members')
      .update({ role: newRole })
      .eq('space_id', spaceId)
      .eq('user_id', targetUserId);

    if (updateError) {
      logger.error('[spaces-service] updateMemberRole error:', updateError, { component: 'lib-spaces-service', action: 'service_call' });
      throw updateError;
    }

    return { success: true };
  } catch (error) {
    logger.error('[spaces-service] updateMemberRole error:', error, { component: 'lib-spaces-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to update member role'
    };
  }
}

/**
 * Leave a space (cannot leave if you're the owner)
 * @param spaceId - Space ID
 * @param userId - User ID
 * @returns Success or error
 */
export async function leaveSpace(
  spaceId: string,
  userId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = createClient();

    // Check if user is owner
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership) {
      return {
        success: false,
        error: 'You are not a member of this space'
      };
    }

    if (membership.role === 'owner') {
      return {
        success: false,
        error: 'Space owners cannot leave. Transfer ownership or delete the space instead.'
      };
    }

    // Remove membership
    const { error: removeError } = await supabase
      .from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', userId);

    if (removeError) {
      logger.error('[spaces-service] leaveSpace error:', removeError, { component: 'lib-spaces-service', action: 'service_call' });
      throw removeError;
    }

    return { success: true };
  } catch (error) {
    logger.error('[spaces-service] leaveSpace error:', error, { component: 'lib-spaces-service', action: 'service_call' });
    return {
      success: false,
      error: 'Failed to leave space'
    };
  }
}
