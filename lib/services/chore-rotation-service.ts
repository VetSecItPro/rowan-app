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

export const choreRotationService = {
  async createRotation(choreId: string, userIds: string[], frequency: string, rotationType: string, createdBy: string): Promise<ChoreRotation> {
    const supabase = createClient();
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

  async getRotation(choreId: string): Promise<ChoreRotation | null> {
    const supabase = createClient();
    const { data, error } = await supabase.from('chore_rotations').select('*').eq('chore_id', choreId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateRotation(rotationId: string, updates: ChoreRotationUpdate): Promise<ChoreRotation> {
    const supabase = createClient();
    const { data, error } = await supabase.from('chore_rotations').update(updates).eq('id', rotationId).select().single();
    if (error) throw error;
    return data;
  },

  async processRotations(): Promise<void> {
    const supabase = createClient();
    await supabase.rpc('process_chore_rotations');
  },

  async deleteRotation(rotationId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('chore_rotations').delete().eq('id', rotationId);
    if (error) throw error;
  },
};
