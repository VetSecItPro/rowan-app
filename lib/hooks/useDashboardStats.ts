import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { Space } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Debounce utility to coalesce rapid real-time events into a single reload
function debounce<T extends (...args: unknown[]) => unknown>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
}

export interface EnhancedDashboardStats {
    tasks: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        dueToday: number;
        overdue: number;
        highPriority: number;
        assignedToMe: number;
        completionRate: number;
        trend: number;
        recentTasks: Array<{ id: string; title: string; due_date?: string; priority?: string }>;
    };
    events: {
        total: number;
        today: number;
        thisWeek: number;
        upcoming: number;
        personal: number;
        shared: number;
        nextEvent: { title: string; start_time: string } | null;
        categories: Record<string, number>;
        trend: number;
    };
    reminders: {
        total: number;
        active: number;
        completed: number;
        overdue: number;
        dueToday: number;
        byCategory: Record<string, number>;
        nextDue: { title: string; reminder_time: string } | null;
        trend: number;
    };
    messages: {
        total: number;
        unread: number;
        today: number;
        conversations: number;
        lastMessage: { content: string; sender: string; created_at: string } | null;
        mostActive: string;
        trend: number;
    };
    shopping: {
        totalLists: number;
        activeLists: number;
        totalItems: number;
        checkedToday: number;
        uncheckedItems: number;
        urgentList: string | null;
        estimatedBudget: number;
        trend: number;
    };
    meals: {
        thisWeek: number;
        savedRecipes: number;
        mealsToday: number;
        missingIngredients: number;
        nextMeal: { title: string; scheduled_date: string; meal_type?: string } | null;
        favoriteCategory: string;
        shoppingListGenerated: boolean;
        trend: number;
    };
    household: {
        totalChores: number;
        completedThisWeek: number;
        assignedToMe: number;
        assignedToPartner: number;
        overdue: number;
        monthlyBudget: number;
        spent: number;
        remaining: number;
        pendingBills: number;
        nextBill: { title: string; due_date: string; amount: number } | null;
        trend: number;
    };
    projects: {
        total: number;
        planning: number;
        inProgress: number;
        completed: number;
        onHold: number;
        totalBudget: number;
        totalExpenses: number;
        trend: number;
    };
    goals: {
        total: number;
        active: number;
        completed: number;
        inProgress: number;
        milestonesReached: number;
        totalMilestones: number;
        overallProgress: number;
        topGoal: { title: string; progress: number } | null;
        endingThisMonth: number;
        trend: number;
    };
}

const initialStats: EnhancedDashboardStats = {
    tasks: {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        dueToday: 0,
        overdue: 0,
        highPriority: 0,
        assignedToMe: 0,
        completionRate: 0,
        trend: 0,
        recentTasks: [],
    },
    events: {
        total: 0,
        today: 0,
        thisWeek: 0,
        upcoming: 0,
        personal: 0,
        shared: 0,
        nextEvent: null,
        categories: {},
        trend: 0,
    },
    reminders: {
        total: 0,
        active: 0,
        completed: 0,
        overdue: 0,
        dueToday: 0,
        byCategory: {},
        nextDue: null,
        trend: 0,
    },
    messages: {
        total: 0,
        unread: 0,
        today: 0,
        conversations: 0,
        lastMessage: null,
        mostActive: '',
        trend: 0,
    },
    shopping: {
        totalLists: 0,
        activeLists: 0,
        totalItems: 0,
        checkedToday: 0,
        uncheckedItems: 0,
        urgentList: null,
        estimatedBudget: 0,
        trend: 0,
    },
    meals: {
        thisWeek: 0,
        savedRecipes: 0,
        mealsToday: 0,
        missingIngredients: 0,
        nextMeal: null,
        favoriteCategory: '',
        shoppingListGenerated: false,
        trend: 0,
    },
    household: {
        totalChores: 0,
        completedThisWeek: 0,
        assignedToMe: 0,
        assignedToPartner: 0,
        overdue: 0,
        monthlyBudget: 3000,
        spent: 0,
        remaining: 3000,
        pendingBills: 0,
        nextBill: null,
        trend: 0,
    },
    projects: {
        total: 0,
        planning: 0,
        inProgress: 0,
        completed: 0,
        onHold: 0,
        totalBudget: 0,
        totalExpenses: 0,
        trend: 0,
    },
    goals: {
        total: 0,
        active: 0,
        completed: 0,
        inProgress: 0,
        milestonesReached: 0,
        totalMilestones: 0,
        overallProgress: 0,
        topGoal: null,
        endingThisMonth: 0,
        trend: 0,
    },
};

