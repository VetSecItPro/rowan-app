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

export interface Goal {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number;
  target_date?: string;
  milestones?: Milestone[];
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
  target_date?: string;
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
      .order('created_at', { ascending: false });

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
};
