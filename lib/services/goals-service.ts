import { createClient } from '@/lib/supabase/client';
import { achievementBadgesService } from './achievement-badges-service';

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

// Check-in system interfaces
export interface GoalCheckIn {
  id: string;
  goal_id: string;
  user_id: string;
  progress_percentage: number;
  mood: 'great' | 'okay' | 'struggling';
  notes?: string;
  blockers?: string;
  need_help_from_partner: boolean;
  voice_note_url?: string;
  voice_note_duration?: number;
  check_in_type: 'manual' | 'scheduled' | 'reminder';
  scheduled_date?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalCheckInPhoto {
  id: string;
  check_in_id: string;
  photo_url: string;
  caption?: string;
  order_index: number;
  created_at: string;
}

export interface GoalCheckInSettings {
  id: string;
  goal_id: string;
  user_id: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number; // 0 = Sunday
  day_of_month?: number;
  reminder_time: string;
  enable_reminders: boolean;
  enable_voice_notes: boolean;
  enable_photos: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckInInput {
  goal_id: string;
  progress_percentage: number;
  mood: 'great' | 'okay' | 'struggling';
  notes?: string;
  blockers?: string;
  need_help_from_partner?: boolean;
  voice_note_url?: string;
  voice_note_duration?: number;
  voice_note_category?: 'progress' | 'challenges' | 'reflections' | 'goals' | 'general';
  voice_note_template_id?: string | null;
  voice_note_metadata?: {
    transcription?: string;
    confidence?: number;
    keywords?: string[];
    category?: string;
    tags?: string[];
  };
  check_in_type?: 'manual' | 'scheduled' | 'reminder';
  scheduled_date?: string;
  photos?: File[];
}

export interface UpdateCheckInSettingsInput {
  goal_id: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
  reminder_time?: string;
  enable_reminders?: boolean;
  enable_voice_notes?: boolean;
  enable_photos?: boolean;
}

// Activity Feed interfaces
export interface GoalActivity {
  id: string;
  space_id: string;
  goal_id?: string;
  milestone_id?: string;
  check_in_id?: string;
  user_id: string;
  activity_type: 'goal_created' | 'goal_updated' | 'goal_completed' | 'goal_deleted' |
                 'milestone_created' | 'milestone_completed' | 'milestone_updated' | 'milestone_deleted' |
                 'check_in_created' | 'check_in_updated' |
                 'goal_shared' | 'goal_collaborated' | 'goal_commented';
  activity_data: Record<string, any>;
  title: string;
  description?: string;
  entity_title?: string;
  entity_type?: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  goal?: Goal;
  milestone?: Milestone;
  check_in?: GoalCheckIn;
}

export interface GoalComment {
  id: string;
  goal_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  content_type: 'text' | 'markdown';
  reaction_counts: Record<string, number>;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  replies?: GoalComment[];
  user_reaction?: string; // Current user's reaction
}

export interface GoalCommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface GoalMention {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  mentioning_user_id: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface CreateCommentInput {
  goal_id: string;
  content: string;
  parent_comment_id?: string;
  content_type?: 'text' | 'markdown';
}

export interface CreateActivityInput {
  space_id: string;
  goal_id?: string;
  milestone_id?: string;
  check_in_id?: string;
  activity_type: GoalActivity['activity_type'];
  title: string;
  description?: string;
  entity_title?: string;
  entity_type?: string;
  activity_data?: Record<string, any>;
}

export interface GoalCheckInSettings {
  id: string;
  goal_id: string;
  user_id: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number; // 0 = Sunday
  day_of_month?: number; // 1-31
  reminder_time: string; // HH:MM format
  enable_reminders: boolean;
  reminder_days_before: number;
  auto_schedule: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckInSettingsInput {
  goal_id: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number | null;
  day_of_month?: number | null;
  reminder_time: string;
  enable_reminders: boolean;
  reminder_days_before: number;
  auto_schedule: boolean;
}

export interface UpdateCheckInSettingsInput {
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number | null;
  day_of_month?: number | null;
  reminder_time?: string;
  enable_reminders?: boolean;
  reminder_days_before?: number;
  auto_schedule?: boolean;
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

