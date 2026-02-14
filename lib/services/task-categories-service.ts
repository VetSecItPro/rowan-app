import { createClient } from '@/lib/supabase/client';

export interface TaskCategory {
  id: string;
  space_id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Service for CRUD operations on task categories from the task_categories table. */
export const taskCategoriesService = {
  async getCategories(spaceId: string): Promise<TaskCategory[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_categories').select('id, space_id, name, color, icon, description, sort_order, created_by, created_at, updated_at').eq('space_id', spaceId).order('sort_order');
    if (error) throw error;
    return data || [];
  },

  async createCategory(spaceId: string, name: string, color: string, icon: string, userId: string): Promise<TaskCategory> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_categories').insert({
      space_id: spaceId, name, color, icon, created_by: userId
    }).select().single();
    if (error) throw error;
    return data;
  },

  async updateCategory(categoryId: string, updates: Partial<TaskCategory>): Promise<TaskCategory> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_categories').update(updates).eq('id', categoryId).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCategory(categoryId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('task_categories').delete().eq('id', categoryId);
    if (error) throw error;
  },

  async reorderCategories(categoryIds: string[]): Promise<void> {
    const supabase = createClient();
    for (let i = 0; i < categoryIds.length; i++) {
      await supabase.from('task_categories').update({ sort_order: i }).eq('id', categoryIds[i]);
    }
  },
};
