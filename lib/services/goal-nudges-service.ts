import { createClient } from '@/lib/supabase/client';
import { goalsService, Goal, Milestone } from './goals-service';
import { differenceInDays, parseISO, addDays, subDays, isAfter, isBefore, format } from 'date-fns';

export interface GoalNudge {
  id: string;
  goal_id: string;
  user_id: string;
  space_id: string;
  nudge_type: NudgeType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  action_text?: string;
  action_url?: string;
  conditions_met: string[]; // Array of condition descriptions
  suggested_actions: string[];
  is_dismissed: boolean;
  dismissed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;

  // Populated from joins
  goal?: Goal;
  milestone?: Milestone;
}

export type NudgeType =
  | 'deadline_approaching'
  | 'overdue_milestone'
  | 'stalled_progress'
  | 'low_activity'
  | 'missing_check_in'
  | 'streak_break_warning'
  | 'completion_celebration'
  | 'progress_boost'
  | 'dependency_blocked'
  | 'seasonal_reminder'
  | 'collaboration_invite'
  | 'habit_formation';

export interface NudgeRule {
  type: NudgeType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  conditions: NudgeCondition[];
  title: string;
  messageTemplate: string;
  actionText?: string;
  actionUrlTemplate?: string;
  suggestedActions: string[];
  cooldownDays?: number; // Minimum days between same type of nudges
  expiresInHours?: number;
}

export interface NudgeCondition {
  type: 'days_until_deadline' | 'days_overdue' | 'days_without_progress' | 'days_without_checkin' | 'completion_rate' | 'milestone_count' | 'activity_count';
  operator: '<' | '<=' | '>' | '>=' | '==' | '!=';
  value: number;
  field?: string; // Optional field reference
}

export interface CreateNudgeInput {
  goal_id: string;
  nudge_type: NudgeType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  action_text?: string;
  action_url?: string;
  conditions_met: string[];
  suggested_actions: string[];
  expires_at?: string;
  milestone_id?: string;
}

export interface NudgeAnalytics {
  total_generated: number;
  total_dismissed: number;
  total_expired: number;
  action_taken_count: number;
  effectiveness_rate: number; // % of nudges that led to action
  top_nudge_types: Array<{ type: NudgeType; count: number; effectiveness: number }>;
  weekly_trend: Array<{ week: string; generated: number; acted_upon: number }>;
}