    // Check if goal is being completed
    const isBeingCompleted = updates.status === 'completed' && !finalUpdates.completed_at;

    if (isBeingCompleted) {
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

    // Check for badge awards when goal is completed
    if (isBeingCompleted && data.space_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Trigger badge checking in the background (don't await to avoid blocking)
          achievementBadgesService.checkAndAwardBadges(
            user.id,
            data.space_id,
            'goal_completed'
          ).catch(console.error);
        }
      } catch (error) {
        console.error('Failed to check for achievement badges:', error);
      }
    }

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

    // Check if milestone is being completed
    const isBeingCompleted = completed && !finalUpdates.completed_at;

    if (completed) {
      finalUpdates.completed_at = new Date().toISOString();
    } else {
      finalUpdates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('goal_milestones')
      .update(finalUpdates)
      .eq('id', id)
      .select(`
        *,
        goal:goals!inner(space_id)
      `)
      .single();

    if (error) throw error;

    // Check for badge awards when milestone is completed
    if (isBeingCompleted && data.goal?.space_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Trigger badge checking in the background (don't await to avoid blocking)
          achievementBadgesService.checkAndAwardBadges(
            user.id,
            data.goal.space_id,
            'milestone_completed'
          ).catch(console.error);
        }
      } catch (error) {
        console.error('Failed to check for achievement badges:', error);
      }
    }

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

  // Check-in system methods
  async createCheckIn(input: CreateCheckInInput): Promise<GoalCheckIn> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Remove photos from input as they need to be handled separately
    const { photos, ...checkInData } = input;

    const { data, error } = await supabase
      .from('goal_check_ins')
      .insert([{
        ...checkInData,
        user_id: user.id,
        check_in_type: input.check_in_type || 'manual',
      }])
      .select()
      .single();

    if (error) throw error;

    // Handle photo uploads if provided
    if (photos && photos.length > 0) {
      await this.uploadCheckInPhotos(data.id, photos);
    }

    return data;
  },

