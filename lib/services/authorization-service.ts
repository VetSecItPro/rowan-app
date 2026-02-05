import { createClient } from '@/lib/supabase/server';

/**
 * Authorization Service
 *
 * Provides authorization checks for API routes and server-side operations.
 * Used to verify user access to spaces and resources before performing operations.
 */

/**
 * Checks if a user is a member of a specific space.
 *
 * @param userId - The unique identifier of the user
 * @param spaceId - The unique identifier of the space to check membership for
 * @returns A promise that resolves to true if the user is a member, false otherwise
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
  } catch {
    return false;
  }
}

/**
 * Verifies that a user has access to a space, throwing an error if not.
 *
 * Use this function when you need to guard an operation that requires space membership.
 * The function will throw an error that can be caught and returned as an HTTP 403 response.
 *
 * @param userId - The unique identifier of the user
 * @param spaceId - The unique identifier of the space to verify access for
 * @returns A promise that resolves if access is granted
 * @throws {Error} If the user does not have access to the space
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
 * Verifies that a user has access to a resource by checking its associated space.
 *
 * Use this function when you have fetched a resource and need to verify the current
 * user is allowed to access it. The resource must have a space_id property.
 *
 * @param userId - The unique identifier of the user
 * @param resource - The resource object containing a space_id property, or null if not found
 * @returns A promise that resolves if access is granted
 * @throws {Error} If the resource is null (not found) or if the user lacks access to the resource's space
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
