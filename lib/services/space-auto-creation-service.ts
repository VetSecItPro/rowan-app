'use client';

import { createClient } from '@/lib/supabase/client';
import { createSpace } from '@/lib/services/spaces-service';

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
      console.error('Error checking existing spaces:', spacesError);
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
    console.log('[auto-space] Creating default space for user:', user.id);

    const defaultSpaceName = "My Space";
    const spaceResult = await createSpace(defaultSpaceName, user.id);

    if (!spaceResult.success) {
      console.error('[auto-space] Failed to create default space:', spaceResult.error);
      return {
        success: false,
        error: spaceResult.error || 'Failed to create default space'
      };
    }

    console.log('[auto-space] Successfully created default space:', spaceResult.data?.id);

    return {
      success: true,
      spaceId: spaceResult.data?.id
    };

  } catch (error) {
    console.error('[auto-space] Unexpected error:', error);
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
    const spaceName = customName || "My Space";
    const spaceResult = await createSpace(spaceName, userId);

    if (!spaceResult.success) {
      return {
        success: false,
        error: spaceResult.error || 'Failed to create space'
      };
    }

    return {
      success: true,
      spaceId: spaceResult.data?.id
    };

  } catch (error) {
    console.error('[auto-space] Error creating default space:', error);
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