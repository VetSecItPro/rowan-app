import { createClient } from '@/lib/supabase/server';

/**
 * Authorization Service
 * Provides authorization checks for API routes
 */

/**
 * Check if a user is a member of a space
 * @param userId - The user's ID
 * @param spaceId - The space ID to check
 * @returns boolean indicating if user has access
 */
export async function isUserSpaceMember(
  userId: string,
  spaceId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('space_members')
      .select('user_id')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verify user has access to a space, throw error if not
 * @param userId - The user's ID
 * @param spaceId - The space ID to check
 * @throws Error if user doesn't have access
 */
export async function verifySpaceAccess(
  userId: string,
  spaceId: string
): Promise<void> {
  const hasAccess = await isUserSpaceMember(userId, spaceId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this space');
  }
}

/**
 * Verify user has access to a resource's space
 * @param userId - The user's ID
 * @param resource - Resource with space_id property
 * @throws Error if user doesn't have access
 */
export async function verifyResourceAccess(
  userId: string,
  resource: { space_id: string } | null
): Promise<void> {
  if (!resource) {
    throw new Error('Resource not found');
  }

  await verifySpaceAccess(userId, resource.space_id);
}
