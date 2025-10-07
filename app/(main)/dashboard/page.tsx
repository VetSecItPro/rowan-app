'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { tasksService } from '@/lib/services/tasks-service';
import { calendarService } from '@/lib/services/calendar-service';
import { remindersService } from '@/lib/services/reminders-service';
import { messagesService } from '@/lib/services/messages-service';
import { shoppingService } from '@/lib/services/shopping-service';
import { mealsService } from '@/lib/services/meals-service';
import { projectsService } from '@/lib/services/projects-service';
import { goalsService } from '@/lib/services/goals-service';
import { supabase } from '@/lib/supabase';
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
  Sparkles,
  Activity,
  Heart,
  ArrowRight,
  Plus,
  Filter,
  ChevronRight,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { format, isToday, isThisWeek, isPast, parseISO, startOfWeek, subWeeks } from 'date-fns';

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

// Progress Bar Component
function ProgressBar({ value, max, color = 'blue', showLabel = true }: { value: number; max: number; color?: string; showLabel?: boolean }) {
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
}

// Trend Indicator Component
function TrendIndicator({ value, label }: { value: number; label: string }) {
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
}

export default function DashboardPage() {
  const { user, currentSpace } = useAuth();
  const [loading, setLoading] = useState(true);
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

  // Load all comprehensive stats
  async function loadAllStats() {
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
        projectsService.getChores(currentSpace.id),
        projectsService.getChoreStats(currentSpace.id, user.id),
        projectsService.getBudgetStats(currentSpace.id),
        goalsService.getGoals(currentSpace.id),
        goalsService.getGoalStats(currentSpace.id),
      ]);

      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const weekAgo = subWeeks(now, 1);

      // Calculate detailed task stats
      const tasksDueToday = allTasks.filter(t => t.due_date === today && t.status !== 'completed').length;
      const tasksOverdue = allTasks.filter(t =>
        t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && t.status !== 'completed'
      ).length;
      const tasksLastWeek = allTasks.filter(t =>
        t.created_at && parseISO(t.created_at) < weekAgo
      ).length;
      const taskTrend = allTasks.length - tasksLastWeek;
      const recentTasks = allTasks
        .filter(t => t.status !== 'completed')
        .sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
        })
        .slice(0, 3)
        .map(t => ({ id: t.id, title: t.title, due_date: t.due_date, priority: t.priority }));

      // Calculate detailed event stats
      const eventsToday = allEvents.filter(e => isToday(parseISO(e.start_time))).length;
      const eventsThisWeek = allEvents.filter(e => isThisWeek(parseISO(e.start_time))).length;
      const upcomingEvents = allEvents.filter(e => parseISO(e.start_time) > now).length;
      const personalEvents = allEvents.filter(e => e.is_all_day === false).length;
      const nextEvent = allEvents
        .filter(e => parseISO(e.start_time) > now)
        .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())[0];
      const eventTrend = allEvents.filter(e => parseISO(e.created_at) > weekAgo).length;

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
      const reminderTrend = allReminders.filter(r => parseISO(r.created_at) > weekAgo).length;

      // Calculate detailed message stats
      const messagesToday = allMessages.filter(m => isToday(parseISO(m.created_at))).length;
      const lastMessage = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;
      const messageTrend = allMessages.filter(m => parseISO(m.created_at) > weekAgo).length;

      // Calculate detailed shopping stats
      let totalItems = 0;
      let checkedToday = 0;
      let uncheckedItems = 0;
      for (const list of shoppingLists) {
        const items = await shoppingService.getItems(list.id);
        totalItems += items.length;
        uncheckedItems += items.filter(i => !i.is_checked).length;
        checkedToday += items.filter(i =>
          i.is_checked && i.updated_at && isToday(parseISO(i.updated_at))
        ).length;
      }
      const activeLists = shoppingLists.filter(l => l.status === 'active').length;
      const shoppingTrend = shoppingLists.filter(l => parseISO(l.created_at) > weekAgo).length;

      // Calculate detailed meal stats
      const mealsToday = meals.filter(m => m.scheduled_date && isToday(parseISO(m.scheduled_date))).length;
      const nextMeal = meals
        .filter(m => m.scheduled_date && parseISO(m.scheduled_date) > now)
        .sort((a, b) => parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime())[0];
      const mealTrend = meals.filter(m => parseISO(m.created_at) > weekAgo).length;

      // Calculate detailed household stats
      const choresAssignedToMe = allChores.filter(c => c.assigned_to === user.id).length;
      const choresAssignedToPartner = allChores.filter(c => c.assigned_to && c.assigned_to !== user.id).length;
      const choresOverdue = allChores.filter(c =>
        c.due_date && isPast(parseISO(c.due_date)) && c.status !== 'completed'
      ).length;
      const householdTrend = allChores.filter(c => parseISO(c.created_at) > weekAgo).length;

      // Calculate detailed goal stats
      const activeGoals = allGoals.filter(g => g.status === 'active').length;
      const completedGoals = allGoals.filter(g => g.status === 'completed').length;
      const inProgressGoals = allGoals.filter(g => g.status === 'in_progress').length;
      const topGoal = allGoals.length > 0
        ? { title: allGoals[0].title, progress: allGoals[0].progress || 0 }
        : null;
      const goalTrend = allGoals.filter(g => parseISO(g.created_at) > weekAgo).length;

      setStats({
        tasks: {
          total: taskStats.total,
          pending: taskStats.pending,
          inProgress: taskStats.inProgress,
          completed: taskStats.completed,
          dueToday: tasksDueToday,
          overdue: tasksOverdue,
          highPriority: taskStats.byPriority.high + taskStats.byPriority.urgent,
          assignedToMe: allTasks.filter(t => t.assigned_to === user.id).length,
          completionRate: taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0,
          trend: taskTrend,
          recentTasks,
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
          urgentList: shoppingLists.length > 0 ? shoppingLists[0].name : null,
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
        goals: {
          total: allGoals.length,
          active: activeGoals,
          completed: completedGoals,
          inProgress: inProgressGoals,
          milestonesReached: 0,
          totalMilestones: 0,
          overallProgress: goalStats.overallProgress || 0,
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
  }

  // Real-time subscriptions
  useEffect(() => {
    loadAllStats();

    const channels: any[] = [];

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

    // Cleanup subscriptions
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpace.id]);

  // Mood options
  const moodOptions = [
    { emoji: '😊', label: 'Great', value: 'great' },
    { emoji: '🙂', label: 'Good', value: 'good' },
    { emoji: '😐', label: 'Okay', value: 'okay' },
    { emoji: '😔', label: 'Meh', value: 'meh' },
    { emoji: '😫', label: 'Rough', value: 'rough' },
  ];

  const handleCheckIn = () => {
    if (!selectedMood) return;
    console.log('Check-in:', { mood: selectedMood, note: checkInNote });
    setSelectedMood(null);
    setCheckInNote('');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard' }]}>
      <div className="min-h-screen bg-gradient-to-b from-white via-purple-100/30 via-40% to-purple-200 dark:from-black dark:via-purple-900/30 dark:via-40% dark:to-purple-900 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Welcome Header */}
          <div className="relative overflow-hidden shimmer-gradient rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center">
                  {greeting()}, {user.name}!
                </h1>
              </div>
              <p className="text-purple-100 text-sm sm:text-base md:text-lg text-center px-2">
                {currentSpace.name} • {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">{stats.tasks.pending} pending tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">{stats.events.today} events today</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">{stats.tasks.overdue + stats.reminders.overdue} overdue items</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Feature Cards - 8 Cards */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                Live Stats
              </h2>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 animate-pulse" />
                <span>Real-time updates</span>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg animate-pulse">
                    <div className="h-28 sm:h-32 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Tasks & Chores Card */}
                <Link
                  href="/tasks"
                  className="group bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">Tasks</h3>
                        {stats.tasks.trend !== 0 && <TrendIndicator value={stats.tasks.trend} label="this week" />}
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats.tasks.total}
                      </p>
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
                  className="group bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(168,85,247,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400">Calendar</h3>
                        {stats.events.trend !== 0 && <TrendIndicator value={stats.events.trend} label="this week" />}
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats.events.total}
                      </p>
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
                        {format(parseISO(stats.events.nextEvent.start_time), 'MMM d, h:mm a')}
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
                  className="group bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(251,146,60,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">Reminders</h3>
                        {stats.reminders.trend !== 0 && <TrendIndicator value={stats.reminders.trend} label="this week" />}
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats.reminders.active}
                      </p>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
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
                      <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1 font-medium">
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
                        {format(parseISO(stats.reminders.nextDue.reminder_time), 'MMM d, h:mm a')}
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
                  className="group bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(34,197,94,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">Messages</h3>
                        {stats.messages.trend !== 0 && <TrendIndicator value={stats.messages.trend} label="this week" />}
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats.messages.total}
                      </p>
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
                        {format(parseISO(stats.messages.lastMessage.created_at), 'h:mm a')}
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
                  className="group bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(20,184,166,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-teal-600 dark:text-teal-400">Shopping</h3>
                        {stats.shopping.trend !== 0 && <TrendIndicator value={stats.shopping.trend} label="this week" />}
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats.shopping.totalItems}
                      </p>
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
                  className="group bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(239,68,68,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">Meals</h3>
                        {stats.meals.trend !== 0 && <TrendIndicator value={stats.meals.trend} label="this week" />}
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats.meals.thisWeek}
                      </p>
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
                        {format(parseISO(stats.meals.nextMeal.scheduled_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-end text-red-600 dark:text-red-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>

                {/* Household Card */}
                <Link
                  href="/household"
                  className="group bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(234,179,8,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">Household</h3>
                        {stats.household.trend !== 0 && <TrendIndicator value={stats.household.trend} label="this week" />}
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats.household.totalChores}
                      </p>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                      <Home className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{stats.household.assignedToMe} yours</span>
                      <span className="text-gray-600 dark:text-gray-400">{stats.household.assignedToPartner} partner's</span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      {stats.household.completedThisWeek} done this week
                    </p>
                    {stats.household.overdue > 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {stats.household.overdue} overdue
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Budget:</p>
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
                      {stats.household.pendingBills} pending bills
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
                  className="group bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(99,102,241,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400">Goals</h3>
                        {stats.goals.trend !== 0 && <TrendIndicator value={stats.goals.trend} label="this week" />}
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats.goals.active}
                      </p>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stats.goals.total} total goals
                    </p>
                  </div>

                  {stats.goals.topGoal && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mb-3">
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-2">Top goal:</p>
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

                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Overall progress: {stats.goals.overallProgress}%
                  </p>

                  <div className="mt-auto pt-3 flex items-center justify-end text-indigo-600 dark:text-indigo-400 text-sm font-medium group-hover:gap-2 transition-all">
                    <span>View all</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Daily Check-In Section */}
          <div className="bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Daily Check-In
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Check-In */}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">How are you feeling today?</p>
                <div className="flex gap-2 mb-4">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => setSelectedMood(mood.value)}
                      className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                        selectedMood === mood.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 scale-105'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      title={mood.label}
                    >
                      <div className="text-2xl">{mood.emoji}</div>
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Share what's on your mind..."
                  value={checkInNote}
                  onChange={(e) => setCheckInNote(e.target.value)}
                  maxLength={200}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                  rows={3}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{checkInNote.length}/200</span>
                  <button
                    onClick={handleCheckIn}
                    disabled={!selectedMood}
                    className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all ${
                      selectedMood
                        ? 'shimmer-bg hover:opacity-90 shadow-lg'
                        : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                    }`}
                  >
                    Check In
                  </button>
                </div>
              </div>

              {/* Space Overview Stats */}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Space Overview</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.tasks.total + stats.events.total + stats.reminders.total}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Items</p>
                  </div>
                  <div className="p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.goals.completed}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Goals Done</p>
                  </div>
                  <div className="p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {stats.shopping.activeLists}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Active Lists</p>
                  </div>
                  <div className="p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm rounded-xl">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {stats.meals.thisWeek}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Meals Planned</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}
