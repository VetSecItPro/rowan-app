import { createClient } from '@/lib/supabase/client';
import type { Project } from '@/lib/types';

export interface CreateProjectInput {
  space_id: string;
  name: string;
  description?: string;
  status?: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  start_date?: string;
  target_date?: string;
  budget_amount?: number;
}

export interface ProjectStats {
  total: number;
  planning: number;
  inProgress: number;
  completed: number;
  onHold: number;
  totalBudget: number;
}

/**
 * Projects Service
 * Handles all project CRUD operations and stats
 */
export const projectsOnlyService = {
  /**
   * Get all projects for a space
   */
  async getProjects(spaceId: string): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single project by ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...input,
        status: input.status || 'planning',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing project
   */
  async updateProject(id: string, updates: Partial<CreateProjectInput>): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get project statistics for dashboard
   */
  async getProjectStats(spaceId: string): Promise<ProjectStats> {
    try {
      const projects = await this.getProjects(spaceId);

      return {
        total: projects.length,
        planning: projects.filter(p => p.status === 'planning').length,
        inProgress: projects.filter(p => p.status === 'in_progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        onHold: projects.filter(p => p.status === 'on_hold').length,
        totalBudget: projects.reduce((sum, p) => sum + (p.budget_amount || 0), 0),
      };
    } catch (error) {
      console.error('getProjectStats error:', error);
      return {
        total: 0,
        planning: 0,
        inProgress: 0,
        completed: 0,
        onHold: 0,
        totalBudget: 0,
      };
    }
  },
};
