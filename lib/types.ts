// =============================================
// RE-EXPORTS FROM VALIDATION SCHEMAS
// =============================================

// Task types from Zod schemas
export type { CreateTaskInput, UpdateTaskInput as UpdateTaskInputZod } from './validations/task-schemas';

// =============================================
// RE-EXPORTS: SUBSCRIPTION & STRIPE TYPES
// =============================================

// Subscription types
export type {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionPeriod,
  Subscription,
  SubscriptionEventType,
  TriggerSource,
  SubscriptionEvent,
  UsageType,
  DailyUsage,
  FeatureLimits,
  FeatureLimitsMap,
  SubscriptionStatusResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  ChangePlanRequest,
  ChangePlanResponse,
  FeatureAvailability,
  UsageCheckResult,
} from './types/subscription';

// Stripe types
export type {
  StripeProduct,
  StripePrice,
  StripePriceInfo,
  StripeCheckoutSessionConfig,
  StripeCheckoutSession,
  StripeCustomer,
  StripeSubscription,
  StripeInvoice,
  StripeWebhookEventType,
  StripeWebhookEvent,
  WebhookHandlerResult,
  StripeErrorType,
  StripeError,
  StripePaymentMethod,
} from './types/stripe';

// =============================================
// ENUMS
// =============================================

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  BLOCKED = 'blocked',
  ON_HOLD = 'on-hold',
  COMPLETED = 'completed',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskCategory {
  WORK = 'work',
  PERSONAL = 'personal',
  HOME = 'home',
  SHOPPING = 'shopping',
  HEALTH = 'health',
  OTHER = 'other',
}

export enum EventType {
  MEETING = 'meeting',
  APPOINTMENT = 'appointment',
  REMINDER = 'reminder',
  DEADLINE = 'deadline',
  SOCIAL = 'social',
  OTHER = 'other',
}

export enum SpaceMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum PresenceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled',
}

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
}

export enum ChoreFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum BudgetPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
}

// =============================================
// BASE TYPES
// =============================================

