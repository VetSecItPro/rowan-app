import { useState, useCallback, useEffect } from 'react';
import { tasksService } from '@/lib/services/tasks-service';
import { calendarService } from '@/lib/services/calendar-service';
import { remindersService } from '@/lib/services/reminders-service';
import { messagesService } from '@/lib/services/messages-service';
import { shoppingService } from '@/lib/services/shopping-service';
import { mealsService } from '@/lib/services/meals-service';
import { choresService } from '@/lib/services/chores-service';
import { projectsService } from '@/lib/services/budgets-service';
import { projectsOnlyService } from '@/lib/services/projects-service';
import { goalsService } from '@/lib/services/goals-service';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { User } from '@/lib/types';
import { Space } from '@/lib/contexts/spaces-context';
import { format, isToday, isThisWeek, isPast, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { getCurrentDateString } from '@/lib/utils/date-utils';

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

export function useDashboardStats(user: User | null, currentSpace: Space | null, authLoading: boolean) {
    const [stats, setStats] = useState<EnhancedDashboardStats>(initialStats);
    const [loading, setLoading] = useState(true);

    const loadAllStats = useCallback(async () => {
        // Don't load data if user doesn't have a space yet OR if auth is still loading
        if (!currentSpace || !user || authLoading) {
            if (!authLoading) setLoading(false);
            return;
        }

        try {
            // Keep loading true while fetching
            // setLoading(true); // Commented out to prevent flickering on reloads

            // Fetch all data concurrently
            const [
                allTasks,
                taskStats,
                allEvents,
                eventStats,
                allReminders,
                reminderStats,
                allMessages,
                messageStats,
                shoppingLists,
                shoppingStats,
                meals,
                recipes,
                mealStats,
                allChores,
                choreStats,
                budgetStats,
                allProjects,
                projectStats,
                allGoals,
                goalStats,
            ] = await Promise.all([
                tasksService.getTasks(currentSpace.id),
                tasksService.getTaskStats(currentSpace.id),
                calendarService.getEvents(currentSpace.id),
                calendarService.getEventStats(currentSpace.id),
                remindersService.getReminders(currentSpace.id),
                remindersService.getReminderStats(currentSpace.id),
                messagesService.getMessages(currentSpace.id),
                messagesService.getMessageStats(currentSpace.id),
                shoppingService.getLists(currentSpace.id),
                shoppingService.getShoppingStats(currentSpace.id),
                mealsService.getMeals(currentSpace.id),
                mealsService.getRecipes(currentSpace.id),
                mealsService.getMealStats(currentSpace.id),
                choresService.getChores(currentSpace.id),
                choresService.getChoreStats(currentSpace.id, user.id),
                projectsService.getBudgetStats(currentSpace.id),
                projectsOnlyService.getProjects(currentSpace.id),
                projectsOnlyService.getProjectStats(currentSpace.id),
                goalsService.getGoals(currentSpace.id),
                goalsService.getGoalStats(currentSpace.id),
            ]);

            const now = new Date();
            const today = getCurrentDateString();
            const weekAgo = subWeeks(now, 1);
            const weekStart = startOfWeek(now);

            // Calculate detailed task stats
            const tasksDueToday = allTasks.filter(t => t.due_date === today && t.status !== 'completed').length;
            const tasksOverdue = allTasks.filter(t =>
                t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && t.status !== 'completed'
            ).length;
            // Trend: Tasks completed this week
            const taskTrend = allTasks.filter(t =>
                t.status === 'completed' && t.updated_at && parseISO(t.updated_at) >= weekStart
            ).length;
            const recentTasks = allTasks
                .filter(t => t.status !== 'completed')
                .sort((a, b) => {
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
                })
                .slice(0, 3)
                .map(t => ({ id: t.id, title: t.title, due_date: t.due_date, priority: t.priority }));

            // Calculate detailed chore stats (similar to tasks)
            const choresDueToday = allChores.filter(c => c.due_date === today && c.status !== 'completed').length;
            const choresOverdueCount = allChores.filter(c =>
                c.due_date && isPast(parseISO(c.due_date)) && !isToday(parseISO(c.due_date)) && c.status !== 'completed'
            ).length;
            // Trend: Chores completed this week
            const choreTrend = allChores.filter(c =>
                c.status === 'completed' && c.updated_at && parseISO(c.updated_at) >= weekStart
            ).length;
            const recentChores = allChores
                .filter(c => c.status !== 'completed')
                .sort((a, b) => {
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
                })
                .slice(0, 3)
                .map(c => ({ id: c.id, title: c.title, due_date: c.due_date, priority: undefined }));

            // Calculate detailed event stats
            const eventsToday = allEvents.filter(e => isToday(parseISO(e.start_time))).length;
            const eventsThisWeek = allEvents.filter(e => isThisWeek(parseISO(e.start_time))).length;
            const upcomingEvents = allEvents.filter(e => parseISO(e.start_time) > now).length;
            const personalEvents = allEvents.filter(e => e.category === 'personal').length;
            const nextEvent = allEvents
                .filter(e => parseISO(e.start_time) > now)
                .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())[0];
            // Trend: Events that occurred this week
            const eventTrend = allEvents.filter(e => {
                const startTime = parseISO(e.start_time);
                return startTime >= weekStart && startTime <= now;
            }).length;

            // Calculate detailed reminder stats
            const activeReminders = allReminders.filter(r => r.status === 'active').length;
            const completedReminders = allReminders.filter(r => r.status === 'completed').length;
            const overdueReminders = allReminders.filter(r =>
                r.reminder_time && isPast(parseISO(r.reminder_time)) && r.status === 'active'
            ).length;
            const remindersDueToday = allReminders.filter(r =>
                r.reminder_time && isToday(parseISO(r.reminder_time)) && r.status === 'active'
            ).length;
            const remindersByCategory = allReminders.reduce((acc, r) => {
                const category = r.category || 'personal';
                acc[category] = (acc[category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            const nextDueReminder = allReminders
                .filter(r => r.reminder_time && parseISO(r.reminder_time) > now && r.status === 'active')
                .sort((a, b) => parseISO(a.reminder_time!).getTime() - parseISO(b.reminder_time!).getTime())[0];
            // Trend: Reminders completed this week
            const reminderTrend = allReminders.filter(r =>
                r.status === 'completed' && r.updated_at && parseISO(r.updated_at) >= weekStart
            ).length;

            // Calculate detailed message stats
            const messagesToday = allMessages.filter(m => isToday(parseISO(m.created_at))).length;
            const lastMessage = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;
            // Trend: Messages sent this week (keep as is - this makes sense)
            const messageTrend = allMessages.filter(m => parseISO(m.created_at) >= weekStart).length;

            // Calculate detailed shopping stats
            let totalItems = 0;
            let checkedToday = 0;
            let uncheckedItems = 0;
            let checkedThisWeek = 0;
            for (const list of shoppingLists) {
                const items = list.items || [];
                totalItems += items.length;
                uncheckedItems += items.filter(i => !i.checked).length;
                checkedToday += items.filter(i =>
                    i.checked && i.updated_at && isToday(parseISO(i.updated_at))
                ).length;
                checkedThisWeek += items.filter(i =>
                    i.checked && i.updated_at && parseISO(i.updated_at) >= weekStart
                ).length;
            }
            const activeLists = shoppingLists.filter(l => l.status === 'active').length;
            // Trend: Items checked off this week
            const shoppingTrend = checkedThisWeek;

            // Calculate detailed meal stats
            const mealsToday = meals.filter(m => m.scheduled_date && isToday(parseISO(m.scheduled_date))).length;
            const nextMeal = meals
                .filter(m => m.scheduled_date && parseISO(m.scheduled_date) > now)
                .sort((a, b) => parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime())[0];
            // Trend: Meals completed this week (meals with past scheduled dates)
            const mealTrend = meals.filter(m =>
                m.scheduled_date && parseISO(m.scheduled_date) >= weekStart && parseISO(m.scheduled_date) <= now
            ).length;

            // Calculate detailed household stats
            const choresAssignedToMe = allChores.filter(c => c.assigned_to === user.id).length;
            const choresAssignedToPartner = allChores.filter(c => c.assigned_to && c.assigned_to !== user.id).length;
            const choresOverdue = allChores.filter(c =>
                c.due_date && isPast(parseISO(c.due_date)) && c.status !== 'completed'
            ).length;
            // Trend: Chores completed this week
            const householdTrend = allChores.filter(c =>
                c.status === 'completed' && c.updated_at && parseISO(c.updated_at) >= weekStart
            ).length;

            // Calculate detailed project stats
            const allExpenses = await projectsService.getExpenses(currentSpace.id);
            const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
            // Trend: Projects completed this week
            const projectTrend = allProjects.filter(p =>
                p.status === 'completed' && p.updated_at && parseISO(p.updated_at) >= weekStart
            ).length;

            // Calculate detailed goal stats
            const activeGoals = allGoals.filter(g => g.status === 'active').length;
            const completedGoals = allGoals.filter(g => g.status === 'completed').length;
            const inProgressGoals = allGoals.filter(g => g.status === 'active').length; // 'active' goals are in progress
            const topGoal = allGoals.length > 0
                ? { title: allGoals[0].title, progress: allGoals[0].progress || 0 }
                : null;
            // Trend: Goals completed this week
            const goalTrend = allGoals.filter(g =>
                g.status === 'completed' && g.updated_at && parseISO(g.updated_at) >= weekStart
            ).length;

            // Combine tasks and chores stats with proper null checks
            const choresCompleted = allChores.filter(c => c.status === 'completed').length;
            const choresPending = allChores.filter(c => c.status === 'pending').length;
            const combinedTotal = (taskStats?.total || 0) + (choreStats?.total || 0);
            const combinedCompleted = (taskStats?.completed || 0) + choresCompleted;
            const combinedPending = (taskStats?.pending || 0) + choresPending;
            const combinedRecentItems = [...recentTasks, ...recentChores]
                .sort((a, b) => {
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
                })
                .slice(0, 3);

            setStats({
                tasks: {
                    total: combinedTotal,
                    pending: combinedPending,
                    inProgress: taskStats?.inProgress || 0, // Only tasks have "in progress" status
                    completed: combinedCompleted,
                    dueToday: tasksDueToday + choresDueToday,
                    overdue: tasksOverdue + choresOverdueCount,
                    highPriority: (taskStats?.byPriority?.high || 0) + (taskStats?.byPriority?.urgent || 0),
                    assignedToMe: allTasks.filter(t => t.assigned_to === user.id).length + allChores.filter(c => c.assigned_to === user.id).length,
                    completionRate: combinedTotal > 0 ? Math.round((combinedCompleted / combinedTotal) * 100) : 0,
                    trend: taskTrend + choreTrend,
                    recentTasks: combinedRecentItems,
                },
                events: {
                    total: eventStats.total,
                    today: eventsToday,
                    thisWeek: eventsThisWeek,
                    upcoming: upcomingEvents,
                    personal: personalEvents,
                    shared: allEvents.length - personalEvents,
                    nextEvent: nextEvent ? { title: nextEvent.title, start_time: nextEvent.start_time } : null,
                    categories: {},
                    trend: eventTrend,
                },
                reminders: {
                    total: reminderStats.total,
                    active: activeReminders,
                    completed: completedReminders,
                    overdue: overdueReminders,
                    dueToday: remindersDueToday,
                    byCategory: remindersByCategory,
                    nextDue: nextDueReminder ? { title: nextDueReminder.title, reminder_time: nextDueReminder.reminder_time! } : null,
                    trend: reminderTrend,
                },
                messages: {
                    total: messageStats.total,
                    unread: messageStats.unread,
                    today: messagesToday,
                    conversations: messageStats.conversations,
                    lastMessage: lastMessage ? {
                        content: lastMessage.content,
                        sender: lastMessage.sender_id === user.id ? 'You' : 'Partner',
                        created_at: lastMessage.created_at,
                    } : null,
                    mostActive: 'Personal chat',
                    trend: messageTrend,
                },
                shopping: {
                    totalLists: shoppingStats.totalLists,
                    activeLists,
                    totalItems,
                    checkedToday,
                    uncheckedItems,
                    urgentList: shoppingLists.length > 0 ? shoppingLists[0].title : null,
                    estimatedBudget: 0,
                    trend: shoppingTrend,
                },
                meals: {
                    thisWeek: mealStats.thisWeek,
                    savedRecipes: mealStats.savedRecipes,
                    mealsToday,
                    missingIngredients: 0,
                    nextMeal: nextMeal ? { title: nextMeal.recipe?.name || nextMeal.meal_type || 'Meal', scheduled_date: nextMeal.scheduled_date, meal_type: nextMeal.meal_type } : null,
                    favoriteCategory: 'Pasta',
                    shoppingListGenerated: false,
                    trend: mealTrend,
                },
                household: {
                    totalChores: choreStats.total,
                    completedThisWeek: choreStats.completedThisWeek,
                    assignedToMe: choresAssignedToMe,
                    assignedToPartner: choresAssignedToPartner,
                    overdue: choresOverdue,
                    monthlyBudget: budgetStats.monthlyBudget,
                    spent: budgetStats.spentThisMonth,
                    remaining: budgetStats.remaining,
                    pendingBills: budgetStats.pendingBills,
                    nextBill: null,
                    trend: householdTrend,
                },
                projects: {
                    total: projectStats.total,
                    planning: projectStats.planning,
                    inProgress: projectStats.inProgress,
                    completed: projectStats.completed,
                    onHold: projectStats.onHold,
                    totalBudget: projectStats.totalBudget,
                    totalExpenses,
                    trend: projectTrend,
                },
                goals: {
                    total: allGoals.length,
                    active: activeGoals,
                    completed: completedGoals,
                    inProgress: inProgressGoals,
                    milestonesReached: 0,
                    totalMilestones: 0,
                    overallProgress: allGoals.length > 0
                        ? Math.round(allGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / allGoals.length)
                        : 0,
                    topGoal,
                    endingThisMonth: 0,
                    trend: goalTrend,
                },
            });
        } catch (error) {
            logger.error('Failed to load dashboard stats:', error, { component: 'useDashboardStats', action: 'execution' });
        } finally {
            setLoading(false);
        }
    }, [currentSpace, user, authLoading]);

    // Real-time subscriptions
    useEffect(() => {
        loadAllStats();

        const supabase = createClient();
        const channels: any[] = [];

        // Only subscribe if we have a space
        // Channel names include space_id to ensure proper isolation when switching spaces
        if (currentSpace) {
            const spaceId = currentSpace.id;

            // Tasks subscription
            const tasksChannel = supabase
                .channel(`dashboard_tasks:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `space_id=eq.${spaceId}`,
                }, () => {
                    loadAllStats(); // Reload stats on any task change
                })
                .subscribe();
            channels.push(tasksChannel);

            // Events subscription
            const eventsChannel = supabase
                .channel(`dashboard_events:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'calendar_events',
                    filter: `space_id=eq.${spaceId}`,
                }, () => {
                    loadAllStats();
                })
                .subscribe();
            channels.push(eventsChannel);

            // Reminders subscription
            const remindersChannel = supabase
                .channel(`dashboard_reminders:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'reminders',
                    filter: `space_id=eq.${spaceId}`,
                }, () => {
                    loadAllStats();
                })
                .subscribe();
            channels.push(remindersChannel);

            // Messages subscription (optional - might be too frequent)
            const messagesChannel = supabase
                .channel(`dashboard_messages:${spaceId}`)
                .on('postgres_changes', {
                    event: 'INSERT', // Only listen for new messages
                    schema: 'public',
                    table: 'messages',
                    filter: `space_id=eq.${spaceId}`,
                }, () => {
                    loadAllStats();
                })
                .subscribe();
            channels.push(messagesChannel);

            // Shopping items subscription
            const shoppingChannel = supabase
                .channel(`dashboard_shopping:${spaceId}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'shopping_items',
                    // No direct space_id on items usually, but let's assume filtering works or we listen globally for the user's lists
                    // Ideally: filter: `list_id=in.(${shoppingListIds})` but that's complex.
                    // For now, simpler refresh triggers or just time-based.
                }, () => {
                    loadAllStats();
                })
                .subscribe();
            channels.push(shoppingChannel);
        }

        return () => {
            // Clean up subscriptions
            channels.forEach(channel => {
                supabase.removeChannel(channel);
            });
        };
    }, [currentSpace, loadAllStats]);

    return { stats, loading, refreshStats: loadAllStats };
}
