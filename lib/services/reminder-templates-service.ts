import { createClient } from '@/lib/supabase/client';
import { sanitizeSearchInput } from '@/lib/utils';
import { escapeRegExp } from '@/lib/utils/input-sanitization';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// =============================================
// TYPES & VALIDATION
// =============================================

export interface ReminderTemplate {
  id: string;
  space_id?: string;
  created_by?: string;
  name: string;
  description?: string;
  emoji: string;
  category: 'bills' | 'health' | 'work' | 'personal' | 'household';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  template_title: string;
  template_description?: string;
  reminder_type: 'time' | 'location';
  default_time_offset_minutes?: number;
  default_location?: string;
  repeat_pattern?: string;
  repeat_days?: number[];
  is_system_template: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

// Zod schemas
const CreateTemplateSchema = z.object({
  space_id: z.string().uuid(),
  created_by: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  emoji: z.string().default('🔔'),
  category: z.enum(['bills', 'health', 'work', 'personal', 'household']).default('personal'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  template_title: z.string().min(1).max(200),
  template_description: z.string().max(1000).optional(),
  reminder_type: z.enum(['time', 'location']).default('time'),
  default_time_offset_minutes: z.number().int().min(0).max(525600).optional(), // Max 1 year
  default_location: z.string().max(500).optional(),
  repeat_pattern: z.string().max(50).optional(),
  repeat_days: z.array(z.number().int().min(0).max(6)).optional(),
});

const UpdateTemplateSchema = CreateTemplateSchema.partial().omit({
  space_id: true,
  created_by: true,
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;

// =============================================
// SERVICE
// =============================================

export const reminderTemplatesService = {
  /**
   * Get all templates available to user (system + space templates)
   */
  async getTemplates(spaceId: string): Promise<ReminderTemplate[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminder_templates')
      .select(`
        id, space_id, created_by, name, description, emoji, category, priority, template_title, template_description, reminder_type, default_time_offset_minutes, default_location, repeat_pattern, repeat_days, is_system_template, usage_count, created_at, updated_at,
        creator:created_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .or(`is_system_template.eq.true,space_id.eq.${spaceId}`)
      .order('usage_count', { ascending: false });

    if (error) {
      logger.error('Error fetching templates:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Failed to fetch templates');
    }

    return (data || []).map((template: ReminderTemplate & { creator?: Record<string, unknown> }) => ({
      ...template,
      creator: template.creator || undefined,
    }));
  },

  /**
   * Get system templates only
   */
  async getSystemTemplates(): Promise<ReminderTemplate[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminder_templates')
      .select('id, space_id, created_by, name, description, emoji, category, priority, template_title, template_description, reminder_type, default_time_offset_minutes, default_location, repeat_pattern, repeat_days, is_system_template, usage_count, created_at, updated_at')
      .eq('is_system_template', true)
      .order('usage_count', { ascending: false });

    if (error) {
      logger.error('Error fetching system templates:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Failed to fetch system templates');
    }

    return data || [];
  },

  /**
   * Get user's space templates only
   */
  async getSpaceTemplates(spaceId: string): Promise<ReminderTemplate[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminder_templates')
      .select(`
        id, space_id, created_by, name, description, emoji, category, priority, template_title, template_description, reminder_type, default_time_offset_minutes, default_location, repeat_pattern, repeat_days, is_system_template, usage_count, created_at, updated_at,
        creator:created_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('space_id', spaceId)
      .eq('is_system_template', false)
      .order('usage_count', { ascending: false });

    if (error) {
      logger.error('Error fetching space templates:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Failed to fetch space templates');
    }

    return (data || []).map((template: ReminderTemplate & { creator?: Record<string, unknown> }) => ({
      ...template,
      creator: template.creator || undefined,
    }));
  },

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<ReminderTemplate | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminder_templates')
      .select(`
        id, space_id, created_by, name, description, emoji, category, priority, template_title, template_description, reminder_type, default_time_offset_minutes, default_location, repeat_pattern, repeat_days, is_system_template, usage_count, created_at, updated_at,
        creator:created_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Error fetching template:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      return null;
    }

    return {
      ...data,
      creator: data.creator || undefined,
    };
  },

  /**
   * Create a new template
   */
  async createTemplate(input: CreateTemplateInput): Promise<ReminderTemplate> {
    const supabase = createClient();

    // Validate input
    const validated = CreateTemplateSchema.parse(input);

    // Security: Verify user is member of space
    const { data: membership, error: membershipError } = await supabase
      .from('space_members')
      .select('id')
      .eq('space_id', validated.space_id)
      .eq('user_id', validated.created_by)
      .single();

    if (membershipError || !membership) {
      logger.error('User is not a member of this space', undefined, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('User is not a member of this space');
    }

    // Create template
    const { data, error } = await supabase
      .from('reminder_templates')
      .insert({
        ...validated,
        is_system_template: false,
      })
      .select(`
        *,
        creator:created_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      logger.error('Error creating template:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Failed to create template');
    }

    return {
      ...data,
      creator: data.creator || undefined,
    };
  },

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    updates: UpdateTemplateInput
  ): Promise<ReminderTemplate> {
    const supabase = createClient();

    // Validate input
    const validated = UpdateTemplateSchema.parse(updates);

    // Security: Verify user owns template
    const { data: existing, error: existingError } = await supabase
      .from('reminder_templates')
      .select('created_by, is_system_template')
      .eq('id', templateId)
      .single();

    if (existingError || !existing) {
      logger.error('Template not found:', existingError, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Template not found');
    }

    if (existing.is_system_template) {
      throw new Error('Cannot edit system templates');
    }

    if (existing.created_by !== userId) {
      throw new Error('You can only edit your own templates');
    }

    // Update template
    const { data, error } = await supabase
      .from('reminder_templates')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select(`
        *,
        creator:created_by (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      logger.error('Error updating template:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Failed to update template');
    }

    return {
      ...data,
      creator: data.creator || undefined,
    };
  },

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const supabase = createClient();

    // Security: Verify user owns template
    const { data: existing, error: existingError } = await supabase
      .from('reminder_templates')
      .select('created_by, is_system_template')
      .eq('id', templateId)
      .single();

    if (existingError || !existing) {
      logger.error('Template not found:', existingError, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Template not found');
    }

    if (existing.is_system_template) {
      throw new Error('Cannot delete system templates');
    }

    if (existing.created_by !== userId) {
      throw new Error('You can only delete your own templates');
    }

    // Delete template
    const { error } = await supabase
      .from('reminder_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      logger.error('Error deleting template:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Failed to delete template');
    }
  },

  /**
   * Increment template usage count
   */
  async incrementUsage(templateId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.rpc('increment_template_usage', {
      p_template_id: templateId,
    });

    if (error) {
      logger.error('Error incrementing template usage:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      // Don't throw - usage tracking is non-critical
    }
  },

  /**
   * Apply template to create reminder input
   * Replaces template variables with provided values
   */
  applyTemplate(
    template: ReminderTemplate,
    variables: Record<string, string> = {},
    customTime?: string
  ): {
    title: string;
    description?: string;
    emoji: string;
    category: string;
    priority: string;
    reminder_type: string;
    reminder_time?: string;
    location?: string;
    repeat_pattern?: string;
    repeat_days?: number[];
  } {
    // Replace variables in title
    let title = template.template_title;
    Object.entries(variables).forEach(([key, value]) => {
      // SECURITY: Escape key to prevent ReDoS when used in RegExp
      title = title.replace(new RegExp(`\\[${escapeRegExp(key)}\\]`, 'gi'), value);
    });

    // Replace variables in description
    let description = template.template_description;
    if (description) {
      Object.entries(variables).forEach(([key, value]) => {
        // SECURITY: Escape key to prevent ReDoS when used in RegExp
        description = description!.replace(new RegExp(`\\[${escapeRegExp(key)}\\]`, 'gi'), value);
      });
    }

    // Calculate reminder time if time-based
    let reminder_time: string | undefined;
    if (template.reminder_type === 'time' && template.default_time_offset_minutes !== undefined) {
      if (customTime) {
        reminder_time = customTime;
      } else {
        const now = new Date();
        now.setMinutes(now.getMinutes() + template.default_time_offset_minutes);
        reminder_time = now.toISOString();
      }
    }

    return {
      title,
      description,
      emoji: template.emoji,
      category: template.category,
      priority: template.priority,
      reminder_type: template.reminder_type,
      reminder_time,
      location: template.default_location,
      repeat_pattern: template.repeat_pattern,
      repeat_days: template.repeat_days,
    };
  },

  /**
   * Extract variables from template strings
   * Returns array of variable names found in [brackets]
   */
  extractVariables(template: ReminderTemplate): string[] {
    const variables = new Set<string>();
    const pattern = /\[([^\]]+)\]/g;

    // Extract from title
    let match;
    while ((match = pattern.exec(template.template_title)) !== null) {
      variables.add(match[1]);
    }

    // Extract from description
    if (template.template_description) {
      pattern.lastIndex = 0;
      while ((match = pattern.exec(template.template_description)) !== null) {
        variables.add(match[1]);
      }
    }

    return Array.from(variables);
  },

  /**
   * Get popular templates (most used)
   */
  async getPopularTemplates(spaceId: string, limit: number = 5): Promise<ReminderTemplate[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminder_templates')
      .select('id, space_id, created_by, name, description, emoji, category, priority, template_title, template_description, reminder_type, default_time_offset_minutes, default_location, repeat_pattern, repeat_days, is_system_template, usage_count, created_at, updated_at')
      .or(`is_system_template.eq.true,space_id.eq.${spaceId}`)
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching popular templates:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Failed to fetch popular templates');
    }

    return data || [];
  },

  /**
   * Search templates by name or description
   */
  async searchTemplates(spaceId: string, query: string): Promise<ReminderTemplate[]> {
    const supabase = createClient();

    let templatesQuery = supabase
      .from('reminder_templates')
      .select('id, space_id, created_by, name, description, emoji, category, priority, template_title, template_description, reminder_type, default_time_offset_minutes, default_location, repeat_pattern, repeat_days, is_system_template, usage_count, created_at, updated_at')
      .or(`is_system_template.eq.true,space_id.eq.${spaceId}`);

    // Search in name, description, and template_title (sanitized to prevent SQL injection)
    const sanitizedQuery = sanitizeSearchInput(query);
    if (sanitizedQuery) {
      templatesQuery = templatesQuery.or(`name.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%,template_title.ilike.%${sanitizedQuery}%`);
    }

    templatesQuery = templatesQuery.order('usage_count', { ascending: false});
    const { data, error } = await templatesQuery;

    if (error) {
      logger.error('Error searching templates:', error, { component: 'lib-reminder-templates-service', action: 'service_call' });
      throw new Error('Failed to search templates');
    }

    return data || [];
  },
};
