/**
 * AI Context Service — Cached, intent-aware context assembly
 *
 * Replaces the inline buildSpaceContext() in the chat route with a
 * structured, cached service that:
 * - Caches static context (space name, members) for 30 minutes
 * - Caches summary context (counts, budget, goals) for 5 minutes
 * - Classifies user intent to load only relevant detail data
 * - Manages a token budget for the combined context
 *
 * All queries go through the authenticated Supabase client so
 * RLS enforces space isolation automatically.
 */

import { LRUCache } from 'lru-cache';
import { logger } from '@/lib/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SpaceContext } from './system-prompt';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpaceSummaryContext {
  taskCounts: { total: number; pending: number; overdue: number; dueToday: number };
  budgetRemaining: number | null;
  activeGoals: number;
  choreStats: { total: number; pending: number };
  shoppingLists: Array<{ title: string; itemCount: number }>;
  upcomingEvents: Array<{ title: string; startTime: string }>;
}

export interface RecentActivityContext {
  completedTasks: Array<{ title: string; completedAt: string }>;
  newExpenses: Array<{ description: string; amount: number; category: string }>;
  upcomingEvents: Array<{ title: string; startTime: string }>;
}

export type IntentCategory =
  | 'tasks'
  | 'calendar'
  | 'budget'
  | 'meals'
  | 'shopping'
  | 'goals'
  | 'chores'
  | 'general';

export interface FullAIContext extends SpaceContext {
  summary?: SpaceSummaryContext;
  recentActivity?: RecentActivityContext;
}

// ---------------------------------------------------------------------------
// Intent keywords
// ---------------------------------------------------------------------------

const INTENT_KEYWORDS: Record<IntentCategory, string[]> = {
  tasks: ['task', 'todo', 'to-do', 'due', 'overdue', 'assign', 'complete', 'finish', 'pending'],
  calendar: ['calendar', 'event', 'schedule', 'appointment', 'meeting', 'plan', 'tomorrow', 'today', 'week', 'weekend'],
  budget: ['budget', 'expense', 'spend', 'money', 'cost', 'price', 'afford', 'payment', 'bill'],
  meals: ['meal', 'dinner', 'lunch', 'breakfast', 'recipe', 'cook', 'food', 'snack', 'eat', 'prep'],
  shopping: ['shop', 'grocery', 'groceries', 'buy', 'list', 'item', 'store', 'cart'],
  goals: ['goal', 'target', 'milestone', 'progress', 'achieve', 'track'],
  chores: ['chore', 'clean', 'laundry', 'dishes', 'sweep', 'vacuum', 'household', 'tidy'],
  general: [],
};

// ---------------------------------------------------------------------------
// Cache configuration
// ---------------------------------------------------------------------------

const staticCache = new LRUCache<string, { spaceName: string; members: SpaceContext['members'] }>({
  max: 50,
  ttl: 30 * 60 * 1000, // 30 minutes
});

const summaryCache = new LRUCache<string, SpaceSummaryContext>({
  max: 50,
  ttl: 5 * 60 * 1000, // 5 minutes
});

