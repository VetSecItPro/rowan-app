import { createClient } from '@/lib/supabase/client';

/**
 * Task Templates Service
 *
 * Manages reusable task templates for quick task creation.
 */

export interface TaskTemplate {
  id: string;
  space_id: string;
  name: string;
  description?: string;
  title: string;
  task_description?: string;
  category?: string;
  priority: string;
  estimated_duration?: number;
  default_recurrence_pattern?: string;
  default_recurrence_interval?: number;
  default_recurrence_days_of_week?: number[];
  default_assigned_to?: string;
  use_count: number;
  is_favorite: boolean;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  space_id: string;
  name: string;
  description?: string;
  title: string;
  task_description?: string;
  category?: string;
  priority?: string;
  estimated_duration?: number;
  default_assigned_to?: string;
  tags?: string[];
  created_by: string;
}

export const taskTemplatesService = {
  /**
   * Get all templates for a space
   */
  async getTemplates(spaceId: string): Promise<TaskTemplate[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('space_id', spaceId)
        .order('use_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },

  /**
   * Get favorite templates
   */
  async getFavoriteTemplates(spaceId: string): Promise<TaskTemplate[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_favorite', true)
        .order('use_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching favorite templates:', error);
      throw error;
    }
  },

  /**
   * Search templates by name or tags
   */
  async searchTemplates(spaceId: string, query: string): Promise<TaskTemplate[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('space_id', spaceId)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('use_count', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching templates:', error);
      throw error;
    }
  },

  /**
   * Create a new template
   */
  async createTemplate(input: CreateTemplateInput): Promise<TaskTemplate> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  /**
   * Create a template from an existing task
   */
  async createFromTask(taskId: string, templateName: string, createdBy: string): Promise<TaskTemplate> {
    const supabase = createClient();
    try {
      // Get task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Create template
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          space_id: task.space_id,
          name: templateName,
          title: task.title,
          task_description: task.description,
          category: task.category,
          priority: task.priority,
          default_assigned_to: task.assigned_to,
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating template from task:', error);
      throw error;
    }
  },

  /**
   * Update a template
   */
  async updateTemplate(templateId: string, updates: Partial<CreateTemplateInput>): Promise<TaskTemplate> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .update(updates)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(templateId: string): Promise<TaskTemplate> {
    const supabase = createClient();
    try {
      // Get current status
      const { data: current, error: currentError } = await supabase
        .from('task_templates')
        .select('is_favorite')
        .eq('id', templateId)
        .single();

      if (currentError) throw currentError;

      // Toggle
      const { data, error } = await supabase
        .from('task_templates')
        .update({ is_favorite: !current.is_favorite })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },

  /**
   * Create task from template
   */
  async createTaskFromTemplate(
    templateId: string,
    overrides?: {
      due_date?: string;
      assigned_to?: string;
      description?: string;
    }
  ): Promise<any> {
    const supabase = createClient();
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Increment use_count
      await supabase
        .from('task_templates')
        .update({ use_count: template.use_count + 1 })
        .eq('id', templateId);

      // Create task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          space_id: template.space_id,
          title: template.title,
          description: overrides?.description || template.task_description,
          category: template.category,
          priority: template.priority,
          due_date: overrides?.due_date,
          assigned_to: overrides?.assigned_to || template.default_assigned_to,
          created_by: template.created_by,
        })
        .select()
        .single();

      if (taskError) throw taskError;
      return task;
    } catch (error) {
      console.error('Error creating task from template:', error);
      throw error;
    }
  },
};
