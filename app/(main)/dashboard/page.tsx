'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
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
import { checkInsService, type DailyCheckIn, type CheckInStats } from '@/lib/services/checkins-service';
import { reactionsService, type CheckInReaction } from '@/lib/services/reactions-service';
import { WeeklyInsights } from '@/components/checkins/WeeklyInsights';
import { CheckInSuccess } from '@/components/checkins/CheckInSuccess';
import { Tooltip } from '@/components/shared/Tooltip';
import { createClient } from '@/lib/supabase/client';
import {
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Home,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Hand,
  Sparkles,
  Activity,
  Heart,
  ArrowRight,
  Plus,
  Filter,
  ChevronRight,
  Zap,
  Users,
  DollarSign,
  List,
  ChevronLeft
} from 'lucide-react';
import { SpaceSelector } from '@/components/spaces/SpaceSelector';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { InvitePartnerModal } from '@/components/spaces/InvitePartnerModal';
import { TimeAwareWelcomeBox } from '@/components/ui/TimeAwareWelcomeBox';
import { CTAButton } from '@/components/ui/EnhancedButton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isToday, isThisWeek, isPast, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { formatDate, formatTimestamp, getCurrentDateString } from '@/lib/utils/date-utils';

// Enhanced stats interface with detailed metrics
interface EnhancedDashboardStats {
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
    trend: number; // compared to last week
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

// Progress Bar Component - Memoized
const ProgressBar = memo(function ProgressBar({ value, max, color = 'blue', showLabel = true }: { value: number; max: number; color?: string; showLabel?: boolean }) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    teal: 'bg-teal-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${colorClasses[color as keyof typeof colorClasses]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{percentage}% complete</p>
      )}
    </div>
  );
});

// Trend Indicator Component - Memoized
const TrendIndicator = memo(function TrendIndicator({ value, label }: { value: number; label: string }) {
  if (value === 0) return null;

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className={`flex items-center gap-1 text-xs ${colorClass} font-medium`}>
      <Icon className="w-3 h-3" />
      <span>{Math.abs(value)} {label}</span>
    </div>
  );
});

