/**
 * Check-in Service — CRUD operations for goal check-ins, settings, and photos.
 *
 * @module goals/checkin-service
 */

import { createClient } from '@/lib/supabase/client';
import { checkAndAwardBadges } from '../achievement-service';
import { logger } from '@/lib/logger';
import { goalService } from './goal-service';
import type {
  Goal,
  GoalCheckIn,
  GoalCheckInPhoto,
  GoalCheckInSettings,
  CreateCheckInInput,
  UpdateCheckInSettingsInput,
} from './types';

export const checkinService = {
  /**
   * Creates a check-in for a goal to track progress and mood.
   * Supports photos, voice notes, and optional scheduled check-ins.
   * Triggers badge checks after creation.
   * @param input - Check-in data including goal_id, progress_percentage, and mood
   * @returns The created check-in record
   * @throws Error if user is not authenticated or database insert fails
   */
  async createCheckIn(input: CreateCheckInInput): Promise<GoalCheckIn> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Remove photos from input as they need to be handled separately
    const { photos, ...checkInData } = input;

    const { data, error } = await supabase
      .from('goal_check_ins')
      .insert([{
        ...checkInData,
        user_id: user.id,
        check_in_type: input.check_in_type || 'manual',
      }])
      .select(`
        *,
        goal:goals!goal_id!inner(space_id)
      `)
      .single();

    if (error) throw error;

    // Handle photo uploads if provided
    if (photos && photos.length > 0) {
      await this.uploadCheckInPhotos(data.id, photos);
    }

    // Check for badge awards after check-in (for streak badges)
    if (data.goal?.space_id) {
      try {
        checkAndAwardBadges(user.id, data.goal.space_id).catch((error) => logger.error('Caught error', error, { component: 'lib-goals-service', action: 'service_call' }));
      } catch (error) {
        logger.error('Failed to check for achievement badges:', error, { component: 'lib-goals-service', action: 'service_call' });
      }
    }

    return data;
  },

  /**
   * Retrieves all check-ins for a goal.
   * @param goalId - The goal ID
   * @returns Array of check-ins sorted by creation date descending
   * @throws Error if the database query fails
   */
  async getGoalCheckIns(goalId: string): Promise<GoalCheckIn[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_check_ins')
      .select('id, goal_id, user_id, progress_percentage, mood, notes, blockers, need_help_from_partner, voice_note_url, voice_note_duration, check_in_type, scheduled_date, created_at, updated_at')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Retrieves a single check-in by ID.
   * @param id - The check-in ID
   * @returns The check-in or null if not found
   * @throws Error if the database query fails
   */
  async getCheckInById(id: string): Promise<GoalCheckIn | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_check_ins')
      .select('id, goal_id, user_id, progress_percentage, mood, notes, blockers, need_help_from_partner, voice_note_url, voice_note_duration, check_in_type, scheduled_date, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Retrieves all photos for a check-in.
   * @param checkInId - The check-in ID
   * @returns Array of photos sorted by order_index ascending
   * @throws Error if the database query fails
   */
  async getCheckInPhotos(checkInId: string): Promise<GoalCheckInPhoto[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_check_in_photos')
      .select('id, check_in_id, photo_url, caption, order_index, created_at')
      .eq('check_in_id', checkInId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Uploads photos for a check-in to storage.
   * @param checkInId - The check-in ID to attach photos to
   * @param photos - Array of File objects to upload
   * @returns Array of created photo records
   */
  async uploadCheckInPhotos(checkInId: string, photos: File[]): Promise<GoalCheckInPhoto[]> {
    const supabase = createClient();
    const uploadedPhotos: GoalCheckInPhoto[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const fileExt = photo.name.split('.').pop();
      const fileName = `${checkInId}_${Date.now()}_${i}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('goal-check-in-photos')
        .upload(fileName, photo);

      if (uploadError) {
        logger.error('Photo upload error:', uploadError, { component: 'lib-goals-service', action: 'service_call' });
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('goal-check-in-photos')
        .getPublicUrl(fileName);

      // Save to database
      const { data: photoData, error: photoError } = await supabase
        .from('goal_check_in_photos')
        .insert([{
          check_in_id: checkInId,
          photo_url: publicUrl,
          order_index: i,
        }])
        .select()
        .single();

      if (photoError) {
        logger.error('Photo database error:', photoError, { component: 'lib-goals-service', action: 'service_call' });
        continue;
      }

      uploadedPhotos.push(photoData);
    }

    return uploadedPhotos;
  },

  /**
   * Updates a check-in with the provided changes.
   * @param id - The check-in ID to update
   * @param updates - Partial check-in data to apply
   * @returns The updated check-in
   * @throws Error if the database update fails
   */
  async updateCheckIn(id: string, updates: Partial<CreateCheckInInput>): Promise<GoalCheckIn> {
    const supabase = createClient();

    // Remove photos from updates as they need to be handled separately
    const checkInUpdates = { ...updates };
    delete checkInUpdates.photos;

    const { data, error } = await supabase
      .from('goal_check_ins')
      .update(checkInUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Permanently deletes a check-in.
   * @param id - The check-in ID to delete
   * @throws Error if the database delete fails
   */
  async deleteCheckIn(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('goal_check_ins')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Check-in settings methods

  /**
   * Retrieves check-in settings for a goal and user.
   * @param goalId - The goal ID
   * @param userId - Optional user ID (defaults to current authenticated user)
   * @returns The settings or null if not configured
   * @throws Error if user is not authenticated or database query fails
   */
  async getCheckInSettings(goalId: string, userId?: string): Promise<GoalCheckInSettings | null> {
    const supabase = createClient();
    let query = supabase
      .from('goal_check_in_settings')
      .select('id, goal_id, user_id, frequency, day_of_week, day_of_month, reminder_time, enable_reminders, enable_voice_notes, enable_photos, reminder_days_before, auto_schedule, created_at, updated_at')
      .eq('goal_id', goalId);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  /**
   * Updates or creates check-in settings for a goal.
   * Creates default settings if none exist.
   * @param input - Settings data including goal_id and optional frequency, reminders, etc.
   * @returns The updated or created settings
   * @throws Error if user is not authenticated or database operation fails
   */
  async updateCheckInSettings(input: UpdateCheckInSettingsInput): Promise<GoalCheckInSettings> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { goal_id, ...settings } = input;

    // Try to update existing settings first
    const { data: existingData, error: updateError } = await supabase
      .from('goal_check_in_settings')
      .update(settings)
      .eq('goal_id', goal_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (!updateError) return existingData;

    // If no existing settings, create new ones
    const { data, error } = await supabase
      .from('goal_check_in_settings')
      .insert([{
        goal_id,
        user_id: user.id,
        frequency: 'weekly',
        day_of_week: 1, // Monday
        reminder_time: '09:00:00',
        enable_reminders: true,
        enable_voice_notes: true,
        enable_photos: true,
        ...settings,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Retrieves upcoming check-ins across all active goals in a space.
   * Calculates next due dates based on each goal's check-in settings.
   *
   * Next due date calculation by frequency:
   * - daily: Tomorrow
   * - weekly: Next occurrence of day_of_week (if today, use next week)
   * - biweekly: 14 days from now (simplified)
   * - monthly: Next occurrence of day_of_month (if past, next month)
   *
   * The weekly calculation uses modular arithmetic to find days until target:
   *   daysUntil = (targetDay - currentDay + 7) % 7
   *   If result is 0 (today is the target day), add 7 to get next week
   *
   * @param spaceId - The space ID
   * @returns Array of upcoming check-ins sorted by next due date ascending
   * @throws Error if user is not authenticated
   */
  async getUpcomingCheckIns(spaceId: string): Promise<Array<{ goal: Goal; settings: GoalCheckInSettings; nextDue: Date }>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const goals = await goalService.getGoals(spaceId);
    const upcomingCheckIns: Array<{ goal: Goal; settings: GoalCheckInSettings; nextDue: Date }> = [];

    for (const goal of goals) {
      // Only active goals need check-ins
      if (goal.status !== 'active') continue;

      const settings = await this.getCheckInSettings(goal.id, user.id);
      if (!settings || !settings.enable_reminders) continue;

      const now = new Date();
      let nextDue: Date;

      switch (settings.frequency) {
        case 'daily':
          // Simple: always tomorrow
          nextDue = new Date(now);
          nextDue.setDate(now.getDate() + 1);
          break;
        case 'weekly':
          // Find next occurrence of target day (0=Sun, 6=Sat)
          nextDue = new Date(now);
          // Modular arithmetic: days until target day
          const daysUntilTarget = (settings.day_of_week! - now.getDay() + 7) % 7;
          // If 0, target is today - schedule for next week instead
          nextDue.setDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
          break;
        case 'biweekly':
          // Simplified: 14 days from now (doesn't track which week we're on)
          nextDue = new Date(now);
          nextDue.setDate(now.getDate() + 14);
          break;
        case 'monthly':
          nextDue = new Date(now);
          if (settings.day_of_month) {
            nextDue.setDate(settings.day_of_month);
            if (nextDue <= now) {
              nextDue.setMonth(nextDue.getMonth() + 1);
            }
          } else {
            nextDue.setMonth(now.getMonth() + 1);
          }
          break;
        default:
          continue;
      }

      // Set the reminder time
      const [hours, minutes] = settings.reminder_time.split(':');
      nextDue.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      upcomingCheckIns.push({ goal, settings, nextDue });
    }

    // Sort by next due date
    return upcomingCheckIns.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
  },
};
