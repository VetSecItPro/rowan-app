import { createClient } from '@/lib/supabase/client';
import type { UserProgress, UpdateUserProgressInput } from '@/lib/types';

/**
 * Get user progress for tracking onboarding completion
 * @param userId - User UUID
 * @returns User progress record or null
 */
export async function getUserProgress(userId: string): Promise<{
  success: boolean;
  data?: UserProgress | null;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('[userProgressService] getUserProgress error:', error);
    return { success: false, error: 'Failed to fetch user progress' };
  }
}

/**
 * Create initial user progress record
 * @param userId - User UUID
 * @param spaceId - Space UUID (optional)
 * @returns Created user progress record
 */
export async function createUserProgress(
  userId: string,
  spaceId?: string | null
): Promise<{
  success: boolean;
  data?: UserProgress;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        space_id: spaceId || null,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('[userProgressService] createUserProgress error:', error);
    return { success: false, error: 'Failed to create user progress' };
  }
}

/**
 * Update user progress
 * @param userId - User UUID
 * @param updates - Fields to update
 * @returns Updated user progress record
 */
export async function updateUserProgress(
  userId: string,
  updates: UpdateUserProgressInput
): Promise<{
  success: boolean;
  data?: UserProgress;
  error?: string;
}> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_progress')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    // If no row was updated, try to create one
    if (!data) {
      const createResult = await createUserProgress(userId);
      if (!createResult.success || !createResult.data) {
        return { success: false, error: 'User progress record not found and could not be created' };
      }

      // Now update the newly created record
      const { data: updatedData, error: updateError } = await supabase
        .from('user_progress')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;
      return { success: true, data: updatedData || undefined };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[userProgressService] updateUserProgress error:', error);
    return { success: false, error: 'Failed to update user progress' };
  }
}

/**
 * Get or create user progress
 * Ensures a user progress record exists for the given user
 * @param userId - User UUID
 * @param spaceId - Space UUID (optional)
 * @returns User progress record
 */
export async function getOrCreateUserProgress(
  userId: string,
  spaceId?: string | null
): Promise<{
  success: boolean;
  data?: UserProgress;
  error?: string;
}> {
  try {
    // Try to get existing progress
    const existingProgress = await getUserProgress(userId);

    if (existingProgress.success && existingProgress.data && existingProgress.data !== null) {
      return { success: true, data: existingProgress.data };
    }

    // Create new progress if doesn't exist
    return await createUserProgress(userId, spaceId);
  } catch (error) {
    console.error('[userProgressService] getOrCreateUserProgress error:', error);
    return { success: false, error: 'Failed to get or create user progress' };
  }
}

/**
 * TEMPORARY PLACEHOLDER: Mark flow complete
 * TODO: Implement proper flow completion tracking
 * @param userId - User UUID
 * @param flowType - Type of flow completed
 */
export async function markFlowComplete(userId: string, flowType: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Placeholder implementation - just log for now
    console.log(`Flow '${flowType}' marked complete for user ${userId}`);

    // TODO: Implement actual flow completion tracking in database
    return { success: true };
  } catch (error) {
    console.error('[userProgressService] markFlowComplete error:', error);
    return { success: false, error: 'Failed to mark flow complete' };
  }
}

/**
 * TEMPORARY PLACEHOLDER: Mark flow skipped
 * TODO: Implement proper flow skip tracking
 * @param userId - User UUID
 * @param flowType - Type of flow skipped
 */
export async function markFlowSkipped(userId: string, flowType: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Placeholder implementation - just log for now
    console.log(`Flow '${flowType}' marked skipped for user ${userId}`);

    // TODO: Implement actual flow skip tracking in database
    return { success: true };
  } catch (error) {
    console.error('[userProgressService] markFlowSkipped error:', error);
    return { success: false, error: 'Failed to mark flow skipped' };
  }
}
