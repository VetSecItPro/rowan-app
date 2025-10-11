// =============================================
// ENUMS
// =============================================

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
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
  created_at: string;
  updated_at: string;
}

export interface SpaceMember {
  space_id: string;
  user_id: string;
  role: string;
  joined_at: string;
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
  priority: string;
  status: string;
  due_date?: string;
  assigned_to?: string;
  created_by?: string;
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
  frequency?: string;
  assigned_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
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
  status: string;
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
  project_id?: string;
  status?: 'pending' | 'paid' | 'overdue';
  payment_method?: string;
  paid_at?: string;
  recurring?: boolean;
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
  cancelled: number;
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

export interface CreateTaskInput {
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  due_date?: string;
  assigned_to?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  due_date?: string;
  assigned_to?: string;
}

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
  frequency: string;
  assigned_to?: string;
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

export interface Space {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SpaceMember {
  space_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface SpaceInvitation {
  id: string;
  space_id: string;
  email: string;
  invited_by: string | null;
  token: string;
  status: InvitationStatus;
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

  // Guided flow completion tracking
  first_task_created: boolean;
  first_event_created: boolean;
  first_reminder_created: boolean;
  first_message_sent: boolean;
  first_shopping_item_added: boolean;
  first_meal_planned: boolean;
  first_household_task_created: boolean;
  first_goal_set: boolean;

  // Guided flow skip tracking
  skipped_task_guide: boolean;
  skipped_event_guide: boolean;
  skipped_reminder_guide: boolean;
  skipped_message_guide: boolean;
  skipped_shopping_guide: boolean;
  skipped_meal_guide: boolean;
  skipped_household_guide: boolean;
  skipped_goal_guide: boolean;

  // Onboarding status
  onboarding_completed: boolean;
  space_setup_completed: boolean;

  created_at: string;
  updated_at: string;
}

export interface UpdateUserProgressInput {
  first_task_created?: boolean;
  first_event_created?: boolean;
  first_reminder_created?: boolean;
  first_message_sent?: boolean;
  first_shopping_item_added?: boolean;
  first_meal_planned?: boolean;
  first_household_task_created?: boolean;
  first_goal_set?: boolean;
  skipped_task_guide?: boolean;
  skipped_event_guide?: boolean;
  skipped_reminder_guide?: boolean;
  skipped_message_guide?: boolean;
  skipped_shopping_guide?: boolean;
  skipped_meal_guide?: boolean;
  skipped_household_guide?: boolean;
  skipped_goal_guide?: boolean;
  onboarding_completed?: boolean;
  space_setup_completed?: boolean;
}
