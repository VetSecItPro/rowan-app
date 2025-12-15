'use client';

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface AutoSpaceResult {
  success: boolean;
  spaceId?: string;
  error?: string;
}

/**
 * Ensures user has at least one space, creating a default one if needed.
 * This enables seamless UX where users can immediately create content
 * without being forced to create a space first.
 */
export async function ensureUserHasSpace(): Promise<AutoSpaceResult> {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Check if user already has any spaces
    const { data: existingSpaces, error: spacesError } = await supabase
      .from('space_members')
      .select(`
        space_id,
        spaces (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (spacesError) {
      logger.error('Error checking existing spaces:', spacesError, { component: 'lib-space-auto-creation-service', action: 'service_call' });
      return {
        success: false,
        error: 'Failed to check existing spaces'
      };
    }

    // If user already has spaces, return the first one
    if (existingSpaces && existingSpaces.length > 0) {
      const firstSpace = existingSpaces[0];
      return {
        success: true,
        spaceId: firstSpace.space_id
      };
    }

    // User has no spaces - create a default one
    logger.info('[auto-space] Creating default space for user:', { component: 'lib-space-auto-creation-service', data: user.id });

    const defaultSpaceName = "My Space";

    // Create space directly using client
    const { data: newSpace, error: spaceError } = await supabase
      .from('spaces')
      .insert({
        name: defaultSpaceName,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (spaceError || !newSpace) {
      logger.error('[auto-space] Failed to create default space:', spaceError, { component: 'lib-space-auto-creation-service', action: 'service_call' });
      return {
        success: false,
        error: spaceError?.message || 'Failed to create default space'
      };
    }

    // Add user as owner of the space
    const { error: memberError } = await supabase
      .from('space_members')
      .insert({
        space_id: newSpace.id,
        user_id: user.id,
        role: 'owner',
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      logger.error('[auto-space] Failed to add user to space:', memberError, { component: 'lib-space-auto-creation-service', action: 'service_call' });
      return {
        success: false,
        error: memberError.message || 'Failed to add user to space'
      };
    }

    logger.info('[auto-space] Successfully created default space:', { component: 'lib-space-auto-creation-service', data: newSpace.id });

    return {
      success: true,
      spaceId: newSpace.id
    };

  } catch (error) {
    logger.error('[auto-space] Unexpected error:', error, { component: 'lib-space-auto-creation-service', action: 'service_call' });
    return {
      success: false,
      error: 'Unexpected error during space creation'
    };
  }
}

/**
 * Creates a default space with a user-friendly name.
 * Used when we need to ensure a space exists for content creation.
 */
export async function createDefaultSpace(userId: string, customName?: string): Promise<AutoSpaceResult> {
  try {
    const supabase = createClient();
    const spaceName = customName || "My Space";

    // Create space directly using client
    const { data: newSpace, error: spaceError } = await supabase
      .from('spaces')
      .insert({
        name: spaceName,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (spaceError || !newSpace) {
      return {
        success: false,
        error: spaceError?.message || 'Failed to create space'
      };
    }

    // Add user as owner of the space
    const { error: memberError } = await supabase
      .from('space_members')
      .insert({
        space_id: newSpace.id,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      return {
        success: false,
        error: memberError.message || 'Failed to add user to space'
      };
    }

    return {
      success: true,
      spaceId: newSpace.id
    };

  } catch (error) {
    logger.error('[auto-space] Error creating default space:', error, { component: 'lib-space-auto-creation-service', action: 'service_call' });
    return {
      success: false,
      error: 'Unexpected error during space creation'
    };
  }
}

/**
 * Helper function to get or create a space for content creation.
 * This is the main function that modals should call.
 */
export async function getOrCreateSpaceForContent(): Promise<AutoSpaceResult> {
  return await ensureUserHasSpace();
}