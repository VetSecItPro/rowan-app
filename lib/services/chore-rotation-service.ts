import { createClient } from '@/lib/supabase/client';

type ChoreRotation = {
  id: string;
  chore_id: string;
  rotation_name: string;
  rotation_type: string;
  user_order: string[];
  rotation_frequency: string;
  next_rotation_date: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
};

type ChoreRotationUpdate = Partial<Omit<ChoreRotation, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Chore Rotation Service
 *
 * Manages automated chore rotations between household members.
 * Supports different rotation frequencies (daily, weekly, biweekly) and rotation types.
 */
export const choreRotationService = {
  /**
   * Creates a new rotation schedule for a chore.
   * @param choreId - The chore identifier to create a rotation for
   * @param userIds - Array of user IDs in rotation order
   * @param frequency - Rotation frequency (daily, weekly, biweekly)
   * @param rotationType - Type of rotation schedule
   * @param createdBy - User ID of the creator
   * @returns The newly created rotation schedule
   * @throws Error if database insert fails
   *
   * Creates a rotation schedule for a chore.
   *
   * Algorithm: Calculate next rotation date based on frequency.
   * - daily: +1 day, weekly: +7 days, biweekly/other: +14 days
   * The user_order array determines who does the chore next (round-robin).
   */
  async createRotation(choreId: string, userIds: string[], frequency: string, rotationType: string, createdBy: string): Promise<ChoreRotation> {
    const supabase = createClient();
    // Calculate next rotation: frequency determines days until first rotation
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 14));

    const { data, error } = await supabase.from('chore_rotations').insert({
      chore_id: choreId,
      rotation_name: `Rotation for ${choreId}`,
      rotation_type: rotationType,
      user_order: userIds,
      rotation_frequency: frequency,
      next_rotation_date: nextDate.toISOString().split('T')[0],
      created_by: createdBy,
    }).select().single();
    if (error) throw error;
    return data;
  },

  /**
   * Retrieves the rotation schedule for a chore.
   * @param choreId - The chore identifier
   * @returns The rotation schedule or null if none exists
   * @throws Error if database query fails (except for not found)
   */
  async getRotation(choreId: string): Promise<ChoreRotation | null> {
    const supabase = createClient();
    const { data, error } = await supabase.from('chore_rotations').select('id, chore_id, rotation_name, rotation_type, user_order, rotation_frequency, next_rotation_date, created_by, created_at, updated_at').eq('chore_id', choreId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Updates an existing rotation schedule.
   * @param rotationId - The rotation schedule identifier
   * @param updates - Partial rotation data to update
   * @returns The updated rotation schedule
   * @throws Error if database update fails
   */
  async updateRotation(rotationId: string, updates: ChoreRotationUpdate): Promise<ChoreRotation> {
    const supabase = createClient();
    const { data, error } = await supabase.from('chore_rotations').update(updates).eq('id', rotationId).select().single();
    if (error) throw error;
    return data;
  },

  /**
   * Processes all pending chore rotations via database RPC.
   * Typically invoked by a scheduled cron job.
   */
  async processRotations(): Promise<void> {
    const supabase = createClient();
    await supabase.rpc('process_chore_rotations');
  },

  /**
   * Deletes a rotation schedule.
   * @param rotationId - The rotation schedule identifier
   * @throws Error if database delete fails
   */
  async deleteRotation(rotationId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('chore_rotations').delete().eq('id', rotationId);
    if (error) throw error;
  },
};
