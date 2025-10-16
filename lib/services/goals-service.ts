import { createClient } from '@/lib/supabase/client';

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  type: 'percentage' | 'money' | 'count' | 'date';
  target_value?: number;
  current_value?: number;
  target_date?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalCollaborator {
  id: string;
  goal_id: string;
  user_id: string;
  role: 'owner' | 'contributor' | 'viewer';
  invited_by: string;
  invited_at: string;
  created_at: string;
  updated_at: string;
}

export interface MilestoneTemplate {
  id: string;
  template_id: string;
  title: string;
  description?: string;
  type: 'percentage' | 'money' | 'count' | 'date';
  target_value?: number;
  order_index: number;
  created_at: string;
}

export interface GoalTemplate {
  id: string;
  title: string;
  description?: string;
  category: 'financial' | 'health' | 'home' | 'relationship' | 'career' | 'personal' | 'education' | 'family';
  icon?: string;
  target_days?: number;
  is_public: boolean;
  created_by?: string;
  usage_count: number;
  milestones?: MilestoneTemplate[];
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number;
  visibility?: 'private' | 'shared';
  template_id?: string;
  priority?: 'none' | 'p1' | 'p2' | 'p3' | 'p4';
  priority_order?: number;
  is_pinned?: boolean;
  target_date?: string;
  milestones?: Milestone[];
  collaborators?: GoalCollaborator[];
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateGoalInput {
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  progress?: number;
  visibility?: 'private' | 'shared';
  template_id?: string;
  target_date?: string;
}

export interface AddCollaboratorInput {
  goal_id: string;
  user_id: string;
  role: 'contributor' | 'viewer';
}

export interface CreateMilestoneInput {
  goal_id: string;
  title: string;
  description?: string;
  type: 'percentage' | 'money' | 'count' | 'date';
  target_value?: number;
  current_value?: number;
  target_date?: string;
}

export interface GoalStats {
  active: number;
  completed: number;
  inProgress: number;
  milestonesReached: number;
}

export const goalsService = {
  async getGoals(spaceId: string): Promise<Goal[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .select('*, milestones:goal_milestones(*)')
      .eq('space_id', spaceId)
      .order('is_pinned', { ascending: false })
      .order('priority_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getGoalById(id: string): Promise<Goal | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .select('*, milestones:goal_milestones(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .insert([{
        ...input,
        status: input.status || 'active',
        progress: input.progress || 0,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateGoal(id: string, updates: Partial<CreateGoalInput>): Promise<Goal> {
    const supabase = createClient();
    const finalUpdates: any = { ...updates };

    if (updates.status === 'completed' && !finalUpdates.completed_at) {
      finalUpdates.completed_at = new Date().toISOString();
      finalUpdates.progress = 100;
    }

    if (updates.status && updates.status !== 'completed') {
      finalUpdates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('goals')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteGoal(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_milestones')
      .insert([{
        ...input,
        completed: false,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMilestone(id: string, updates: Partial<CreateMilestoneInput>): Promise<Milestone> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_milestones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async toggleMilestone(id: string, completed: boolean): Promise<Milestone> {
    const supabase = createClient();
    const finalUpdates: any = { completed };
    if (completed) {
      finalUpdates.completed_at = new Date().toISOString();
    } else {
      finalUpdates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('goal_milestones')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMilestone(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('goal_milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAllMilestones(spaceId: string): Promise<Milestone[]> {
    const supabase = createClient();
    const goals = await this.getGoals(spaceId);
    const allMilestones: Milestone[] = [];

    goals.forEach(goal => {
      if (goal.milestones) {
        allMilestones.push(...goal.milestones);
      }
    });

    return allMilestones.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getGoalStats(spaceId: string): Promise<GoalStats> {
    const supabase = createClient();
    const goals = await this.getGoals(spaceId);

    let completedMilestones = 0;
    goals.forEach(goal => {
      if (goal.milestones) {
        completedMilestones += goal.milestones.filter(m => m.completed).length;
      }
    });

    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const totalCompleted = completedGoals + completedMilestones;

    return {
      active: goals.filter(g => g.status === 'active').length,
      completed: totalCompleted,
      inProgress: goals.filter(g => g.status === 'active' && g.progress > 0 && g.progress < 100).length,
      milestonesReached: completedMilestones,
    };
  },

  // Collaboration methods
  async getGoalCollaborators(goalId: string): Promise<GoalCollaborator[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_collaborators')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addCollaborator(input: AddCollaboratorInput): Promise<GoalCollaborator> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_collaborators')
      .insert([{
        ...input,
        invited_by: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCollaboratorRole(collaboratorId: string, role: 'contributor' | 'viewer'): Promise<GoalCollaborator> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_collaborators')
      .update({ role })
      .eq('id', collaboratorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeCollaborator(collaboratorId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('goal_collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) throw error;
  },

  async toggleGoalVisibility(goalId: string, visibility: 'private' | 'shared'): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .update({ visibility })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Template methods
  async getGoalTemplates(category?: string): Promise<GoalTemplate[]> {
    const supabase = createClient();
    let query = supabase
      .from('goal_templates')
      .select('*, milestones:milestone_templates(*)')
      .order('usage_count', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getGoalTemplateById(id: string): Promise<GoalTemplate | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_templates')
      .select('*, milestones:milestone_templates(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createGoalFromTemplate(
    spaceId: string,
    templateId: string,
    customizations?: {
      title?: string;
      description?: string;
      target_date?: string;
      visibility?: 'private' | 'shared';
    }
  ): Promise<Goal> {
    const supabase = createClient();

    // Get template with milestone templates
    const template = await this.getGoalTemplateById(templateId);
    if (!template) throw new Error('Template not found');

    // Calculate target date if not provided
    const targetDate = customizations?.target_date ||
      (template.target_days
        ? new Date(Date.now() + template.target_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : undefined);

    // Create goal from template
    const goal = await this.createGoal({
      space_id: spaceId,
      title: customizations?.title || template.title,
      description: customizations?.description || template.description,
      category: template.category,
      template_id: templateId,
      target_date: targetDate,
      visibility: customizations?.visibility,
      status: 'active',
      progress: 0,
    });

    // Create milestones from template
    if (template.milestones && template.milestones.length > 0) {
      for (const milestoneTemplate of template.milestones) {
        await this.createMilestone({
          goal_id: goal.id,
          title: milestoneTemplate.title,
          description: milestoneTemplate.description,
          type: milestoneTemplate.type,
          target_value: milestoneTemplate.target_value,
        });
      }
    }

    // Fetch complete goal with milestones
    return await this.getGoalById(goal.id) || goal;
  },

  async getTemplateCategories(): Promise<Array<{ category: string; count: number; icon: string }>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_templates')
      .select('category, icon')
      .eq('is_public', true);

    if (error) throw error;

    // Group by category and count
    const categoryMap = new Map<string, { count: number; icon: string }>();
    data?.forEach(template => {
      const current = categoryMap.get(template.category) || { count: 0, icon: template.icon || '📋' };
      categoryMap.set(template.category, {
        count: current.count + 1,
        icon: template.icon || current.icon
      });
    });

    return Array.from(categoryMap.entries()).map(([category, { count, icon }]) => ({
      category,
      count,
      icon
    }));
  },

  // Priority and ordering methods
  async updateGoalPriority(goalId: string, priority: 'none' | 'p1' | 'p2' | 'p3' | 'p4'): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .update({ priority })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async toggleGoalPin(goalId: string, isPinned: boolean): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goals')
      .update({ is_pinned: isPinned })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async reorderGoals(spaceId: string, goalIds: string[]): Promise<void> {
    const supabase = createClient();

    // Update priority_order for each goal
    const updates = goalIds.map((goalId, index) => ({
      id: goalId,
      priority_order: index + 1,
    }));

    for (const update of updates) {
      await supabase
        .from('goals')
        .update({ priority_order: update.priority_order })
        .eq('id', update.id)
        .eq('space_id', spaceId);
    }
  },
};
