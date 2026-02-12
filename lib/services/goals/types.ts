/**
 * Shared types for the goals service layer.
 *
 * All interfaces and type aliases used across goal, milestone, check-in,
 * and activity sub-services are defined here to avoid circular dependencies.
 *
 * @module goals/types
 */

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

export interface GoalDependency {
  id: string;
  space_id: string;
  goal_id: string;
  depends_on_goal_id: string;
  dependency_type: 'prerequisite' | 'trigger' | 'blocking';
  completion_threshold: number;
  auto_unlock: boolean;
  unlock_delay_days: number;
  status: 'pending' | 'satisfied' | 'bypassed';
  satisfied_at?: string;
  bypassed_at?: string;
  bypassed_by?: string;
  bypass_reason?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
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
  assigned_to?: string; // User ID assigned to work on this goal
  assignee?: { // Populated user data for assigned_to
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
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
  assigned_to?: string; // User ID to assign this goal to
  depends_on_goal_id?: string; // Optional dependency
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
  depends_on_goal_id?: string; // Optional goal dependency
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

export interface CreateCheckInSettingsInput {
  goal_id: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number | null;
  day_of_month?: number | null;
  reminder_time: string;
  enable_reminders: boolean;
  enable_voice_notes?: boolean;
  enable_photos?: boolean;
  reminder_days_before?: number;
  auto_schedule?: boolean;
}

export interface UpdateCheckInSettingsInput {
  goal_id: string;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number | null;
  day_of_month?: number | null;
  reminder_time?: string;
  enable_reminders?: boolean;
  enable_voice_notes?: boolean;
  enable_photos?: boolean;
  reminder_days_before?: number;
  auto_schedule?: boolean;
}

export interface GoalCheckInSettings {
  id: string;
  goal_id: string;
  user_id: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number | null; // 0 = Sunday
  day_of_month?: number | null;
  reminder_time: string;
  enable_reminders: boolean;
  enable_voice_notes?: boolean;
  enable_photos?: boolean;
  reminder_days_before?: number;
  auto_schedule?: boolean;
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
  activity_data: Record<string, unknown>;
  title: string;
  description?: string;
  entity_title?: string;
  entity_type?: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  user?: {
    id: string;
    full_name: string;
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
    full_name: string;
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
  activity_data?: Record<string, unknown>;
}

type GoalUpdatePayload = Partial<CreateGoalInput> & {
  completed_at?: string | null;
  progress?: number;
};

type MilestoneUpdatePayload = {
  completed: boolean;
  completed_at?: string | null;
};

// Re-export internal payload types for sub-services
export type { GoalUpdatePayload, MilestoneUpdatePayload };