const activityCache = new LRUCache<string, RecentActivityContext>({
  max: 50,
  ttl: 5 * 60 * 1000, // 5 minutes
});

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class AIContextService {
  /**
   * Classify user intent from a message using keyword matching
   */
  classifyIntent(message: string): IntentCategory {
    const lower = message.toLowerCase();
    const scores: Partial<Record<IntentCategory, number>> = {};

    for (const [category, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (category === 'general') continue;
      const count = keywords.filter((kw) => lower.includes(kw)).length;
      if (count > 0) {
        scores[category as IntentCategory] = count;
      }
    }

    if (Object.keys(scores).length === 0) return 'general';

    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as IntentCategory;
  }

  /**
   * Get static context (space name, members) with 30-min cache
   */
  async getStaticContext(
    supabase: SupabaseClient,
    spaceId: string
  ): Promise<{ spaceName: string; members: SpaceContext['members'] }> {
    const cached = staticCache.get(spaceId);
    if (cached) return cached;

    const [spaceResult, membersResult] = await Promise.all([
      supabase.from('spaces').select('name').eq('id', spaceId).single(),
      supabase
        .from('space_members')
        .select('user_id, role, user_profiles:user_id ( name, email )')
        .eq('space_id', spaceId)
        .order('joined_at', { ascending: true }),
    ]);

    type MemberRow = {
      user_id: string;
      role: string;
      user_profiles: { name: string | null; email: string | null } | null;
    };

    const members = ((membersResult.data as MemberRow[] | null) ?? []).map((m) => ({
      id: m.user_id,
      displayName: m.user_profiles?.name || m.user_profiles?.email || 'Unknown',
      role: m.role,
    }));

    const result = {
      spaceName: spaceResult.data?.name ?? 'My Space',
      members,
    };

    staticCache.set(spaceId, result);
    return result;
  }

  /**
   * Get summary context (counts, budget, stats) with 5-min cache
   */
  async getSummaryContext(
    supabase: SupabaseClient,
    spaceId: string
  ): Promise<SpaceSummaryContext> {
    const cached = summaryCache.get(spaceId);
    if (cached) return cached;

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalTasksResult,
      pendingTasksResult,
      overdueTasksResult,
      dueTodayResult,
      goalsResult,
      choresResult,
      pendingChoresResult,
      shoppingResult,
      eventsResult,
    ] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('space_id', spaceId),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).in('status', ['pending', 'in_progress']),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).in('status', ['pending', 'in_progress']).lt('due_date', today),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).in('status', ['pending', 'in_progress']).eq('due_date', today),
      supabase.from('goals').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).in('status', ['active', 'in_progress']),
      supabase.from('chores').select('id', { count: 'exact', head: true }).eq('space_id', spaceId),
      supabase.from('chores').select('id', { count: 'exact', head: true }).eq('space_id', spaceId).in('status', ['pending', 'in_progress']),
      supabase.from('shopping_lists').select('title, id').eq('space_id', spaceId).limit(5),
      supabase
        .from('calendar_events')
        .select('title, start_time')
        .eq('space_id', spaceId)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', nextWeek)
        .order('start_time', { ascending: true })
        .limit(10),
    ]);

    // Count items per shopping list
    type ShoppingListRow = { title: string; id: string };
    const shoppingLists = await Promise.all(
      ((shoppingResult.data as ShoppingListRow[] | null) ?? []).map(async (list) => {
        const { count } = await supabase
          .from('shopping_items')
          .select('id', { count: 'exact', head: true })
          .eq('list_id', list.id)
          .eq('purchased', false);
        return { title: list.title, itemCount: count ?? 0 };
      })
    );

    type EventRow = { title: string; start_time: string };

    const summary: SpaceSummaryContext = {
      taskCounts: {
        total: totalTasksResult.count ?? 0,
        pending: pendingTasksResult.count ?? 0,
        overdue: overdueTasksResult.count ?? 0,
        dueToday: dueTodayResult.count ?? 0,
      },
      budgetRemaining: null, // Can be expanded with budget service
      activeGoals: goalsResult.count ?? 0,
      choreStats: {
        total: choresResult.count ?? 0,
        pending: pendingChoresResult.count ?? 0,
      },
      shoppingLists: shoppingLists.filter((l) => l.itemCount > 0),
      upcomingEvents: ((eventsResult.data as EventRow[] | null) ?? []).map((e) => ({
        title: e.title,
        startTime: e.start_time,
      })),
    };

    summaryCache.set(spaceId, summary);
    return summary;
  }

  /**
   * Get recent activity (last 24h) with 5-min cache
   */
  async getRecentActivity(
    supabase: SupabaseClient,
    spaceId: string
  ): Promise<RecentActivityContext> {
    const cached = activityCache.get(spaceId);
    if (cached) return cached;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [completedResult, expensesResult, eventsResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('title, updated_at')
        .eq('space_id', spaceId)
        .eq('status', 'completed')
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(10),
      supabase
        .from('expenses')
        .select('description, amount, category')
        .eq('space_id', spaceId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('calendar_events')
        .select('title, start_time')
        .eq('space_id', spaceId)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        .order('start_time', { ascending: true })
        .limit(5),
    ]);

    type CompletedRow = { title: string; updated_at: string };
    type ExpenseRow = { description: string; amount: number; category: string };
    type EventRow = { title: string; start_time: string };

    const activity: RecentActivityContext = {
      completedTasks: ((completedResult.data as CompletedRow[] | null) ?? []).map((t) => ({
        title: t.title,
        completedAt: t.updated_at,
      })),
      newExpenses: ((expensesResult.data as ExpenseRow[] | null) ?? []).map((e) => ({
        description: e.description,
        amount: e.amount,
        category: e.category,
      })),
      upcomingEvents: ((eventsResult.data as EventRow[] | null) ?? []).map((e) => ({
        title: e.title,
        startTime: e.start_time,
      })),
    };

    activityCache.set(spaceId, activity);
    return activity;
  }

  /**
   * Build the full AI context by assembling all sub-contexts
   */
  async buildFullContext(
    supabase: SupabaseClient,
    spaceId: string,
    user: { id: string; email?: string; user_metadata?: { name?: string } }
  ): Promise<FullAIContext> {
    try {
      const [staticCtx, summary, activity] = await Promise.all([
        this.getStaticContext(supabase, spaceId),
        this.getSummaryContext(supabase, spaceId),
        this.getRecentActivity(supabase, spaceId),
      ]);

      return {
        spaceId,
        spaceName: staticCtx.spaceName,
        members: staticCtx.members,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userName:
          user.user_metadata?.name || user.email?.split('@')[0] || 'there',
        userId: user.id,
        // Legacy fields (for backward compat with system-prompt.ts)
        recentTasks: [], // Summary provides counts instead
        recentChores: [],
        activeShoppingLists: summary.shoppingLists.map((l) => ({
          title: l.title,
          item_count: l.itemCount,
        })),
        upcomingEvents: summary.upcomingEvents.map((e) => ({
          title: e.title,
          start_time: e.startTime,
        })),
        // Enhanced context
        summary,
        recentActivity: activity,
      };
    } catch (error) {
      logger.error('[AIContextService] Failed to build context', error, {
        component: 'ai-context-service',
        action: 'build_full_context',
      });

      // Fallback: return minimal context
      return {
        spaceId,
        spaceName: 'My Space',
        members: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userName:
          user.user_metadata?.name || user.email?.split('@')[0] || 'there',
        userId: user.id,
      };
    }
  }

  /**
   * Estimate token count for a string (~4 chars per token)
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate context string to fit within a token budget
   */
  truncateContext(context: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (context.length <= maxChars) return context;
    return context.slice(0, maxChars) + '\n\n[Context truncated to fit token budget]';
  }

  /**
   * Invalidate all caches for a space (e.g., after a write operation)
   */
  invalidateSpace(spaceId: string): void {
    staticCache.delete(spaceId);
    summaryCache.delete(spaceId);
    activityCache.delete(spaceId);
  }
}

export const aiContextService = new AIContextService();
