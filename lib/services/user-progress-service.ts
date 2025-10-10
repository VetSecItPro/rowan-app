import { createClient } from '@/lib/supabase/server';
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
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - that's okay
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
 * @param partnershipId - Partnership UUID (optional)
 * @returns Created user progress record
 */
export async function createUserProgress(
  userId: string,
  partnershipId?: string | null
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
        partnership_id: partnershipId || null,
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
 * Update user progress (mark guided flows as complete)
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
      .single();

    if (error) throw error;

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
 * @param partnershipId - Partnership UUID (optional)
 * @returns User progress record
 */
export async function getOrCreateUserProgress(
  userId: string,
  partnershipId?: string | null
): Promise<{
  success: boolean;
  data?: UserProgress;
  error?: string;
}> {
  try {
    // Try to get existing progress
    const existingProgress = await getUserProgress(userId);

    if (existingProgress.success && existingProgress.data) {
      return existingProgress;
    }

    // Create new progress if doesn't exist
    return await createUserProgress(userId, partnershipId);
  } catch (error) {
    console.error('[userProgressService] getOrCreateUserProgress error:', error);
    return { success: false, error: 'Failed to get or create user progress' };
  }
}

/**
 * Mark a specific guided flow as completed
 * @param userId - User UUID
 * @param flowType - Type of guided flow completed
 * @returns Updated user progress
 */
export async function markFlowComplete(
  userId: string,
  flowType:
    | 'first_task_created'
    | 'first_event_created'
    | 'first_reminder_created'
    | 'first_message_sent'
    | 'first_shopping_item_added'
    | 'first_meal_planned'
    | 'first_household_task_created'
    | 'first_goal_set'
): Promise<{
  success: boolean;
  data?: UserProgress;
  error?: string;
}> {
  return updateUserProgress(userId, { [flowType]: true });
}

/**
 * Check if all onboarding flows are complete
 * @param userId - User UUID
 * @returns Whether onboarding is complete
 */
export async function checkOnboardingComplete(userId: string): Promise<{
  success: boolean;
  isComplete: boolean;
  error?: string;
}> {
  try {
    const progressResult = await getUserProgress(userId);

    if (!progressResult.success || !progressResult.data) {
      return { success: true, isComplete: false };
    }

    const progress = progressResult.data;

    // Onboarding is complete if user has created at least one item in 3+ features
    const completedFlows = [
      progress.first_task_created,
      progress.first_event_created,
      progress.first_reminder_created,
      progress.first_message_sent,
      progress.first_shopping_item_added,
      progress.first_meal_planned,
      progress.first_household_task_created,
      progress.first_goal_set,
    ].filter(Boolean).length;

    const isComplete = completedFlows >= 3;

    // Update onboarding_completed if threshold met
    if (isComplete && !progress.onboarding_completed) {
      await updateUserProgress(userId, { onboarding_completed: true });
    }

    return { success: true, isComplete };
  } catch (error) {
    console.error('[userProgressService] checkOnboardingComplete error:', error);
    return { success: false, isComplete: false, error: 'Failed to check onboarding status' };
  }
}
