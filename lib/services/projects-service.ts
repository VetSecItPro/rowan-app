import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project } from '@/lib/services/project-tracking-service';
import { logger } from '@/lib/logger';

export interface CreateProjectInput {
  space_id: string;
  name: string;
  description?: string;
  status?: 'planning' | 'in-progress' | 'completed' | 'on-hold' | 'cancelled';
  start_date?: string;
  target_date?: string;
  budget_amount?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  location?: string;
  tags?: string[];
  created_by?: string;
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
 *
 * Manages household projects with status tracking, budgets, and timelines.
 * Provides CRUD operations and dashboard statistics.
 */
export const projectsOnlyService = {
  /**
   * Retrieves all projects for a space.
   * @param spaceId - The space identifier
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns Array of projects sorted by creation date (newest first)
   * @throws Error if database query fails
   */
  async getProjects(spaceId: string, supabaseClient?: SupabaseClient): Promise<Project[]> {
    const supabase = getSupabaseClient(supabaseClient);
    // FIX-308: Add limit to prevent unbounded query
    const { data, error } = await supabase
      .from('projects')
      .select('id, space_id, name, description, status, start_date, target_date, budget_amount, created_by, created_at, updated_at')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    return data || [];
  },

  /**
   * Retrieves a single project by ID.
   * @param id - The project identifier
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns The project or null if not found
   * @throws Error if database query fails
   */
  async getProjectById(id: string, supabaseClient?: SupabaseClient): Promise<Project | null> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('projects')
      .select('id, space_id, name, description, status, start_date, target_date, budget_amount, created_by, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Creates a new project with optional budget and timeline.
   * @param input - Project creation data including name and optional dates/budget
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns The newly created project
   * @throws Error if database insert fails
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
   * Updates an existing project.
   * @param id - The project identifier
   * @param updates - Partial project data to update
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns The updated project
   * @throws Error if database update fails
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
   * Deletes a project.
   * @param id - The project identifier
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @throws Error if database delete fails
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
   * Retrieves project statistics for dashboard display.
   * @param spaceId - The space identifier
   * @returns Statistics including counts by status and total budget
   */
  async getProjectStats(spaceId: string): Promise<ProjectStats> {
    try {
      const supabase = createClient();

      const [totalResult, planningResult, inProgressResult, completedResult, onHoldResult, budgetResult] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('space_id', spaceId),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).eq('status', 'planning'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).eq('status', 'in-progress'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).eq('status', 'completed'),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).eq('status', 'on-hold'),
        supabase.from('projects').select('budget_amount').eq('space_id', spaceId),
      ]);

      const totalBudget = budgetResult.data?.reduce(
        (sum: number, p: { budget_amount?: number | null }) => sum + (p.budget_amount || 0),
        0
      ) || 0;

      return {
        total: totalResult.count ?? 0,
        planning: planningResult.count ?? 0,
        inProgress: inProgressResult.count ?? 0,
        completed: completedResult.count ?? 0,
        onHold: onHoldResult.count ?? 0,
        totalBudget,
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
