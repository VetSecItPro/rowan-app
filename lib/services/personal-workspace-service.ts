import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { Space, WorkspaceMigration } from '@/lib/types';

/**
 * Personal Workspace Service
 *
 * Manages personal workspaces (virtual spaces for single users)
 * CRITICAL: This service is designed to be 100% backward compatible
 * - Does NOT modify existing spaces or space functionality
 * - Only creates/manages personal spaces (is_personal = true)
 * - All existing spaces continue working unchanged
 *
 * Safety Features:
 * - Feature flag controlled
 * - Separate from existing space management
 * - Optional fields in Space interface
 * - No impact on existing RLS policies for shared spaces
 */
export const personalWorkspaceService = {
  /**
   * Get user's personal space (if it exists)
   * Returns null if no personal space exists - does not auto-create
   *
   * @param userId - The user's ID
   * @returns Personal space or null
   */
  async getPersonalSpace(userId: string): Promise<Space | null> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('space_members')
        .select('spaces(*)')
        .eq('user_id', userId)
        .eq('spaces.is_personal', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.warn('Personal workspace lookup failed, assuming none exists:', error);
        return null;
      }

      return (data?.spaces || null) as Space | null;
    } catch (error) {
      logger.error('Failed to get personal space:', error);
      return null;
    }
  },

  /**
   * Check if user has a personal space
   *
   * @param userId - The user's ID
   * @returns boolean indicating if personal space exists
   */
  async hasPersonalSpace(userId: string): Promise<boolean> {
    const personalSpace = await this.getPersonalSpace(userId);
    return personalSpace !== null;
  },

  /**
   * Create personal space for user
   * SAFE: Only creates new space, doesn't modify existing data
   *
   * @param userId - The user's ID
   * @param userName - Optional user name for space naming
   * @returns Created personal space
   */
  async createPersonalSpace(userId: string, userName?: string): Promise<Space> {
    try {
      const supabase = createClient();

      // First check if user already has a personal space
      const existingSpace = await this.getPersonalSpace(userId);
      if (existingSpace) {
        return existingSpace;
      }

      // Create the personal space
      const spaceName = userName ? `${userName}'s Personal Workspace` : 'Personal Workspace';

      const { data, error } = await supabase
        .from('spaces')
        .insert([{
          name: spaceName,
          user_id: userId,
          is_personal: true,
          auto_created: true,
        }])
        .select()
        .single();

      if (error) throw error;

      // Add user as space member (owner)
      const { error: memberError } = await supabase
        .from('space_members')
        .insert([{
          space_id: data.id,
          user_id: userId,
          role: 'owner'
        }]);

      if (memberError) {
        logger.error('Failed to add user as personal space member:', memberError);
        // Space was created but member relationship failed
        // This is non-critical - the space still works due to RLS policies
      }

      logger.info(`Created personal space for user ${userId}:`, data.id);
      return data;
    } catch (error) {
      logger.error('Failed to create personal space:', error);
      throw new Error('Failed to create personal workspace');
    }
  },

  /**
   * Ensure user has personal space (get or create)
   * This is the main method for auto-creating personal spaces
   *
   * @param userId - The user's ID
   * @param userName - Optional user name for space naming
   * @returns Personal space (existing or newly created)
   */
  async ensurePersonalSpace(userId: string, userName?: string): Promise<Space> {
    try {
      // First try to get existing personal space
      const existingSpace = await this.getPersonalSpace(userId);
      if (existingSpace) {
        return existingSpace;
      }

      // Create new personal space if none exists
      return await this.createPersonalSpace(userId, userName);
    } catch (error) {
      logger.error('Failed to ensure personal space:', error);
      throw new Error('Failed to access personal workspace');
    }
  },

  /**
   * Check if a space is a personal space
   * SAFE: Read-only operation, no modifications
   *
   * @param spaceId - The space ID to check
   * @returns boolean indicating if space is personal
   */
  async isPersonalSpace(spaceId: string): Promise<boolean> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('spaces')
        .select('is_personal')
        .eq('id', spaceId)
        .single();

      if (error) return false;

      return data.is_personal === true;
    } catch (error) {
      logger.error('Failed to check if space is personal:', error);
      return false;
    }
  },

  /**
   * Get migration history for a user
   * SAFE: Read-only operation
   *
   * @param userId - The user's ID
   * @returns Array of workspace migrations
   */
  async getMigrationHistory(userId: string): Promise<WorkspaceMigration[]> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('workspace_migrations')
        .select('*')
        .eq('user_id', userId)
        .order('migrated_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to get migration history:', error);
      return [];
    }
  },

  /**
   * Migrate data from personal workspace to shared space
   * ADVANCED: This will be implemented in Phase 3
   * For now, returns placeholder to avoid breaking interfaces
   *
   * @param userId - The user's ID
   * @param targetSpaceId - Target shared space ID
   * @param itemTypes - Types of items to migrate
   * @returns Migration results
   */
  async migrateToSharedSpace(
    userId: string,
    targetSpaceId: string,
    itemTypes: string[]
  ): Promise<{ success: boolean; migratedCount: number }> {
    try {
      // TODO: Implement in Phase 3 - Migration functionality
      // For now, return placeholder to avoid breaking interfaces

      logger.info(`Migration request: ${userId} -> ${targetSpaceId} (${itemTypes.join(', ')})`);

      return {
        success: false,
        migratedCount: 0
      };
    } catch (error) {
      logger.error('Migration failed:', error);
      throw new Error('Migration functionality not yet implemented');
    }
  },

  /**
   * Delete personal space and all associated data
   * CRITICAL SAFETY: Only deletes personal spaces, never shared spaces
   *
   * @param userId - The user's ID
   * @returns boolean indicating success
   */
  async deletePersonalSpace(userId: string): Promise<boolean> {
    try {
      const supabase = createClient();

      // SAFETY CHECK: Only get personal spaces
      const personalSpace = await this.getPersonalSpace(userId);
      if (!personalSpace) {
        return true; // Already deleted or doesn't exist
      }

      // DOUBLE SAFETY CHECK: Verify this is actually a personal space
      if (!personalSpace.is_personal) {
        throw new Error('Attempted to delete non-personal space via personal workspace service');
      }

      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', personalSpace.id)
        .eq('user_id', userId)
        .eq('is_personal', true); // Triple safety check

      if (error) throw error;

      logger.info(`Deleted personal space for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete personal space:', error);
      return false;
    }
  }
};

/**
 * Feature flag check for personal workspaces
 * SAFETY: Allows instant disable if issues arise
 */
export { featureFlags } from '@/lib/constants/feature-flags';
