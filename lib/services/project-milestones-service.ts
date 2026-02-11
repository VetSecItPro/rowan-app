import { createClient } from '@/lib/supabase/client';

export interface ProjectMilestone {
  id: string;
  project_id: string;
  space_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMilestoneInput {
  project_id: string;
  space_id: string;
  title: string;
  description?: string;
  due_date?: string;
  sort_order?: number;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  sort_order?: number;
}

/**
 * Project Milestones Service
 * Handles CRUD operations for project milestones/steps
 */
export const projectMilestonesService = {
  /**
   * Get all milestones for a project
   */
  async getMilestones(projectId: string): Promise<ProjectMilestone[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_milestones')
      .select('id, project_id, space_id, title, description, is_completed, completed_at, due_date, sort_order, created_at, updated_at')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get milestone progress for a project
   */
  async getMilestoneProgress(projectId: string): Promise<{ total: number; completed: number; percentage: number }> {
    const milestones = await this.getMilestones(projectId);
    const total = milestones.length;
    const completed = milestones.filter(m => m.is_completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  },

  /**
   * Create a new milestone
   */
  async createMilestone(input: CreateMilestoneInput): Promise<ProjectMilestone> {
    const supabase = createClient();

    // Get the max sort_order for this project
    const { data: existing } = await supabase
      .from('project_milestones')
      .select('sort_order')
      .eq('project_id', input.project_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabase
      .from('project_milestones')
      .insert([{
        ...input,
        sort_order: input.sort_order ?? nextSortOrder,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a milestone
   */
  async updateMilestone(id: string, updates: UpdateMilestoneInput): Promise<ProjectMilestone> {
    const supabase = createClient();

    // If marking as completed, set completed_at
    const updateData: Record<string, unknown> = { ...updates };
    if (updates.is_completed === true) {
      updateData.completed_at = new Date().toISOString();
    } else if (updates.is_completed === false) {
      updateData.completed_at = null;
    }

    const { data, error } = await supabase
      .from('project_milestones')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Toggle milestone completion status
   */
  async toggleMilestone(id: string): Promise<ProjectMilestone> {
    const supabase = createClient();

    // Get current state
    const { data: current, error: fetchError } = await supabase
      .from('project_milestones')
      .select('is_completed')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    return this.updateMilestone(id, { is_completed: !current.is_completed });
  },

  /**
   * Delete a milestone
   */
  async deleteMilestone(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('project_milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Reorder milestones
   */
  async reorderMilestones(projectId: string, milestoneIds: string[]): Promise<void> {
    const supabase = createClient();

    // Update sort_order for each milestone
    const updates = milestoneIds.map((id, index) =>
      supabase
        .from('project_milestones')
        .update({ sort_order: index })
        .eq('id', id)
    );

    await Promise.all(updates);
  },

  /**
   * Create multiple milestones at once (for initial project setup)
   */
  async createManyMilestones(milestones: CreateMilestoneInput[]): Promise<ProjectMilestone[]> {
    const supabase = createClient();

    const milestonesWithOrder = milestones.map((m, index) => ({
      ...m,
      sort_order: m.sort_order ?? index,
    }));

    const { data, error } = await supabase
      .from('project_milestones')
      .insert(milestonesWithOrder)
      .select();

    if (error) throw error;
    return data || [];
  },
};
