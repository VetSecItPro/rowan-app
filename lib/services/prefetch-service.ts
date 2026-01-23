/**
 * Data Prefetch Service
 *
 * Aggressively prefetches data for main features to enable instant page loads.
 * Uses React Query's prefetchQuery for caching with configurable stale times.
 */

import { QueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { QUERY_OPTIONS } from '@/lib/react-query/query-client';

// Feature-specific query keys for prefetching
export const PREFETCH_KEYS = {
  tasks: (spaceId: string) => ['tasks', 'list', spaceId] as const,
  taskCategories: (spaceId: string) => ['tasks', 'categories', spaceId] as const,
  calendar: (spaceId: string, month: string) => ['calendar', 'events', spaceId, month] as const,
  reminders: (spaceId: string) => ['reminders', 'list', spaceId] as const,
  messages: (spaceId: string) => ['messages', 'conversations', spaceId] as const,
  shopping: (spaceId: string) => ['shopping', 'lists', spaceId] as const,
  meals: (spaceId: string) => ['meals', 'plans', spaceId] as const,
  goals: (spaceId: string) => ['goals', 'list', spaceId] as const,
  projects: (spaceId: string) => ['projects', 'list', spaceId] as const,
  rewards: (spaceId: string) => ['rewards', 'catalog', spaceId] as const,
  spaceMembers: (spaceId: string) => ['space', 'members', spaceId] as const,
};

// Lightweight prefetch functions - minimal data for fast initial loads
const prefetchFunctions = {
  async tasks(spaceId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, assigned_to')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  },

  async taskCategories(spaceId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('task_categories')
      .select('id, name, color, icon')
      .eq('space_id', spaceId)
      .order('name');
    return data || [];
  },

  async calendar(spaceId: string, month: string) {
    const supabase = createClient();
    // Parse month to get date range
    const startDate = new Date(month + '-01');
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const { data } = await supabase
      .from('events')
      .select('id, title, start_time, end_time, all_day, custom_color')
      .eq('space_id', spaceId)
      .gte('start_time', startDate.toISOString())
      .lt('start_time', endDate.toISOString())
      .order('start_time');
    return data || [];
  },

  async reminders(spaceId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('reminders')
      .select('id, title, remind_at, completed, priority, recurrence_pattern')
      .eq('space_id', spaceId)
      .eq('completed', false)
      .order('remind_at')
      .limit(50);
    return data || [];
  },

  async messages(spaceId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('conversations')
      .select('id, title, conversation_type, last_message_at, participants')
      .eq('space_id', spaceId)
      .order('last_message_at', { ascending: false })
      .limit(20);
    return data || [];
  },

  async shopping(spaceId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('shopping_lists')
      .select('id, title, status, store_name, items:shopping_items(id, checked)')
      .eq('space_id', spaceId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);
    return data || [];
  },

  async meals(spaceId: string) {
    const supabase = createClient();
    // Get current week's meal plans
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const { data } = await supabase
      .from('meal_plans')
      .select('id, meal_date, meal_type, recipe_id, notes')
      .eq('space_id', spaceId)
      .gte('meal_date', startOfWeek.toISOString().split('T')[0])
      .lte('meal_date', endOfWeek.toISOString().split('T')[0])
      .order('meal_date');
    return data || [];
  },

  async goals(spaceId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('goals')
      .select('id, title, status, target_date, current_amount, target_amount')
      .eq('space_id', spaceId)
      .in('status', ['active', 'in_progress'])
      .order('target_date')
      .limit(20);
    return data || [];
  },

  async projects(spaceId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, budget_amount, actual_cost')
      .eq('space_id', spaceId)
      .in('status', ['active', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);
    return data || [];
  },

  async rewards(spaceId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('rewards_catalog')
      .select('id, name, cost_points, is_active')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .order('cost_points')
      .limit(20);
    return data || [];
  },

  async spaceMembers(spaceId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from('space_members')
      .select(`
        user_id,
        role,
        profiles:user_id(id, name, avatar_url, color_theme)
      `)
      .eq('space_id', spaceId);
    return data || [];
  },
};

/**
 * Prefetch all critical data for a space
 * Call this on dashboard load or after successful login
 */
export async function prefetchCriticalData(
  queryClient: QueryClient,
  spaceId: string
): Promise<void> {
  if (!spaceId) return;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  // High priority - prefetch immediately (most used features)
  const highPriority = [
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.tasks(spaceId),
      queryFn: () => prefetchFunctions.tasks(spaceId),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.calendar(spaceId, currentMonth),
      queryFn: () => prefetchFunctions.calendar(spaceId, currentMonth),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.spaceMembers(spaceId),
      queryFn: () => prefetchFunctions.spaceMembers(spaceId),
      staleTime: QUERY_OPTIONS.spaces.staleTime,
    }),
  ];

  // Wait for high priority to complete first
  await Promise.all(highPriority);

  // Normal priority - prefetch in parallel after high priority
  const normalPriority = [
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.reminders(spaceId),
      queryFn: () => prefetchFunctions.reminders(spaceId),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.messages(spaceId),
      queryFn: () => prefetchFunctions.messages(spaceId),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.shopping(spaceId),
      queryFn: () => prefetchFunctions.shopping(spaceId),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.taskCategories(spaceId),
      queryFn: () => prefetchFunctions.taskCategories(spaceId),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
  ];

  // Don't await - let these run in background
  Promise.all(normalPriority).catch(console.error);

  // Low priority - prefetch last (less frequently used)
  const lowPriority = [
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.meals(spaceId),
      queryFn: () => prefetchFunctions.meals(spaceId),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.goals(spaceId),
      queryFn: () => prefetchFunctions.goals(spaceId),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.projects(spaceId),
      queryFn: () => prefetchFunctions.projects(spaceId),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
    queryClient.prefetchQuery({
      queryKey: PREFETCH_KEYS.rewards(spaceId),
      queryFn: () => prefetchFunctions.rewards(spaceId),
      staleTime: QUERY_OPTIONS.features.staleTime,
    }),
  ];

  // Don't await - let these run in background
  Promise.all(lowPriority).catch(console.error);
}

/**
 * Prefetch data for a specific feature
 * Call this on hover or focus of navigation items
 */
export async function prefetchFeatureData(
  queryClient: QueryClient,
  feature: keyof typeof prefetchFunctions,
  spaceId: string,
  options?: { month?: string }
): Promise<void> {
  if (!spaceId) return;

  const queryKeyMap: Record<string, readonly unknown[]> = {
    tasks: PREFETCH_KEYS.tasks(spaceId),
    taskCategories: PREFETCH_KEYS.taskCategories(spaceId),
    calendar: PREFETCH_KEYS.calendar(spaceId, options?.month || new Date().toISOString().slice(0, 7)),
    reminders: PREFETCH_KEYS.reminders(spaceId),
    messages: PREFETCH_KEYS.messages(spaceId),
    shopping: PREFETCH_KEYS.shopping(spaceId),
    meals: PREFETCH_KEYS.meals(spaceId),
    goals: PREFETCH_KEYS.goals(spaceId),
    projects: PREFETCH_KEYS.projects(spaceId),
    rewards: PREFETCH_KEYS.rewards(spaceId),
    spaceMembers: PREFETCH_KEYS.spaceMembers(spaceId),
  };

  const queryKey = queryKeyMap[feature];
  if (!queryKey) return;

  // Check if data is already cached and fresh
  const cachedData = queryClient.getQueryData(queryKey);
  if (cachedData) {
    const state = queryClient.getQueryState(queryKey);
    if (state?.dataUpdatedAt && Date.now() - state.dataUpdatedAt < QUERY_OPTIONS.features.staleTime) {
      // Data is fresh, skip prefetch
      return;
    }
  }

  const queryFn = feature === 'calendar'
    ? () => prefetchFunctions.calendar(spaceId, options?.month || new Date().toISOString().slice(0, 7))
    : () => prefetchFunctions[feature](spaceId);

  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: QUERY_OPTIONS.features.staleTime,
  });
}

/**
 * Map navigation routes to feature prefetch keys
 */
export const ROUTE_TO_FEATURE_MAP: Record<string, keyof typeof prefetchFunctions> = {
  '/tasks': 'tasks',
  '/calendar': 'calendar',
  '/reminders': 'reminders',
  '/messages': 'messages',
  '/shopping': 'shopping',
  '/meals': 'meals',
  '/goals': 'goals',
  '/projects': 'projects',
  '/rewards': 'rewards',
};

/**
 * Get prefetch function for a route
 */
export function getPrefetchForRoute(
  route: string
): keyof typeof prefetchFunctions | null {
  return ROUTE_TO_FEATURE_MAP[route] || null;
}