// Define comprehensive nudge rules
const NUDGE_RULES: NudgeRule[] = [
  {
    type: 'deadline_approaching',
    priority: 'high',
    conditions: [
      { type: 'days_until_deadline', operator: '<=', value: 7 },
      { type: 'completion_rate', operator: '<', value: 80 }
    ],
    title: 'Goal Deadline Approaching',
    messageTemplate: 'Your goal "{goal_title}" is due in {days_remaining} days. You\'re {completion_rate}% complete.',
    actionText: 'Update Progress',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Break down remaining work into daily tasks',
      'Schedule focused work sessions',
      'Consider adjusting the deadline if needed',
      'Ask for help from collaborators'
    ],
    cooldownDays: 3,
    expiresInHours: 72
  },
  {
    type: 'overdue_milestone',
    priority: 'urgent',
    conditions: [
      { type: 'days_overdue', operator: '>', value: 0 }
    ],
    title: 'Milestone Overdue',
    messageTemplate: 'Milestone "{milestone_title}" was due {days_overdue} days ago. Time to take action!',
    actionText: 'Review Milestone',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Mark milestone as complete if already done',
      'Reschedule to a realistic date',
      'Break milestone into smaller steps',
      'Identify and remove blockers'
    ],
    cooldownDays: 1,
    expiresInHours: 168 // 1 week
  },
  {
    type: 'stalled_progress',
    priority: 'medium',
    conditions: [
      { type: 'days_without_progress', operator: '>=', value: 7 }
    ],
    title: 'Goal Progress Stalled',
    messageTemplate: 'No progress on "{goal_title}" for {days_stalled} days. Let\'s get back on track!',
    actionText: 'Add Progress',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Set a small achievable task for today',
      'Review and adjust your approach',
      'Identify what\'s blocking you',
      'Schedule dedicated time this week'
    ],
    cooldownDays: 5,
    expiresInHours: 120
  },
  {
    type: 'missing_check_in',
    priority: 'medium',
    conditions: [
      { type: 'days_without_checkin', operator: '>=', value: 14 }
    ],
    title: 'Check-in Overdue',
    messageTemplate: 'It\'s been {days_since_checkin} days since your last check-in on "{goal_title}". How are things going?',
    actionText: 'Check In',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Record your current progress',
      'Note any challenges you\'re facing',
      'Celebrate small wins',
      'Adjust your strategy if needed'
    ],
    cooldownDays: 7,
    expiresInHours: 96
  },
  {
    type: 'low_activity',
    priority: 'low',
    conditions: [
      { type: 'activity_count', operator: '<', value: 3 },
      { type: 'days_without_progress', operator: '>=', value: 14 }
    ],
    title: 'Goal Needs Attention',
    messageTemplate: 'Your goal "{goal_title}" has been quiet lately. Small steps can lead to big progress!',
    actionText: 'View Goal',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Set one small task for today',
      'Review your goal strategy',
      'Connect with accountability partners',
      'Celebrate any recent progress'
    ],
    cooldownDays: 10,
    expiresInHours: 240
  },
  {
    type: 'completion_celebration',
    priority: 'high',
    conditions: [
      { type: 'completion_rate', operator: '>=', value: 100 }
    ],
    title: 'Goal Completed! 🎉',
    messageTemplate: 'Congratulations! You\'ve completed "{goal_title}". Time to celebrate your achievement!',
    actionText: 'View Achievement',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Share your success with others',
      'Reflect on lessons learned',
      'Set a new related goal',
      'Take time to celebrate'
    ],
    cooldownDays: 0, // No cooldown for celebrations
    expiresInHours: 168
  },
  {
    type: 'progress_boost',
    priority: 'low',
    conditions: [
      { type: 'completion_rate', operator: '>=', value: 50 },
      { type: 'completion_rate', operator: '<', value: 75 },
      { type: 'days_without_progress', operator: '>=', value: 5 }
    ],
    title: 'You\'re Halfway There!',
    messageTemplate: 'Great progress on "{goal_title}"! You\'re {completion_rate}% complete. Keep the momentum going!',
    actionText: 'Continue Progress',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Set your next milestone',
      'Review what\'s working well',
      'Plan your next steps',
      'Share your progress with someone'
    ],
    cooldownDays: 7,
    expiresInHours: 120
  },
  {
    type: 'dependency_blocked',
    priority: 'high',
    conditions: [
      { type: 'days_without_progress', operator: '>=', value: 3 }
    ],
    title: 'Dependency Blocking Progress',
    messageTemplate: 'Goal "{goal_title}" may be blocked by dependencies. Check if other goals need attention first.',
    actionText: 'Review Dependencies',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Complete prerequisite tasks',
      'Adjust dependency priorities',
      'Work on parallel goals',
      'Remove unnecessary dependencies'
    ],
    cooldownDays: 5,
    expiresInHours: 96
  },
  {
    type: 'collaboration_invite',
    priority: 'medium',
    conditions: [
      { type: 'days_without_progress', operator: '>=', value: 10 }
    ],
    title: 'Consider Adding Collaborators',
    messageTemplate: 'Goal "{goal_title}" might benefit from collaboration. Consider inviting others to help!',
    actionText: 'Invite Collaborators',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Identify potential collaborators',
      'Share your goal with friends',
      'Join or create accountability groups',
      'Ask for specific help'
    ],
    cooldownDays: 14,
    expiresInHours: 168
  },
  {
    type: 'habit_formation',
    priority: 'low',
    conditions: [
      { type: 'activity_count', operator: '>=', value: 7 }
    ],
    title: 'Building Great Habits!',
    messageTemplate: 'You\'ve been consistently working on "{goal_title}". You\'re building a powerful habit!',
    actionText: 'View Progress',
    actionUrlTemplate: '/goals',
    suggestedActions: [
      'Track your streak',
      'Reward consistent effort',
      'Plan for potential obstacles',
      'Share your habit success'
    ],
    cooldownDays: 21,
    expiresInHours: 240
  }
];