/** Fetches and aggregates dashboard statistics (tasks, events, meals, budgets, goals) for a space */
export function useDashboardStats(user: { id: string } | null, currentSpace: Space | null, authLoading: boolean) {
    const [stats, setStats] = useState<EnhancedDashboardStats>(initialStats);
    const [loading, setLoading] = useState(true);

    const loadAllStats = useCallback(async () => {
        if (!currentSpace || !user || authLoading) {
            // Only stop loading if we have a user but genuinely no space
            // (e.g., zero-spaces scenario). Don't stop if we're still
            // waiting for spaces to arrive.
            if (!authLoading && user && !currentSpace) setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const supabase = createClient();

            const { data, error } = await supabase.rpc('get_dashboard_summary', {
                p_space_id: currentSpace.id,
                p_user_id: user.id,
            });

            if (error) {
                logger.error('RPC get_dashboard_summary failed', error, {
                    component: 'useDashboardStats',
                    action: 'rpc_call',
                    errorCode: error.code,
                });
                setStats(initialStats);
                return;
            }
            if (!data) return;

            const d = data as Record<string, unknown>;
            const tasks = d.tasks as Record<string, number> || {};
            const chores = d.chores as Record<string, number> || {};
            const events = d.events as Record<string, number> || {};
            const reminders = d.reminders as Record<string, number> || {};
            const msgs = d.messages as Record<string, number> || {};
            const msgStats = d.messageStats as Record<string, number> || {};
            const shop = d.shopping as Record<string, unknown> || {};
            const shopItems = d.shoppingItems as Record<string, number> || {};
            const meals = d.meals as Record<string, number> || {};
            const budget = d.budget as Record<string, number> || {};
            const expenses = d.expenses as Record<string, number> || {};
            const projects = d.projects as Record<string, number> || {};
            const goals = d.goals as Record<string, number> || {};

            const recentTasks = (d.recentTasks as Array<{ id: string; title: string; due_date?: string; priority?: string }>) || [];
            const recentChores = (d.recentChores as Array<{ id: string; title: string; due_date?: string }>) || [];
            const nextEvent = d.nextEvent as { title: string; start_time: string } | null;
            const nextReminder = d.nextReminder as { title: string; reminder_time: string } | null;
            const lastMessage = d.lastMessage as { content: string; sender_id: string; created_at: string } | null;
            const nextMealData = d.nextMeal as { meal_type?: string; scheduled_date: string; name?: string } | null;
            const topGoal = d.topGoal as { title: string; progress: number } | null;

            // Combine tasks + chores
            const combinedTotal = (tasks.total || 0) + (chores.total || 0);
            const combinedCompleted = (tasks.completed || 0) + (chores.completed || 0);
            const combinedPending = (tasks.pending || 0) + (chores.pending || 0);
            const combinedRecentItems = [...recentTasks, ...recentChores.map(c => ({ ...c, priority: undefined }))]
                .sort((a, b) => {
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return a.due_date.localeCompare(b.due_date);
                })
                .slice(0, 3);

            const monthlyBudget = budget.monthlyBudget || 0;
            const spentThisMonth = expenses.spentThisMonth || 0;

            setStats({
                tasks: {
                    total: combinedTotal,
                    pending: combinedPending,
                    inProgress: tasks.inProgress || 0,
                    completed: combinedCompleted,
                    dueToday: (tasks.dueToday || 0) + (chores.dueToday || 0),
                    overdue: (tasks.overdue || 0) + (chores.overdue || 0),
                    highPriority: tasks.highPriority || 0,
                    assignedToMe: (tasks.assignedToMe || 0) + (chores.assignedToMe || 0),
                    completionRate: combinedTotal > 0 ? Math.round((combinedCompleted / combinedTotal) * 100) : 0,
                    trend: (tasks.trend || 0) + (chores.trend || 0),
                    recentTasks: combinedRecentItems,
                },
                events: {
                    total: events.total || 0,
                    today: events.today || 0,
                    thisWeek: events.thisWeek || 0,
                    upcoming: events.upcoming || 0,
                    personal: events.personal || 0,
                    shared: events.shared || 0,
                    nextEvent,
                    categories: {},
                    trend: events.trend || 0,
                },
                reminders: {
                    total: reminders.total || 0,
                    active: reminders.active || 0,
                    completed: reminders.completed || 0,
                    overdue: reminders.overdue || 0,
                    dueToday: reminders.dueToday || 0,
                    byCategory: {},
                    nextDue: nextReminder,
                    trend: reminders.trend || 0,
                },
                messages: {
                    total: msgs.total || 0,
                    unread: msgStats.unread || 0,
                    today: msgs.today || 0,
                    conversations: msgStats.conversations || 0,
                    lastMessage: lastMessage ? {
                        content: lastMessage.content,
                        sender: lastMessage.sender_id === user.id ? 'You' : 'Partner',
                        created_at: lastMessage.created_at,
                    } : null,
                    mostActive: 'Personal chat',
                    trend: msgs.trend || 0,
                },
                shopping: {
                    totalLists: (shop.totalLists as number) || 0,
                    activeLists: (shop.activeLists as number) || 0,
                    totalItems: shopItems.totalItems || 0,
                    checkedToday: shopItems.checkedToday || 0,
                    uncheckedItems: shopItems.uncheckedItems || 0,
                    urgentList: (shop.urgentList as string) || null,
                    estimatedBudget: 0,
                    trend: shopItems.checkedThisWeek || 0,
                },
                meals: {
                    thisWeek: meals.thisWeek || 0,
                    savedRecipes: (d.savedRecipes as number) || 0,
                    mealsToday: meals.mealsToday || 0,
                    missingIngredients: 0,
                    nextMeal: nextMealData ? {
                        title: nextMealData.name || nextMealData.meal_type || 'Meal',
                        scheduled_date: nextMealData.scheduled_date,
                        meal_type: nextMealData.meal_type,
                    } : null,
                    favoriteCategory: '',
                    shoppingListGenerated: false,
                    trend: meals.trend || 0,
                },
                household: {
                    totalChores: chores.total || 0,
                    completedThisWeek: chores.completedThisWeek || 0,
                    assignedToMe: chores.assignedToMe || 0,
                    assignedToPartner: chores.assignedToPartner || 0,
                    overdue: chores.overdue || 0,
                    monthlyBudget,
                    spent: spentThisMonth,
                    remaining: monthlyBudget - spentThisMonth,
                    pendingBills: budget.pendingBills || 0,
                    nextBill: null,
                    trend: chores.trend || 0,
                },
                projects: {
                    total: projects.total || 0,
                    planning: projects.planning || 0,
                    inProgress: projects.inProgress || 0,
                    completed: projects.completed || 0,
                    onHold: projects.onHold || 0,
                    totalBudget: projects.totalBudget || 0,
                    totalExpenses: projects.totalExpenses || 0,
                    trend: projects.trend || 0,
                },
                goals: {
                    total: goals.total || 0,
                    active: goals.active || 0,
                    completed: goals.completed || 0,
                    inProgress: goals.active || 0,
                    milestonesReached: 0,
                    totalMilestones: 0,
                    overallProgress: goals.overallProgress || 0,
                    topGoal,
                    endingThisMonth: 0,
                    trend: goals.trend || 0,
                },
            });
        } catch (error) {
            logger.error('Failed to load dashboard stats:', error, { component: 'useDashboardStats', action: 'execution' });
        } finally {
            setLoading(false);
        }
    }, [currentSpace, user, authLoading]);

    // Stable ref for loadAllStats so the debounced function always calls the latest version
    const loadAllStatsRef = useRef(loadAllStats);
    loadAllStatsRef.current = loadAllStats;

    // Debounced reload: coalesces rapid real-time events (9 channels) into one call
    const debouncedReload = useRef(
        debounce(() => loadAllStatsRef.current(), 500)
    );

    // Real-time subscriptions
    useEffect(() => {
        loadAllStats();

        const supabase = createClient();
        const channels: RealtimeChannel[] = [];

        if (currentSpace) {
            const spaceId = currentSpace.id;

            const tasksChannel = supabase
                .channel(`dashboard_tasks:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `space_id=eq.${spaceId}`,
                }, () => { debouncedReload.current(); })
                .subscribe();
            channels.push(tasksChannel);

            const eventsChannel = supabase
                .channel(`dashboard_events:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'calendar_events',
                    filter: `space_id=eq.${spaceId}`,
                }, () => { debouncedReload.current(); })
                .subscribe();
            channels.push(eventsChannel);

            const remindersChannel = supabase
                .channel(`dashboard_reminders:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'reminders',
                    filter: `space_id=eq.${spaceId}`,
                }, () => { debouncedReload.current(); })
                .subscribe();
            channels.push(remindersChannel);

            const messagesChannel = supabase
                .channel(`dashboard_messages:${spaceId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `space_id=eq.${spaceId}`,
                }, () => { debouncedReload.current(); })
                .subscribe();
            channels.push(messagesChannel);

            // Listen to shopping_lists (has space_id) for list-level changes
            const shoppingListsChannel = supabase
                .channel(`dashboard_shopping_lists:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'shopping_lists',
                    filter: `space_id=eq.${spaceId}`,
                }, () => { debouncedReload.current(); })
                .subscribe();
            channels.push(shoppingListsChannel);

            // Listen to shopping_items for item-level changes
            // Note: shopping_items doesn't have space_id directly, RLS handles security
            const shoppingItemsChannel = supabase
                .channel(`dashboard_shopping_items:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'shopping_items',
                }, () => { debouncedReload.current(); })
                .subscribe();
            channels.push(shoppingItemsChannel);

            // Meals — auto-update when AI or user creates/modifies meals
            const mealsChannel = supabase
                .channel(`dashboard_meals:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'meals',
                    filter: `space_id=eq.${spaceId}`,
                }, () => { debouncedReload.current(); })
                .subscribe();
            channels.push(mealsChannel);

            // Goals — auto-update when AI or user creates/modifies goals
            const goalsChannel = supabase
                .channel(`dashboard_goals:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'goals',
                    filter: `space_id=eq.${spaceId}`,
                }, () => { debouncedReload.current(); })
                .subscribe();
            channels.push(goalsChannel);

            // Chores — auto-update when chores change
            const choresChannel = supabase
                .channel(`dashboard_chores:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'chores',
                    filter: `space_id=eq.${spaceId}`,
                }, () => { debouncedReload.current(); })
                .subscribe();
            channels.push(choresChannel);
        }

        return () => {
            channels.forEach(channel => {
                supabase.removeChannel(channel);
            });
        };
    // loadAllStats intentionally excluded — it's called directly and its deps
    // (user, authLoading) are already listed. Including the callback ref causes
    // Strict Mode double-renders to race setLoading(true) vs setLoading(false).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSpace, user, authLoading]);

    return { stats, loading, refreshStats: loadAllStats };
}