export interface User {
  id: string;
  email: string;
  name: string;
  pronouns?: string;
  color_theme?: string;
  timezone: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Space {
  id: string;
  name: string;
  description?: string | null;
  type?: 'personal' | 'household' | 'family' | 'roommates' | 'friends';
  created_at: string;
  updated_at: string;
  user_id?: string;
  created_by?: string;
  settings?: Record<string, any>;
  is_personal?: boolean;
  auto_created?: boolean;
}

export interface WorkspaceMigration {
  id: string;
  user_id: string;
  from_space_id: string;
  to_space_id: string;
  item_type: string;
  item_id: string;
  migrated_at: string;
  created_at: string;
}

export interface SpaceMember {
  space_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  users?: {
    email: string;
  };
}

export interface UserPresence {
  user_id: string;
  space_id: string;
  status: PresenceStatus;
  last_activity: string;
  updated_at: string;
}

export interface SpaceMemberWithPresence extends SpaceMember {
  name: string;
  email: string;
  avatar_url?: string;
  presence_status: PresenceStatus;
  last_activity?: string;
  presence_updated_at?: string;
}

// =============================================
// TASK TYPES
// =============================================

export interface Task {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed';
  due_date?: string;
  assigned_to?: string;
  created_by?: string;
  estimated_hours?: number;
  calendar_sync?: boolean;
  quick_note?: string;
  tags?: string;
  color?: string;
  sort_order?: number;
  archived?: boolean;
  archived_at?: string;
  // Snooze fields
  is_snoozed?: boolean;
  snoozed_until?: string;
  snoozed_by?: string;
  snooze_count?: number;
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_interval?: number;
  recurrence_days_of_week?: number[];
  recurrence_day_of_month?: number;
  recurrence_month?: number;
  recurrence_end_date?: string;
  recurrence_end_count?: number;
  parent_recurrence_id?: string;
  is_recurrence_template?: boolean;
  recurrence_exceptions?: string[];
  recurrence_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// =============================================
// CALENDAR & EVENT TYPES
// =============================================

export interface Event {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  event_type?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  assigned_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  remind_at: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  assigned_to?: string;
  created_by?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // New fields from migration 20251006000003_add_reminder_category.sql
  category: 'bills' | 'health' | 'work' | 'personal' | 'household';
  emoji?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'completed' | 'snoozed';
  snooze_until?: string;
  reminder_time?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
}

// =============================================
// MESSAGING TYPES
// =============================================

export interface Message {
  id: string;
  space_id: string;
  sender_id?: string;
  content: string;
  thread_id?: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// SHOPPING TYPES
// =============================================

export interface ShoppingList {
  id: string;
  space_id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  list_id: string;
  name: string;
  quantity?: string;
  category?: string;
  is_purchased: boolean;
  added_by?: string;
  purchased_by?: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// MEAL PLANNING TYPES
// =============================================

export interface Recipe {
  id: string;
  space_id: string;
  name: string;
  description?: string;
  ingredients?: RecipeIngredient[];
  instructions?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  category?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit?: string;
}

export interface MealPlan {
  id: string;
  space_id: string;
  recipe_id?: string;
  meal_date: string;
  meal_type?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// HOUSEHOLD TYPES (Chores & Projects)
// =============================================

export interface Chore {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'once';
  assigned_to?: string;
  status: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed';
  due_date?: string;
  completed_at?: string;
  completion_percentage?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sort_order?: number;
  calendar_sync?: boolean;
}

export interface ChoreCompletion {
  id: string;
  chore_id: string;
  completed_by?: string;
  completed_at: string;
  notes?: string;
}

// =============================================
// FINANCIAL TYPES (Budget & Expenses)
// =============================================

export interface Project {
  id: string;
  space_id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  start_date?: string;
  target_date?: string;
  budget_amount?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  space_id: string;
  title: string;
  amount: number;
  category?: string;
  date?: string;
  due_date?: string;
  paid_by?: string;
  description?: string;
  notes?: string;
  project_id?: string;
  status?: 'pending' | 'paid' | 'overdue';
  payment_method?: string;
  paid_at?: string;
  recurring?: boolean;
  is_recurring?: boolean;
  recurring_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  split_type?: 'equal' | 'percentage' | 'custom' | 'none';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  space_id: string;
  monthly_budget: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// GOALS & MILESTONES TYPES
// =============================================

export interface Goal {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  target_date?: string;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  progress_percentage?: number;
  current_amount?: number | null;
  target_amount?: number;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  target_date?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalUpdate {
  id: string;
  goal_id: string;
  user_id?: string;
  content: string;
  created_at: string;
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'streak' | 'collaboration' | 'persistence' | 'variety' | 'speed';
  requirement: BadgeRequirement;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  space_id: string;
  badge_id: string;
  earned_at: string;
  progress?: BadgeProgress;
  badge?: AchievementBadge;
}

export type BadgeRequirement =
  | { type: 'goals_completed'; count: number }
  | { type: 'milestones_completed'; count: number }
  | { type: 'streak_days'; count: number }
  | { type: 'weekly_checkins'; count: number }
  | { type: 'shared_goals_completed'; count: number }
  | { type: 'goal_duration_days'; min: number }
  | { type: 'categories_completed'; count: number }
  | { type: 'goal_completed_hours'; max: number }
  | { type: 'fast_goals_completed'; count: number; max_days: number }
  | { type: 'first_goal_days'; max: number }
  | { type: 'perfect_goal_completed'; count: number };

export interface BadgeProgress {
  current: number;
  target: number;
  percentage: number;
  metadata?: Record<string, unknown>;
}

// =============================================
// DAILY CHECKIN TYPES
// =============================================

export interface DailyCheckin {
  id: string;
  user_id: string;
  space_id: string;
  date: string;
  mood?: string;
  highlights?: string;
  challenges?: string;
  gratitude?: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// ACTIVITY LOG TYPES
// =============================================

export interface ActivityLog {
  id: string;
  space_id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// =============================================
// EXTENDED TYPES (with relations)
// =============================================

export interface TaskWithRelations extends Task {
  assigned_user?: User;
  creator?: User;
  space?: Space;
}

export interface EventWithRelations extends Event {
  assigned_user?: User;
  creator?: User;
  space?: Space;
}

export interface MessageWithRelations extends Message {
  sender?: User;
  space?: Space;
  replies?: Message[];
}

export interface ShoppingListWithItems extends ShoppingList {
  items?: ShoppingItem[];
  creator?: User;
}

export interface GoalWithMilestones extends Goal {
  milestones?: GoalMilestone[];
  updates?: GoalUpdate[];
  creator?: User;
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// =============================================
// STATS & QUERY TYPES
// =============================================

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  onHold: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

export interface TaskQueryOptions {
  status?: string | string[];
  priority?: string | string[];
  category?: string;
  assigned_to?: string;
  created_by?: string;
  search?: string;
  sort?: 'created_at' | 'updated_at' | 'due_date' | 'priority';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// =============================================
// FORM TYPES
// =============================================

// CreateTaskInput and UpdateTaskInput types are now generated from Zod schemas in task-schemas.ts
// They are re-exported at the top of this file
// Import them from '@/lib/types' to get the Zod-validated versions

export interface CreateEventInput {
  space_id: string;
  title: string;
  description?: string;
  event_type?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  assigned_to?: string;
}

export interface CreateShoppingListInput {
  space_id: string;
  name: string;
  description?: string;
}

export interface CreateShoppingItemInput {
  list_id: string;
  name: string;
  quantity?: string;
  category?: string;
}

export interface CreateGoalInput {
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  target_date?: string;
}

export interface CreateMilestoneInput {
  goal_id: string;
  title: string;
  description?: string;
  target_date?: string;
}

export interface CreateChoreInput {
  space_id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'once';
  assigned_to?: string;
  created_by: string;
  status?: 'pending' | 'in-progress' | 'blocked' | 'on-hold' | 'completed';
  due_date?: string;
  calendar_sync?: boolean;
}

export interface UpdateChoreInput {
  title?: string;
  description?: string;
  frequency?: string;
  assigned_to?: string;
}

// =============================================
// SPACE & INVITATION TYPES
// =============================================

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface SpaceInvitation {
  id: string;
  space_id: string;
  email: string;
  invited_by: string | null;
  token: string;
  status: InvitationStatus;
  role: 'member' | 'admin';
  created_at: string;
  expires_at: string;
}

export interface CreateSpaceInput {
  name: string;
}

export interface CreateInvitationInput {
  space_id: string;
  email: string;
}

// =============================================
// USER PROGRESS & ONBOARDING TYPES
// =============================================

export interface UserProgress {
  id: string;
  user_id: string;
  space_id: string | null;

  // Onboarding status
  onboarding_completed: boolean;
  space_setup_completed: boolean;

  created_at: string;
  updated_at: string;
}

export interface UpdateUserProgressInput {
  onboarding_completed?: boolean;
  space_setup_completed?: boolean;
}

// =============================================
// FEEDBACK TYPES
// =============================================

export enum FeedbackType {
  BUG = 'bug',
  FEATURE_REQUEST = 'feature_request',
  UI_UX = 'ui_ux',
  GENERAL = 'general',
}

export enum FeedbackStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  WONT_FIX = 'wont_fix',
}

export interface FeedbackSubmission {
  id: string;
  user_id: string;
  space_id: string | null;
  feedback_type: FeedbackType | null;
  feature_name: string | null;
  page_url: string | null;
  description: string;
  screenshot_url: string | null;
  browser_info: Record<string, any> | null;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface CreateFeedbackInput {
  feedback_type?: FeedbackType;
  feature_name?: string;
  page_url?: string;
  description: string;
  screenshot?: File;
  browser_info?: Record<string, any>;
}

export interface UpdateFeedbackInput {
  status?: FeedbackStatus;
  admin_notes?: string;
}
