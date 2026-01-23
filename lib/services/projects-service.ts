import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project } from '@/lib/services/project-tracking-service';
import { logger } from '@/lib/logger';

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

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

/**
 * Helper to clean input - convert empty strings to null for date fields
 */
function cleanProjectInput(input: Partial<CreateProjectInput>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = { ...input };

  // Convert empty strings to null for date fields
  if ('start_date' in cleaned && cleaned.start_date === '') {
    cleaned.start_date = null;
  }
  if ('target_date' in cleaned && cleaned.target_date === '') {
    cleaned.target_date = null;
  }

  return cleaned;
}

/**
 * Projects Service
 * Handles all project CRUD operations and stats
 */
export const projectsOnlyService = {
  /**
   * Get all projects for a space
   */
  async getProjects(spaceId: string, supabaseClient?: SupabaseClient): Promise<Project[]> {
    const supabase = getSupabaseClient(supabaseClient);
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
  async getProjectById(id: string, supabaseClient?: SupabaseClient): Promise<Project | null> {
    const supabase = getSupabaseClient(supabaseClient);
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
  async createProject(input: CreateProjectInput, supabaseClient?: SupabaseClient): Promise<Project> {
    const supabase = getSupabaseClient(supabaseClient);
    const cleaned = cleanProjectInput(input);

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...cleaned,
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
  async updateProject(id: string, updates: Partial<CreateProjectInput>, supabaseClient?: SupabaseClient): Promise<Project> {
    const supabase = getSupabaseClient(supabaseClient);
    const cleaned = cleanProjectInput(updates);

    const { data, error } = await supabase
      .from('projects')
      .update({
        ...cleaned,
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
  async deleteProject(id: string, supabaseClient?: SupabaseClient): Promise<void> {
    const supabase = getSupabaseClient(supabaseClient);
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
        inProgress: projects.filter(p => p.status === 'in-progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        onHold: projects.filter(p => p.status === 'on-hold').length,
        totalBudget: projects.reduce((sum, p) => sum + ((p as { budget_amount?: number }).budget_amount || p.estimated_budget || 0), 0),
      };
    } catch (error) {
      logger.error('getProjectStats error:', error, { component: 'lib-projects-service', action: 'service_call' });
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