export default function DashboardPage() {
  const router = useRouter();
  const { user, spaces, currentSpace, loading: authLoading, switchSpace, refreshSpaces } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [stats, setStats] = useState<EnhancedDashboardStats>({
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
  });
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [checkInNote, setCheckInNote] = useState('');
  const [checkInHighlights, setCheckInHighlights] = useState('');
  const [checkInChallenges, setCheckInChallenges] = useState('');
  const [checkInGratitude, setCheckInGratitude] = useState('');
  const [recentCheckIns, setRecentCheckIns] = useState<DailyCheckIn[]>([]);
  const [checkInStats, setCheckInStats] = useState<CheckInStats | null>(null);
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn | null>(null);
  const [checkInSaving, setCheckInSaving] = useState(false);
  const [checkInExpanded, setCheckInExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'checkin' | 'journal'>('checkin');
  const [journalView, setJournalView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [checkInReactions, setCheckInReactions] = useState<Record<string, CheckInReaction[]>>({});
  const [partnerReactionLoading, setPartnerReactionLoading] = useState(false);
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false);
  const [lastCheckInMood, setLastCheckInMood] = useState<string>('');

  // Auth protection - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load all comprehensive stats - Memoized with useCallback
  const loadAllStats = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

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
        acc[r.category] = (acc[r.category] || 0) + 1;
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
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  // Real-time subscriptions
  useEffect(() => {
    loadAllStats();

    const supabase = createClient();
    const channels: any[] = [];

    // Only subscribe if we have a space
    if (currentSpace) {
      // Tasks subscription
      const tasksChannel = supabase
        .channel('dashboard_tasks')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats(); // Reload stats on any task change
        })
        .subscribe();
      channels.push(tasksChannel);

      // Events subscription
      const eventsChannel = supabase
        .channel('dashboard_events')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats();
        })
        .subscribe();
      channels.push(eventsChannel);

      // Reminders subscription
      const remindersChannel = supabase
        .channel('dashboard_reminders')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats();
        })
        .subscribe();
      channels.push(remindersChannel);

      // Messages subscription
      const messagesChannel = supabase
        .channel('dashboard_messages')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats();
        })
        .subscribe();
      channels.push(messagesChannel);

      // Shopping subscription
      const shoppingChannel = supabase
        .channel('dashboard_shopping')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'shopping_lists',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats();
        })
        .subscribe();
      channels.push(shoppingChannel);

      // Meals subscription
      const mealsChannel = supabase
        .channel('dashboard_meals')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'meal_plans',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats();
        })
        .subscribe();
      channels.push(mealsChannel);

      // Chores subscription
      const choresChannel = supabase
        .channel('dashboard_chores')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'household_chores',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats();
        })
        .subscribe();
      channels.push(choresChannel);

      // Goals subscription
      const goalsChannel = supabase
        .channel('dashboard_goals')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats();
        })
        .subscribe();
      channels.push(goalsChannel);

      // Projects subscription
      const projectsChannel = supabase
        .channel('dashboard_projects')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats();
        })
        .subscribe();
      channels.push(projectsChannel);

      // Expenses subscription
      const expensesChannel = supabase
        .channel('dashboard_expenses')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `space_id=eq.${currentSpace.id}`,
        }, () => {
          loadAllStats();
        })
        .subscribe();
      channels.push(expensesChannel);
    }

    // Cleanup subscriptions
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [currentSpace, loadAllStats]);

  // Load check-ins data and subscribe to updates
  useEffect(() => {
    if (!currentSpace || !user) return;

    const supabase = createClient();

    const loadCheckIns = async () => {
      try {
        // Load recent check-ins for the space (last 7 days)
        const recent = await checkInsService.getCheckIns(currentSpace.id, 7);
        setRecentCheckIns(recent);

        // Load current user's stats
        const stats = await checkInsService.getCheckInStats(currentSpace.id, user.id);
        setCheckInStats(stats);

        // Load today's check-in if exists
        const today = await checkInsService.getTodayCheckIn(currentSpace.id, user.id);
        setTodayCheckIn(today);

        // Load reactions for all check-ins
        const reactionsMap: Record<string, CheckInReaction[]> = {};
        await Promise.all(
          recent.map(async (checkIn) => {
            try {
              const reactions = await reactionsService.getReactionsForCheckIn(checkIn.id);
              reactionsMap[checkIn.id] = reactions;
            } catch (error) {
              console.error(`Failed to load reactions for check-in ${checkIn.id}:`, error);
              reactionsMap[checkIn.id] = [];
            }
          })
        );
        setCheckInReactions(reactionsMap);

        // Pre-populate form if user already checked in today
        if (today) {
          setSelectedMood(today.mood);
          setCheckInNote(today.note || '');
          setCheckInHighlights(today.highlights || '');
          setCheckInChallenges(today.challenges || '');
          setCheckInGratitude(today.gratitude || '');
          setCheckInExpanded(true);
        }
      } catch (error) {
        console.error('Failed to load check-ins:', error);
      }
    };

    loadCheckIns();

    // Subscribe to real-time check-in updates
    const channel = checkInsService.subscribeToCheckIns(currentSpace.id, () => {
      loadCheckIns();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSpace, user]);

  // Mood options - Memoized
  const moodOptions = useMemo(() => [
    { emoji: '😊', label: 'Great', value: 'great' },
    { emoji: '🙂', label: 'Good', value: 'good' },
    { emoji: '😐', label: 'Okay', value: 'okay' },
    { emoji: '😔', label: 'Meh', value: 'meh' },
    { emoji: '😫', label: 'Rough', value: 'rough' },
  ], []);

  // Handle mood selection with smart expansion
  const handleMoodSelect = useCallback((mood: string) => {
    setSelectedMood(mood);
    // Expand UI to show conditional prompts
    setCheckInExpanded(true);
  }, []);

  // Stable callback with useCallback
  const handleCheckIn = useCallback(async () => {
    if (!selectedMood || !user || !currentSpace) return;

    setCheckInSaving(true);
    try {
      const checkIn = await checkInsService.createCheckIn(user.id, {
        space_id: currentSpace.id,
        mood: selectedMood,
        note: checkInNote || undefined,
        highlights: checkInHighlights || undefined,
        challenges: checkInChallenges || undefined,
        gratitude: checkInGratitude || undefined,
      });

      setTodayCheckIn(checkIn);

      // Store mood for success modal before clearing
      setLastCheckInMood(selectedMood);

      setSelectedMood(null);
      setCheckInNote('');
      setCheckInHighlights('');
      setCheckInChallenges('');
      setCheckInGratitude('');
      setCheckInExpanded(false);

      // Reload stats
      const stats = await checkInsService.getCheckInStats(currentSpace.id, user.id);
      setCheckInStats(stats);

      // Reload recent check-ins
      const recent = await checkInsService.getCheckIns(currentSpace.id, 7);
      setRecentCheckIns(recent);

      // Show success modal
      setShowCheckInSuccess(true);
    } catch (error) {
      console.error('Failed to create check-in:', error);
    } finally {
      setCheckInSaving(false);
    }
  }, [selectedMood, checkInNote, checkInHighlights, checkInChallenges, checkInGratitude, user, currentSpace]);

  // Handle sending a reaction to partner's check-in
  const handleSendReaction = useCallback(async (
    checkinId: string,
    reactionType: 'heart' | 'hug' | 'strength'
  ) => {
    if (!user) return;

    setPartnerReactionLoading(true);
    try {
      const reaction = await reactionsService.createReaction(user.id, {
        checkin_id: checkinId,
        reaction_type: reactionType,
      });

      // Update local state
      setCheckInReactions((prev) => ({
        ...prev,
        [checkinId]: [reaction],
      }));
    } catch (error) {
      console.error('Failed to send reaction:', error);
    } finally {
      setPartnerReactionLoading(false);
    }
  }, [user]);

  // Greeting function - Memoized
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Memoize current date string
  const currentDate = useMemo(() => formatDate(getCurrentDateString(), 'EEEE, MMMM d, yyyy'), []);

  // Show loading state while checking authentication
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-purple-100/30 to-purple-200 dark:from-black dark:via-purple-900/30 dark:to-purple-900">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PageErrorBoundary
      pageName="Dashboard"
      pageDescription="your main dashboard with tasks, stats, and check-ins"
    >
      <FeatureLayout
        breadcrumbItems={[{ label: 'Dashboard' }]}
        backgroundVariant="vibrant"
        enableTimeAware={true}
      >
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
          {/* Enhanced Time-Aware Welcome Header */}
          <TimeAwareWelcomeBox
            greetingText={greetingText}
            userName={user?.name}
            currentDate={currentDate}
          >
            {!currentSpace && (
              <CTAButton
                onClick={() => setShowCreateSpaceModal(true)}
                feature="dashboard"
                animationLevel="premium"
                icon={<Plus className="w-4 h-4" />}
                size="md"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                Create Your Space
              </CTAButton>
            )}
          </TimeAwareWelcomeBox>

          {/* Enhanced Feature Cards - 8 Cards */}
          <div>

            {loading ? (
              <div className="stats-grid-mobile gap-4 sm:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/20 dark:border-gray-700/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg animate-pulse">
                    <div className="h-28 sm:h-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="stats-grid-mobile gap-4 sm:gap-6">
                {/* Tasks & Chores Card */}
                <Link
                  href="/tasks"
                  className="group bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border-2 border-white/20 dark:border-gray-700/20 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">Tasks & Chores</h3>
                        {stats.tasks.trend !== 0 && <TrendIndicator value={stats.tasks.trend} label="this week" />}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {stats.tasks.pending}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">pending</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                      <CheckSquare className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{stats.tasks.pending} pending</span>
                      <span className="text-gray-600 dark:text-gray-400">{stats.tasks.inProgress} in progress</span>
                    </div>
                    {stats.tasks.dueToday > 0 && (
                      <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {stats.tasks.dueToday} due today
                      </p>
                    )}
                    {stats.tasks.overdue > 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {stats.tasks.overdue} overdue
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.tasks.highPriority} high priority • {stats.tasks.assignedToMe} assigned to you
                    </p>
                  </div>

                  <ProgressBar value={stats.tasks.completed} max={stats.tasks.total} color="blue" />

                  {stats.tasks.recentTasks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Recent:</p>
                      {stats.tasks.recentTasks.slice(0, 2).map(task => (
                        <p key={task.id} className="text-xs text-gray-700 dark:text-gray-300 truncate">
                          • {task.title}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-end text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>

                {/* Calendar Card */}
                <Link
                  href="/calendar"
                  className="group bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border-2 border-white/20 dark:border-gray-700/20 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(168,85,247,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400">Calendar</h3>
                        {stats.events.trend !== 0 && <TrendIndicator value={stats.events.trend} label="this week" />}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {stats.events.upcoming}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">upcoming</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                      <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{stats.events.today} today</span>
                      <span className="text-gray-600 dark:text-gray-400">{stats.events.thisWeek} this week</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.events.personal} personal • {stats.events.shared} shared
                    </p>
                  </div>

                  {stats.events.nextEvent && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-3">
                      <p className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-1">Next event:</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                        {stats.events.nextEvent.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTimestamp(stats.events.nextEvent.start_time, 'MMM d, h:mm a')}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-end text-purple-600 dark:text-purple-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>

                {/* Reminders Card */}
                <Link
                  href="/reminders"
                  className="group bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border-2 border-white/20 dark:border-gray-700/20 hover:border-pink-500 dark:hover:border-pink-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(236,72,153,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-pink-600 dark:text-pink-400">Reminders</h3>
                        {stats.reminders.trend !== 0 && <TrendIndicator value={stats.reminders.trend} label="this week" />}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {stats.reminders.active}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">active</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                      <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {stats.reminders.overdue > 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {stats.reminders.overdue} overdue
                      </p>
                    )}
                    {stats.reminders.dueToday > 0 && (
                      <p className="text-sm text-pink-600 dark:text-pink-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {stats.reminders.dueToday} due today
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.reminders.completed} completed • {stats.reminders.total} total
                    </p>
                  </div>

                  {stats.reminders.nextDue && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-3">
                      <p className="text-xs text-orange-700 dark:text-orange-300 font-medium mb-1">Next due:</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                        {stats.reminders.nextDue.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTimestamp(stats.reminders.nextDue.reminder_time, 'MMM d, h:mm a')}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-end text-orange-600 dark:text-orange-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>

                {/* Messages Card */}
                <Link
                  href="/messages"
                  className="group bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border-2 border-white/20 dark:border-gray-700/20 hover:border-green-500 dark:hover:border-green-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(34,197,94,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">Messages</h3>
                        {stats.messages.trend !== 0 && <TrendIndicator value={stats.messages.trend} label="this week" />}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {stats.messages.total}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">total</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                      <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{stats.messages.today} today</span>
                      <span className="text-gray-600 dark:text-gray-400">{stats.messages.conversations} conversations</span>
                    </div>
                    {stats.messages.unread > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {stats.messages.unread} unread
                      </p>
                    )}
                  </div>

                  {stats.messages.lastMessage && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3">
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                        {stats.messages.lastMessage.sender}:
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        "{stats.messages.lastMessage.content}"
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {formatTimestamp(stats.messages.lastMessage.created_at, 'h:mm a')}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-end text-green-600 dark:text-green-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>

                {/* Shopping Card */}
                <Link
                  href="/shopping"
                  className="group bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border-2 border-white/20 dark:border-gray-700/20 hover:border-teal-500 dark:hover:border-teal-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(20,184,166,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-teal-600 dark:text-teal-400">Shopping</h3>
                        {stats.shopping.trend !== 0 && <TrendIndicator value={stats.shopping.trend} label="this week" />}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {stats.shopping.uncheckedItems}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">remaining</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                      <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{stats.shopping.totalLists} lists</span>
                      <span className="text-gray-600 dark:text-gray-400">{stats.shopping.activeLists} active</span>
                    </div>
                    <p className="text-sm text-teal-600 dark:text-teal-400 flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      {stats.shopping.checkedToday} checked today
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.shopping.uncheckedItems} items remaining
                    </p>
                  </div>

                  {stats.shopping.urgentList && (
                    <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg mb-3">
                      <p className="text-xs text-teal-700 dark:text-teal-300 font-medium mb-1">Urgent:</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                        {stats.shopping.uncheckedItems} items for "{stats.shopping.urgentList}"
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-end text-teal-600 dark:text-teal-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>

                {/* Meals Card */}
                <Link
                  href="/meals"
                  className="group bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border-2 border-white/20 dark:border-gray-700/20 hover:border-orange-500 dark:hover:border-orange-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(239,68,68,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">Meals</h3>
                        {stats.meals.trend !== 0 && <TrendIndicator value={stats.meals.trend} label="this week" />}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {stats.meals.thisWeek}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">this week</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                      <UtensilsCrossed className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{stats.meals.mealsToday} today</span>
                      <span className="text-gray-600 dark:text-gray-400">{stats.meals.thisWeek} this week</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.meals.savedRecipes} saved recipes
                    </p>
                  </div>

                  {stats.meals.nextMeal && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-3">
                      <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-1">Next meal:</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                        {stats.meals.nextMeal.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTimestamp(stats.meals.nextMeal.scheduled_date, 'MMM d, h:mm a')}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-end text-red-600 dark:text-red-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>

                {/* Projects & Budget Card */}
                <Link
                  href="/projects"
                  className="group bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border-2 border-white/20 dark:border-gray-700/20 hover:border-yellow-500 dark:hover:border-yellow-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(234,179,8,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">Projects & Budget</h3>
                        {stats.projects.trend !== 0 && <TrendIndicator value={stats.projects.trend} label="this week" />}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {stats.projects.inProgress}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">active</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                      <Home className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{stats.projects.inProgress} in progress</span>
                      <span className="text-gray-600 dark:text-gray-400">{stats.projects.completed} completed</span>
                    </div>
                    {(stats.projects.planning > 0 || stats.projects.onHold > 0) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {stats.projects.planning} planning • {stats.projects.onHold} on hold
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Monthly Budget:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900 dark:text-white font-bold">
                        ${stats.household.spent.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        / ${stats.household.monthlyBudget.toLocaleString()}
                      </span>
                    </div>
                    <ProgressBar
                      value={stats.household.spent}
                      max={stats.household.monthlyBudget}
                      color="amber"
                      showLabel={false}
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {stats.household.pendingBills} pending {stats.household.pendingBills === 1 ? 'bill' : 'bills'} • ${stats.projects.totalExpenses.toLocaleString()} total expenses
                    </p>
                  </div>

                  <div className="mt-auto pt-3 flex items-center justify-end text-amber-600 dark:text-amber-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>

                {/* Goals Card */}
                <Link
                  href="/goals"
                  className="group bg-white/30 dark:bg-gray-800/30 backdrop-blur-md border-2 border-white/20 dark:border-gray-700/20 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(99,102,241,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">Goals</h3>
                        {stats.goals.trend !== 0 && <TrendIndicator value={stats.goals.trend} label="this week" />}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {stats.goals.active}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">active</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                      <Target className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{stats.goals.inProgress} in progress</span>
                      <span className="text-gray-600 dark:text-gray-400">{stats.goals.completed} completed</span>
                    </div>
                  </div>

                  {stats.goals.topGoal && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mb-3">
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-1">Top goal:</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium truncate mb-2">
                        {stats.goals.topGoal.title}
                      </p>
                      <ProgressBar
                        value={stats.goals.topGoal.progress}
                        max={100}
                        color="indigo"
                        showLabel={false}
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {stats.goals.topGoal.progress}% complete
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mb-3">
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-1">Overall progress:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900 dark:text-white font-bold">
                        {stats.goals.overallProgress}%
                      </span>
                    </div>
                    <ProgressBar
                      value={stats.goals.overallProgress}
                      max={100}
                      color="indigo"
                      showLabel={false}
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {stats.goals.total} total goals
                    </p>
                  </div>

                  <div className="mt-auto pt-3 flex items-center justify-end text-indigo-600 dark:text-indigo-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Real-time updates indicator */}
          <div className="flex items-center justify-end gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 -mt-2">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 animate-pulse" />
            <span>Real-time updates</span>
          </div>

          {/* Daily Check-In Section - Compact Design */}
          <div className="bg-gradient-to-br from-pink-50/50 via-purple-50/50 to-blue-50/50 dark:from-pink-900/10 dark:via-purple-900/10 dark:to-blue-900/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-pink-200/20 dark:border-pink-500/20 transition-all duration-300">
            {/* Compact Header with Date, Toggle, and Streak Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Daily Check-In</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">{formatDate(getCurrentDateString(), 'EEEE, MMMM d, yyyy')}</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Mode Toggle - Matches Tasks Page Pattern */}
                <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg sm:rounded-xl border border-pink-200 dark:border-pink-700">
                  <Tooltip content="Record your mood and share highlights">
                    <button
                      onClick={() => setViewMode('checkin')}
                      className={`px-2 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-2 transition-all font-medium ${
                        viewMode === 'checkin'
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">Check In</span>
                    </button>
                  </Tooltip>
                  <Tooltip content="View your mood history and insights">
                    <button
                      onClick={() => setViewMode('journal')}
                      className={`px-2 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-2 transition-all font-medium ${
                        viewMode === 'journal'
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs sm:text-sm">Journal</span>
                    </button>
                  </Tooltip>
                </div>

                {/* Streak Badge */}
                {checkInStats && checkInStats.currentStreak > 0 && (
                  <Tooltip content={`You've checked in ${checkInStats.currentStreak} days in a row! Keep it up!`}>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 rounded-full cursor-help">
                      <Zap className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{checkInStats.currentStreak}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline">day streak</span>
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Check-In Mode */}
            {viewMode === 'checkin' && (
              <>
                {/* Partner Moods - Side by Side */}
                {recentCheckIns.length > 0 && (
                  <div className="flex items-center gap-3 mb-4 px-2">
                    {(() => {
                      const today = getCurrentDateString();
                      const userToday = recentCheckIns.find(c => c.user_id === user?.id && c.date === today);
                      const partnerToday = recentCheckIns.find(c => c.user_id !== user?.id && c.date === today);
                      const userEmoji = userToday ? moodOptions.find(m => m.value === userToday.mood)?.emoji : null;
                      const partnerEmoji = partnerToday ? moodOptions.find(m => m.value === partnerToday.mood)?.emoji : null;

                      return (
                        <>
                          {userEmoji && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-full border border-pink-200/50 dark:border-pink-700/50">
                              <span className="text-xl">{userEmoji}</span>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">You</span>
                            </div>
                          )}
                          {partnerEmoji && partnerToday && (
                            <>
                              <div className="flex items-center gap-2 px-3 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-full border border-purple-200/50 dark:border-purple-700/50">
                                <span className="text-xl">{partnerEmoji}</span>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Partner</span>
                              </div>

                              {/* Reaction Buttons */}
                              <div className="flex items-center gap-1">
                                {checkInReactions[partnerToday.id]?.length > 0 ? (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-pink-100 dark:bg-pink-900/30 rounded-full border border-pink-300 dark:border-pink-700">
                                    <span className="text-sm">
                                      {checkInReactions[partnerToday.id][0].reaction_type === 'heart' && '❤️'}
                                      {checkInReactions[partnerToday.id][0].reaction_type === 'hug' && '🤗'}
                                      {checkInReactions[partnerToday.id][0].reaction_type === 'strength' && '💪'}
                                    </span>
                                    <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">Sent</span>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleSendReaction(partnerToday.id, 'heart')}
                                      disabled={partnerReactionLoading}
                                      className="p-2 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50"
                                      title="Send love"
                                    >
                                      <span className="text-lg">❤️</span>
                                    </button>
                                    <button
                                      onClick={() => handleSendReaction(partnerToday.id, 'hug')}
                                      disabled={partnerReactionLoading}
                                      className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50"
                                      title="Send hug"
                                    >
                                      <span className="text-lg">🤗</span>
                                    </button>
                                    <button
                                      onClick={() => handleSendReaction(partnerToday.id, 'strength')}
                                      disabled={partnerReactionLoading}
                                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50"
                                      title="Send strength"
                                    >
                                      <span className="text-lg">💪</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Elegant Mood Selector - Apple-Inspired Design */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 w-full mb-3">
              {moodOptions.map((mood) => {
                // Color schemes for each mood (Apple Health-inspired gradients)
                const moodStyles = {
                  great: {
                    gradient: 'from-green-400 to-emerald-500',
                    glow: 'shadow-green-500/30',
                    ring: 'ring-green-400/50',
                    bgActive: 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40',
                    bgHover: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                  },
                  good: {
                    gradient: 'from-blue-400 to-cyan-500',
                    glow: 'shadow-blue-500/30',
                    ring: 'ring-blue-400/50',
                    bgActive: 'bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40',
                    bgHover: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
                  },
                  okay: {
                    gradient: 'from-gray-400 to-slate-500',
                    glow: 'shadow-gray-500/30',
                    ring: 'ring-gray-400/50',
                    bgActive: 'bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-800/60 dark:to-slate-800/60',
                    bgHover: 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/40 dark:to-slate-800/40'
                  },
                  meh: {
                    gradient: 'from-amber-400 to-orange-500',
                    glow: 'shadow-amber-500/30',
                    ring: 'ring-amber-400/50',
                    bgActive: 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40',
                    bgHover: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20'
                  },
                  rough: {
                    gradient: 'from-purple-400 to-pink-500',
                    glow: 'shadow-purple-500/30',
                    ring: 'ring-purple-400/50',
                    bgActive: 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40',
                    bgHover: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
                  }
                };

                const style = moodStyles[mood.value as keyof typeof moodStyles];
                const isSelected = selectedMood === mood.value;

                return (
                  <Tooltip key={mood.value} content={`I'm feeling ${mood.label.toLowerCase()} today`} position="top">
                    <button
                      onClick={() => handleMoodSelect(mood.value)}
                      className={`group relative flex flex-col items-center gap-2 transition-all duration-300 transform ${
                        isSelected ? 'scale-110' : 'hover:scale-105 active:scale-95'
                      }`}
                      title={mood.label}
                    >
                      {/* Emoji Container - Circular with gradient background */}
                      <div className={`
                        relative w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18
                        rounded-full flex items-center justify-center
                        transition-all duration-300
                        ${isSelected
                          ? `${style.bgActive} ring-4 ${style.ring} ${style.glow} shadow-xl`
                          : `${style.bgHover} hover:shadow-lg`
                        }
                      `}>
                        <div className={`
                          text-3xl sm:text-4xl md:text-5xl
                          transition-transform duration-300
                          ${isSelected ? 'scale-110' : 'group-hover:scale-105'}
                        `}>
                          {mood.emoji}
                        </div>

                        {/* Selection indicator ring */}
                        {isSelected && (
                          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${style.gradient} opacity-20 animate-pulse`} />
                        )}
                      </div>

                      {/* Label - Only show on selected or desktop hover */}
                      <span className={`
                        text-xs sm:text-sm font-medium transition-all duration-200
                        ${isSelected
                          ? 'opacity-100 text-gray-900 dark:text-white'
                          : 'opacity-0 sm:group-hover:opacity-70 text-gray-600 dark:text-gray-400'
                        }
                      `}>
                        {mood.label}
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>

            {/* Smart Conditional Expansion */}
            {checkInExpanded && selectedMood && (
              <div className="space-y-3 mt-4 animate-expand overflow-hidden">
                {/* Positive moods: Great/Good → Gratitude/Highlights prompt */}
                {(selectedMood === 'great' || selectedMood === 'good') && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                        What went well today? (Optional)
                      </label>
                      <textarea
                        placeholder="Share a win, big or small..."
                        value={checkInHighlights}
                        onChange={(e) => setCheckInHighlights(e.target.value)}
                        maxLength={150}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-xl resize-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-gray-900 dark:text-white text-sm transition-all"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-pink-500" />
                        What are you grateful for? (Optional)
                      </label>
                      <textarea
                        placeholder="One thing you appreciate today..."
                        value={checkInGratitude}
                        onChange={(e) => setCheckInGratitude(e.target.value)}
                        maxLength={150}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-pink-200 dark:border-pink-800 rounded-xl resize-none focus:ring-2 focus:ring-pink-400 focus:border-transparent text-gray-900 dark:text-white text-sm transition-all"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Negative moods: Meh/Rough → Support/Challenges prompt */}
                {(selectedMood === 'meh' || selectedMood === 'rough') && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-blue-500" />
                      What's been challenging? (Optional)
                    </label>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 italic">
                      It's okay to not be okay. You're not alone.
                    </p>
                    <textarea
                      placeholder="Share what's on your mind..."
                      value={checkInChallenges}
                      onChange={(e) => setCheckInChallenges(e.target.value)}
                      maxLength={150}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white text-sm transition-all"
                      rows={2}
                    />
                  </div>
                )}

                {/* Neutral mood: Okay → Optional note */}
                {selectedMood === 'okay' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                      Anything on your mind? (Optional)
                    </label>
                    <textarea
                      placeholder="Share your thoughts..."
                      value={checkInNote}
                      onChange={(e) => setCheckInNote(e.target.value)}
                      maxLength={150}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-gray-900 dark:text-white text-sm transition-all"
                      rows={2}
                    />
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleCheckIn}
                    disabled={checkInSaving}
                    className={`px-5 py-2 rounded-full text-white text-sm font-semibold transition-all transform flex items-center gap-2 ${
                      !checkInSaving
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 hover:scale-105 shadow-md'
                        : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {checkInSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4" />
                        <span>Check In</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
              </>
            )}

            {/* Journal Mode */}
            {viewMode === 'journal' && (
              <div className="space-y-4">
                {/* Journal View Toggle - Calendar on Left, List on Right */}
                <div className="inline-flex items-center gap-1 p-1 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-lg border border-pink-200 dark:border-pink-700">
                  <button
                    onClick={() => setJournalView('calendar')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all font-medium ${
                      journalView === 'calendar'
                        ? 'bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs">Calendar</span>
                  </button>
                  <button
                    onClick={() => setJournalView('list')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all font-medium ${
                      journalView === 'list'
                        ? 'bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="text-xs">List</span>
                  </button>
                </div>

                {/* Weekly Insights */}
                <WeeklyInsights checkIns={recentCheckIns} />

                {/* Calendar View */}
                {journalView === 'calendar' && (
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between px-2">
                      <button
                        onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        className="p-2 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      </button>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {format(calendarMonth, 'MMMM yyyy')}
                      </h3>
                      <button
                        onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        className="p-2 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                      {/* Day Headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1 sm:py-2">
                          <span className="hidden sm:inline">{day}</span>
                          <span className="sm:hidden">{day.charAt(0)}</span>
                        </div>
                      ))}

                      {/* Calendar Days */}
                      {(() => {
                        const year = calendarMonth.getFullYear();
                        const month = calendarMonth.getMonth();
                        const firstDay = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const days = [];

                        // Empty cells for days before month starts
                        for (let i = 0; i < firstDay; i++) {
                          days.push(<div key={`empty-${i}`} className="aspect-square" />);
                        }

                        // Days of the month
                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateStr = new Date(year, month, day).toISOString().split('T')[0];
                          const dayCheckIns = recentCheckIns.filter(c => c.date === dateStr);
                          const isToday = getCurrentDateString() === dateStr;

                          days.push(
                            <div
                              key={day}
                              className={`aspect-square p-0.5 sm:p-1 rounded border sm:rounded-lg transition-all ${
                                isToday
                                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-600'
                              }`}
                            >
                              <div className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 font-medium mb-0.5">
                                {day}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                {dayCheckIns.map((checkIn, idx) => {
                                  const moodEmoji = moodOptions.find(m => m.value === checkIn.mood)?.emoji;
                                  const isUser = checkIn.user_id === user?.id;
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] sm:text-[10px] ${
                                        isUser
                                          ? 'bg-pink-100 dark:bg-pink-900/40 border border-pink-200 dark:border-pink-700/50'
                                          : 'bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-700/50'
                                      }`}
                                      title={isUser ? 'You' : 'Partner'}
                                    >
                                      <span className="text-sm sm:text-base leading-none">{moodEmoji}</span>
                                      <span className="text-[9px] sm:text-[10px] text-gray-700 dark:text-gray-300 truncate font-medium">
                                        {isUser ? 'You' : 'Partner'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        return days;
                      })()}
                    </div>
                  </div>
                )}

                {/* List View - Grouped by Day */}
                {journalView === 'list' && (
                  <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                    {recentCheckIns.length === 0 ? (
                      <div className="text-center py-12">
                        <Heart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No check-ins yet</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start checking in to build your journal</p>
                      </div>
                    ) : (
                      (() => {
                        // Group check-ins by date
                        const groupedByDate = recentCheckIns.reduce((acc, checkIn) => {
                          const date = checkIn.date;
                          if (!acc[date]) acc[date] = [];
                          acc[date].push(checkIn);
                          return acc;
                        }, {} as Record<string, DailyCheckIn[]>);

                        // Sort dates in descending order (most recent first)
                        const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

                        return sortedDates.map(date => (
                          <div key={date} className="space-y-2">
                            {/* Date Header */}
                            <div className="sticky top-0 bg-gradient-to-r from-pink-100/80 to-purple-100/80 dark:from-pink-900/20 dark:to-purple-900/20 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-pink-200/50 dark:border-pink-700/50">
                              <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                {formatDate(date, 'EEEE, MMMM d, yyyy')}
                              </p>
                            </div>

                            {/* Check-ins for this date */}
                            {groupedByDate[date].map((checkIn) => {
                              const moodEmoji = moodOptions.find(m => m.value === checkIn.mood)?.emoji;
                              const isUser = checkIn.user_id === user?.id;
                              return (
                                <div key={checkIn.id} className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4 border border-gray-200 dark:border-gray-700 ml-2">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <span className="text-3xl sm:text-4xl">{moodEmoji}</span>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {isUser ? 'You' : 'Partner'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {moodOptions.find(m => m.value === checkIn.mood)?.label}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  {checkIn.highlights && (
                                    <div className="mt-3">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Sparkles className="w-3 h-3 text-yellow-500" />
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Highlights</p>
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 ml-5">{checkIn.highlights}</p>
                                    </div>
                                  )}
                                  {checkIn.challenges && (
                                    <div className="mt-3">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Heart className="w-3 h-3 text-blue-500" />
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Challenges</p>
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 ml-5">{checkIn.challenges}</p>
                                    </div>
                                  )}
                                  {checkIn.gratitude && (
                                    <div className="mt-3">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Heart className="w-3 h-3 text-pink-500" />
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Grateful For</p>
                                      </div>
                                      <p className="text-sm text-gray-600 dark:text-gray-400 ml-5">{checkIn.gratitude}</p>
                                    </div>
                                  )}
                                  {checkIn.note && (
                                    <div className="mt-3">
                                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Note</p>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">{checkIn.note}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Space Management Modals */}
      <CreateSpaceModal
        isOpen={showCreateSpaceModal}
        onClose={() => setShowCreateSpaceModal(false)}
        onSpaceCreated={(spaceId, spaceName) => {
          refreshSpaces();
          setShowCreateSpaceModal(false);
        }}
      />

      <InvitePartnerModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        spaceId={currentSpace?.id || ''}
        spaceName={currentSpace?.name || ''}
      />

      {/* Check-In Success Modal */}
      <CheckInSuccess
        isOpen={showCheckInSuccess}
        onClose={() => setShowCheckInSuccess(false)}
        mood={lastCheckInMood}
        streak={checkInStats?.currentStreak || 0}
      />
    </FeatureLayout>
    </PageErrorBoundary>
  );
}