export const goalNudgesService = {
  /**
   * Generate nudges for all active goals in a space
   */
  async generateNudgesForSpace(spaceId: string): Promise<GoalNudge[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const goals = await goalsService.getGoals(spaceId);
    const activeGoals = goals.filter(goal => goal.status === 'active');

    const generatedNudges: GoalNudge[] = [];

    for (const goal of activeGoals) {
      const nudges = await this.generateNudgesForGoal(goal, user.id);
      generatedNudges.push(...nudges);
    }

    return generatedNudges;
  },

  /**
   * Generate nudges for a specific goal
   */
  async generateNudgesForGoal(goal: Goal, userId: string): Promise<GoalNudge[]> {
    const supabase = createClient();
    const generatedNudges: GoalNudge[] = [];

    // Get goal metrics
    const metrics = await this.getGoalMetrics(goal);

    // Check each nudge rule
    for (const rule of NUDGE_RULES) {
      // Check if conditions are met
      const conditionResults = await this.evaluateConditions(rule.conditions, goal, metrics);
      const allConditionsMet = conditionResults.every(result => result.met);

      if (!allConditionsMet) continue;

      // Check cooldown period
      if (rule.cooldownDays && rule.cooldownDays > 0) {
        const recentNudge = await this.getRecentNudge(goal.id, rule.type, rule.cooldownDays);
        if (recentNudge) continue; // Skip if within cooldown
      }

      // Generate nudge
      const nudge = await this.createNudgeFromRule(rule, goal, metrics, userId, conditionResults);
      if (nudge) {
        generatedNudges.push(nudge);
      }
    }

    return generatedNudges;
  },

  /**
   * Get comprehensive metrics for a goal
   */
  async getGoalMetrics(goal: Goal): Promise<any> {
    const supabase = createClient();
    const today = new Date();

    // Calculate basic metrics
    const metrics: any = {
      goal_id: goal.id,
      completion_rate: goal.progress || 0,
      days_since_created: differenceInDays(today, parseISO(goal.created_at)),
      has_target_date: !!goal.target_date,
      days_until_deadline: goal.target_date ? differenceInDays(parseISO(goal.target_date), today) : null,
      days_overdue: goal.target_date && isAfter(today, parseISO(goal.target_date)) ? differenceInDays(today, parseISO(goal.target_date)) : 0,
      milestone_count: goal.milestones?.length || 0,
      completed_milestones: goal.milestones?.filter(m => m.completed).length || 0
    };

    // Get recent activity
    try {
      const { data: activities } = await supabase
        .from('goal_activities')
        .select('*')
        .eq('goal_id', goal.id)
        .gte('created_at', subDays(today, 30).toISOString())
        .order('created_at', { ascending: false });

      metrics.activity_count = activities?.length || 0;
      metrics.days_without_progress = activities && activities.length > 0
        ? differenceInDays(today, parseISO(activities[0].created_at))
        : metrics.days_since_created;

    } catch (error) {
      console.error('Error fetching activities:', error);
      metrics.activity_count = 0;
      metrics.days_without_progress = metrics.days_since_created;
    }

    // Get check-in data
    try {
      const { data: checkIns } = await supabase
        .from('goal_check_ins')
        .select('*')
        .eq('goal_id', goal.id)
        .order('created_at', { ascending: false })
        .limit(1);

      metrics.days_without_checkin = checkIns && checkIns.length > 0
        ? differenceInDays(today, parseISO(checkIns[0].created_at))
        : metrics.days_since_created;

    } catch (error) {
      console.error('Error fetching check-ins:', error);
      metrics.days_without_checkin = metrics.days_since_created;
    }

    // Check for overdue milestones
    if (goal.milestones) {
      for (const milestone of goal.milestones) {
        if (milestone.target_date && !milestone.completed) {
          const daysOverdue = differenceInDays(today, parseISO(milestone.target_date));
          if (daysOverdue > 0) {
            metrics.overdue_milestone = milestone;
            metrics.days_overdue = Math.max(metrics.days_overdue, daysOverdue);
          }
        }
      }
    }

    return metrics;
  },

  /**
   * Evaluate nudge conditions against goal metrics
   */
  async evaluateConditions(conditions: NudgeCondition[], goal: Goal, metrics: any): Promise<Array<{ condition: NudgeCondition; met: boolean; value: any }>> {
    return conditions.map(condition => {
      let actualValue: number;

      switch (condition.type) {
        case 'days_until_deadline':
          actualValue = metrics.days_until_deadline ?? Infinity;
          break;
        case 'days_overdue':
          actualValue = metrics.days_overdue;
          break;
        case 'days_without_progress':
          actualValue = metrics.days_without_progress;
          break;
        case 'days_without_checkin':
          actualValue = metrics.days_without_checkin;
          break;
        case 'completion_rate':
          actualValue = metrics.completion_rate;
          break;
        case 'milestone_count':
          actualValue = metrics.milestone_count;
          break;
        case 'activity_count':
          actualValue = metrics.activity_count;
          break;
        default:
          actualValue = 0;
      }

      let met = false;
      switch (condition.operator) {
        case '<':
          met = actualValue < condition.value;
          break;
        case '<=':
          met = actualValue <= condition.value;
          break;
        case '>':
          met = actualValue > condition.value;
          break;
        case '>=':
          met = actualValue >= condition.value;
          break;
        case '==':
          met = actualValue === condition.value;
          break;
        case '!=':
          met = actualValue !== condition.value;
          break;
      }

      return { condition, met, value: actualValue };
    });
  },

  /**
   * Create a nudge from a rule and goal data
   */
  async createNudgeFromRule(
    rule: NudgeRule,
    goal: Goal,
    metrics: any,
    userId: string,
    conditionResults: Array<{ condition: NudgeCondition; met: boolean; value: any }>
  ): Promise<GoalNudge | null> {
    const supabase = createClient();

    // Replace template variables in message
    let message = rule.messageTemplate
      .replace('{goal_title}', goal.title)
      .replace('{completion_rate}', Math.round(metrics.completion_rate).toString())
      .replace('{days_remaining}', metrics.days_until_deadline?.toString() || 'N/A')
      .replace('{days_overdue}', metrics.days_overdue?.toString() || '0')
      .replace('{days_stalled}', metrics.days_without_progress?.toString() || '0')
      .replace('{days_since_checkin}', metrics.days_without_checkin?.toString() || '0');

    // Replace milestone-specific variables if applicable
    if (metrics.overdue_milestone) {
      message = message.replace('{milestone_title}', metrics.overdue_milestone.title);
    }

    // Generate action URL if template provided
    let actionUrl = rule.actionUrlTemplate;
    if (actionUrl) {
      actionUrl = actionUrl.replace('{goal_id}', goal.id);
    }

    // Calculate expiration date
    const expiresAt = rule.expiresInHours
      ? addDays(new Date(), rule.expiresInHours / 24).toISOString()
      : undefined;

    // Create conditions met descriptions
    const conditionsMet = conditionResults
      .filter(result => result.met)
      .map(result => {
        const condition = result.condition;
        return `${condition.type} ${condition.operator} ${condition.value} (actual: ${result.value})`;
      });

    const nudgeData = {
      goal_id: goal.id,
      user_id: userId,
      space_id: goal.space_id,
      nudge_type: rule.type,
      priority: rule.priority,
      title: rule.title,
      message,
      action_text: rule.actionText,
      action_url: actionUrl,
      conditions_met: conditionsMet,
      suggested_actions: rule.suggestedActions,
      is_dismissed: false,
      expires_at: expiresAt,
      milestone_id: metrics.overdue_milestone?.id
    };

    // Insert into database
    const { data, error } = await supabase
      .from('goal_nudges')
      .insert([nudgeData])
      .select()
      .single();

    if (error) {
      console.error('Error creating nudge:', error);
      return null;
    }

    return data as GoalNudge;
  },

  /**
   * Check if a similar nudge was created recently (within cooldown period)
   */
  async getRecentNudge(goalId: string, nudgeType: NudgeType, cooldownDays: number): Promise<GoalNudge | null> {
    const supabase = createClient();
    const cutoffDate = subDays(new Date(), cooldownDays).toISOString();

    const { data, error } = await supabase
      .from('goal_nudges')
      .select('*')
      .eq('goal_id', goalId)
      .eq('nudge_type', nudgeType)
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking recent nudges:', error);
    }

    return data || null;
  },

  /**
   * Get active nudges for a user
   */
  async getUserNudges(userId: string, spaceId?: string): Promise<GoalNudge[]> {
    const supabase = createClient();
    const now = new Date().toISOString();

    let query = supabase
      .from('goal_nudges')
      .select(`
        *,
        goal:goals(id, title, status, progress, category),
        milestone:goal_milestones(id, title, completed)
      `)
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (spaceId) {
      query = query.eq('space_id', spaceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user nudges:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Dismiss a nudge
   */
  async dismissNudge(nudgeId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('goal_nudges')
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString()
      })
      .eq('id', nudgeId);

    if (error) {
      console.error('Error dismissing nudge:', error);
      throw error;
    }
  },

  /**
   * Mark nudge action as taken
   */
  async markNudgeActionTaken(nudgeId: string, actionType: string = 'clicked'): Promise<void> {
    const supabase = createClient();

    // Log the action in a separate table for analytics
    const { error } = await supabase
      .from('goal_nudge_actions')
      .insert([{
        nudge_id: nudgeId,
        action_type: actionType,
        taken_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error logging nudge action:', error);
    }
  },

  /**
   * Get nudge analytics for a space
   */
  async getNudgeAnalytics(spaceId: string, days: number = 30): Promise<NudgeAnalytics> {
    const supabase = createClient();
    const startDate = subDays(new Date(), days).toISOString();

    // Get basic counts
    const { data: nudges } = await supabase
      .from('goal_nudges')
      .select('*, goal_nudge_actions(*)')
      .eq('space_id', spaceId)
      .gte('created_at', startDate);

    if (!nudges) {
      return {
        total_generated: 0,
        total_dismissed: 0,
        total_expired: 0,
        action_taken_count: 0,
        effectiveness_rate: 0,
        top_nudge_types: [],
        weekly_trend: []
      };
    }

    const totalGenerated = nudges.length;
    const totalDismissed = nudges.filter((n: { is_dismissed: boolean }) => n.is_dismissed).length;
    const now = new Date();
    const totalExpired = nudges.filter((n: { expires_at?: string | null }) => n.expires_at && isAfter(now, parseISO(n.expires_at))).length;
    const actionTakenCount = nudges.filter((n: { goal_nudge_actions?: unknown[] }) => n.goal_nudge_actions && n.goal_nudge_actions.length > 0).length;
    const effectivenessRate = totalGenerated > 0 ? (actionTakenCount / totalGenerated) * 100 : 0;

    // Analyze nudge types
    const typeMap = new Map<NudgeType, { count: number; actions: number }>();
    nudges.forEach((nudge: { nudge_type: NudgeType; goal_nudge_actions?: unknown[] }) => {
      const existing = typeMap.get(nudge.nudge_type) || { count: 0, actions: 0 };
      existing.count++;
      if (nudge.goal_nudge_actions && nudge.goal_nudge_actions.length > 0) {
        existing.actions++;
      }
      typeMap.set(nudge.nudge_type, existing);
    });

    const topNudgeTypes = Array.from(typeMap.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      effectiveness: stats.count > 0 ? (stats.actions / stats.count) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    // Generate weekly trend (simplified)
    const weeklyTrend = [];
    for (let i = 0; i < Math.min(4, Math.ceil(days / 7)); i++) {
      const weekStart = subDays(new Date(), (i + 1) * 7);
      const weekEnd = subDays(new Date(), i * 7);
      const weekNudges = nudges.filter((n: { created_at: string }) => {
        const created = parseISO(n.created_at);
        return isAfter(created, weekStart) && isBefore(created, weekEnd);
      });

      weeklyTrend.unshift({
        week: format(weekStart, 'MMM d'),
        generated: weekNudges.length,
        acted_upon: weekNudges.filter((n: { goal_nudge_actions?: unknown[] }) => n.goal_nudge_actions && n.goal_nudge_actions.length > 0).length
      });
    }

    return {
      total_generated: totalGenerated,
      total_dismissed: totalDismissed,
      total_expired: totalExpired,
      action_taken_count: actionTakenCount,
      effectiveness_rate: effectivenessRate,
      top_nudge_types: topNudgeTypes,
      weekly_trend: weeklyTrend
    };
  },

  /**
   * Clean up expired nudges
   */
  async cleanupExpiredNudges(): Promise<number> {
    const supabase = createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('goal_nudges')
      .delete()
      .lt('expires_at', now)
      .select('id');

    if (error) {
      console.error('Error cleaning up expired nudges:', error);
      return 0;
    }

    return data?.length || 0;
  }
};