  async getGoalCheckIns(goalId: string): Promise<GoalCheckIn[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_check_ins')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCheckInById(id: string): Promise<GoalCheckIn | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_check_ins')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getCheckInPhotos(checkInId: string): Promise<GoalCheckInPhoto[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_check_in_photos')
      .select('*')
      .eq('check_in_id', checkInId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async uploadCheckInPhotos(checkInId: string, photos: File[]): Promise<GoalCheckInPhoto[]> {
    const supabase = createClient();
    const uploadedPhotos: GoalCheckInPhoto[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const fileExt = photo.name.split('.').pop();
      const fileName = `${checkInId}_${Date.now()}_${i}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('goal-check-in-photos')
        .upload(fileName, photo);

      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('goal-check-in-photos')
        .getPublicUrl(fileName);

      // Save to database
      const { data: photoData, error: photoError } = await supabase
        .from('goal_check_in_photos')
        .insert([{
          check_in_id: checkInId,
          photo_url: publicUrl,
          order_index: i,
        }])
        .select()
        .single();

      if (photoError) {
        console.error('Photo database error:', photoError);
        continue;
      }

      uploadedPhotos.push(photoData);
    }

    return uploadedPhotos;
  },

  async updateCheckIn(id: string, updates: Partial<CreateCheckInInput>): Promise<GoalCheckIn> {
    const supabase = createClient();

    // Remove photos from updates as they need to be handled separately
    const { photos, ...checkInUpdates } = updates;

    const { data, error } = await supabase
      .from('goal_check_ins')
      .update(checkInUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCheckIn(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('goal_check_ins')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Check-in settings methods
  async getCheckInSettings(goalId: string, userId?: string): Promise<GoalCheckInSettings | null> {
    const supabase = createClient();
    let query = supabase
      .from('goal_check_in_settings')
      .select('*')
      .eq('goal_id', goalId);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  async updateCheckInSettings(input: UpdateCheckInSettingsInput): Promise<GoalCheckInSettings> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { goal_id, ...settings } = input;

    // Try to update existing settings first
    const { data: existingData, error: updateError } = await supabase
      .from('goal_check_in_settings')
      .update(settings)
      .eq('goal_id', goal_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (!updateError) return existingData;

    // If no existing settings, create new ones
    const { data, error } = await supabase
      .from('goal_check_in_settings')
      .insert([{
        goal_id,
        user_id: user.id,
        frequency: 'weekly',
        day_of_week: 1, // Monday
        reminder_time: '09:00:00',
        enable_reminders: true,
        enable_voice_notes: true,
        enable_photos: true,
        ...settings,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUpcomingCheckIns(spaceId: string): Promise<Array<{ goal: Goal; settings: GoalCheckInSettings; nextDue: Date }>> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Get all goals and their check-in settings
    const goals = await this.getGoals(spaceId);
    const upcomingCheckIns: Array<{ goal: Goal; settings: GoalCheckInSettings; nextDue: Date }> = [];

    for (const goal of goals) {
      if (goal.status !== 'active') continue;

      const settings = await this.getCheckInSettings(goal.id, user.id);
      if (!settings || !settings.enable_reminders) continue;

      // Calculate next due date based on frequency
      const now = new Date();
      let nextDue: Date;

      switch (settings.frequency) {
        case 'daily':
          nextDue = new Date(now);
          nextDue.setDate(now.getDate() + 1);
          break;
        case 'weekly':
          nextDue = new Date(now);
          const daysUntilTarget = (settings.day_of_week! - now.getDay() + 7) % 7;
          nextDue.setDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
          break;
        case 'biweekly':
          nextDue = new Date(now);
          nextDue.setDate(now.getDate() + 14);
          break;
        case 'monthly':
          nextDue = new Date(now);
          if (settings.day_of_month) {
            nextDue.setDate(settings.day_of_month);
            if (nextDue <= now) {
              nextDue.setMonth(nextDue.getMonth() + 1);
            }
          } else {
            nextDue.setMonth(now.getMonth() + 1);
          }
          break;
        default:
          continue;
      }

      // Set the reminder time
      const [hours, minutes] = settings.reminder_time.split(':');
      nextDue.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      upcomingCheckIns.push({ goal, settings, nextDue });
    }

    // Sort by next due date
    return upcomingCheckIns.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
  },

  // Activity Feed methods
  async getActivityFeed(spaceId: string, limit = 20, offset = 0): Promise<GoalActivity[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('goal_activities')
      .select(`
        *,
        user:users(id, name, avatar_url),
        goal:goals(id, title, status, progress),
        milestone:goal_milestones(id, title, completed),
        check_in:goal_check_ins(id, progress_percentage, mood)
      `)
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

  async getGoalActivityFeed(goalId: string, limit = 20, offset = 0): Promise<GoalActivity[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('goal_activities')
      .select(`
        *,
        user:users(id, name, avatar_url),
        goal:goals(id, title, status, progress),
        milestone:goal_milestones(id, title, completed),
        check_in:goal_check_ins(id, progress_percentage, mood)
      `)
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

  async createActivity(input: CreateActivityInput): Promise<GoalActivity> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_activities')
      .insert([{
        ...input,
        user_id: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Comments methods
  async getGoalComments(goalId: string): Promise<GoalComment[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('goal_comments')
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .eq('goal_id', goalId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const comments = data || [];

    // Get replies for each comment
    for (const comment of comments) {
      const { data: replies, error: repliesError } = await supabase
        .from('goal_comments')
        .select(`
          *,
          user:users(id, name, avatar_url)
        `)
        .eq('parent_comment_id', comment.id)
        .order('created_at', { ascending: true });

      if (!repliesError && replies) {
        comment.replies = replies;
      }

      // Get user's reaction to this comment
      if (user) {
        const { data: userReaction } = await supabase
          .from('goal_comment_reactions')
          .select('emoji')
          .eq('comment_id', comment.id)
          .eq('user_id', user.id)
          .single();

        comment.user_reaction = userReaction?.emoji;
      }
    }

    return comments;
  },

  async createComment(input: CreateCommentInput): Promise<GoalComment> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_comments')
      .insert([{
        ...input,
        user_id: user.id,
      }])
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Process @mentions in the comment
    await this.processMentions(data.id, input.content);

    // Create activity for the comment
    const goal = await this.getGoalById(input.goal_id);
    if (goal) {
      await this.createActivity({
        space_id: goal.space_id,
        goal_id: input.goal_id,
        activity_type: 'goal_commented',
        title: 'Added comment',
        description: `Comment added to "${goal.title}"`,
        entity_title: goal.title,
        entity_type: 'comment',
        activity_data: {
          goal_title: goal.title,
          comment_content: input.content.slice(0, 100), // First 100 chars
          is_reply: !!input.parent_comment_id,
        },
      });
    }

    return data;
  },

  async updateComment(commentId: string, content: string): Promise<GoalComment> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('goal_comments')
      .update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Update mentions
    await this.processMentions(commentId, content);

    return data;
  },

  async deleteComment(commentId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('goal_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  },

  async toggleCommentReaction(commentId: string, emoji: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Check if user already reacted with this emoji
    const { data: existingReaction } = await supabase
      .from('goal_comment_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single();

    if (existingReaction) {
      // Remove reaction
      const { error } = await supabase
        .from('goal_comment_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (error) throw error;
    } else {
      // Add reaction (first remove any other reaction from this user)
      await supabase
        .from('goal_comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('goal_comment_reactions')
        .insert([{
          comment_id: commentId,
          user_id: user.id,
          emoji,
        }]);

      if (error) throw error;
    }
  },

  async processMentions(commentId: string, content: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Extract mentions from content (@username pattern)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]); // username without @
    }

    if (mentions.length === 0) return;

    // Get user IDs for mentioned usernames
    const { data: mentionedUsers } = await supabase
      .from('users')
      .select('id, name')
      .in('name', mentions);

    if (!mentionedUsers || mentionedUsers.length === 0) return;

    // Remove existing mentions for this comment
    await supabase
      .from('goal_mentions')
      .delete()
      .eq('comment_id', commentId);

    // Create new mentions
    const mentionInserts = mentionedUsers.map(mentionedUser => ({
      comment_id: commentId,
      mentioned_user_id: mentionedUser.id,
      mentioning_user_id: user.id,
    }));

    const { error } = await supabase
      .from('goal_mentions')
      .insert(mentionInserts);

    if (error) {
      console.error('Failed to create mentions:', error);
    }
  },

  async getUserMentions(userId?: string): Promise<GoalMention[]> {
    const supabase = createClient();
    let targetUserId = userId;

    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      targetUserId = user.id;
    }

    const { data, error } = await supabase
      .from('goal_mentions')
      .select(`
        *,
        comment:goal_comments(
          id,
          content,
          goal_id,
          user:users(id, name, avatar_url),
          goal:goals(id, title)
        ),
        mentioning_user:users(id, name, avatar_url)
      `)
      .eq('mentioned_user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async markMentionAsRead(mentionId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('goal_mentions')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', mentionId);

    if (error) throw error;
  },

  // Check-in Settings Methods
  async getCheckInSettings(goalId: string): Promise<GoalCheckInSettings | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_check_in_settings')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data || null;
  },

  async createCheckInSettings(input: CreateCheckInSettingsInput): Promise<GoalCheckInSettings> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_check_in_settings')
      .insert([{
        ...input,
        user_id: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCheckInSettings(goalId: string, input: UpdateCheckInSettingsInput): Promise<GoalCheckInSettings> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_check_in_settings')
      .update(input)
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCheckInSettings(goalId: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('goal_check_in_settings')
      .delete()
      .eq('goal_id', goalId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async getGoalCheckInSettings(spaceId: string): Promise<GoalCheckInSettings[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_check_in_settings')
      .select(`
        *,
        goal:goals!goal_check_in_settings_goal_id_fkey(
          id,
          title,
          space_id
        )
      `)
      .eq('user_id', user.id)
      .eq('goal.space_id', spaceId);

    if (error) throw error;
    return data || [];
  },
};
