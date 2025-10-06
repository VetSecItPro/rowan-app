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
import { householdService } from '@/lib/services/household-service';
import { goalsService } from '@/lib/services/goals-service';
import {
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Home,
  Target,
  Plus,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Activity,
  Heart,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface DashboardStats {
  tasks: { total: number; dueToday: number; overdue: number };
  events: { total: number; today: number; thisWeek: number };
  reminders: { total: number; active: number; snoozed: number };
  messages: { total: number; unread: number; conversations: number };
  shopping: { total: number; active: number; items: number };
  meals: { total: number; thisWeek: number; recipes: number };
  household: { chores: number; pending: number; expenses: number };
  goals: { total: number; active: number; completed: number };
}

export default function DashboardPage() {
  const { user, currentSpace } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    tasks: { total: 0, dueToday: 0, overdue: 0 },
    events: { total: 0, today: 0, thisWeek: 0 },
    reminders: { total: 0, active: 0, snoozed: 0 },
    messages: { total: 0, unread: 0, conversations: 0 },
    shopping: { total: 0, active: 0, items: 0 },
    meals: { total: 0, thisWeek: 0, recipes: 0 },
    household: { chores: 0, pending: 0, expenses: 0 },
    goals: { total: 0, active: 0, completed: 0 },
  });
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [checkInNote, setCheckInNote] = useState('');

  useEffect(() => {
    loadAllStats();
  }, [currentSpace.id]);

  async function loadAllStats() {
    try {
      setLoading(true);
      const [
        taskStats,
        eventStats,
        reminderStats,
        messageStats,
        shoppingStats,
        mealStats,
        choreStats,
        budgetStats,
        goalStats,
      ] = await Promise.all([
        tasksService.getTaskStats(currentSpace.id),
        calendarService.getEventStats(currentSpace.id),
        remindersService.getReminderStats(currentSpace.id),
        messagesService.getMessageStats(currentSpace.id),
        shoppingService.getShoppingStats(currentSpace.id),
        mealsService.getMealStats(currentSpace.id),
        householdService.getChoreStats(currentSpace.id, user.id),
        householdService.getBudgetStats(currentSpace.id),
        goalsService.getGoalStats(currentSpace.id),
      ]);

      setStats({
        tasks: {
          total: taskStats.total,
          dueToday: taskStats.dueToday,
          overdue: taskStats.overdue,
        },
        events: {
          total: eventStats.total,
          today: eventStats.today,
          thisWeek: eventStats.thisWeek,
        },
        reminders: {
          total: reminderStats.total,
          active: reminderStats.active,
          snoozed: reminderStats.snoozed,
        },
        messages: {
          total: messageStats.total,
          unread: messageStats.unread,
          conversations: messageStats.conversations,
        },
        shopping: {
          total: shoppingStats.total,
          active: shoppingStats.active,
          items: shoppingStats.items,
        },
        meals: {
          total: mealStats.total,
          thisWeek: mealStats.thisWeek,
          recipes: mealStats.recipes,
        },
        household: {
          chores: choreStats.total,
          pending: choreStats.myChores + choreStats.partnerChores,
          expenses: budgetStats.pendingBills,
        },
        goals: {
          total: goalStats.total,
          active: goalStats.active,
          completed: goalStats.completed,
        },
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const featureCards = [
    {
      title: 'Tasks',
      href: '/tasks',
      gradient: 'bg-gradient-tasks',
      shadowColor: 'shadow-blue-500/50',
      icon: CheckSquare,
      total: stats.tasks.total,
      subtitle: `${stats.tasks.dueToday} due today`,
      urgent: stats.tasks.overdue > 0 ? `${stats.tasks.overdue} overdue` : null,
    },
    {
      title: 'Calendar',
      href: '/calendar',
      gradient: 'bg-gradient-calendar',
      shadowColor: 'shadow-purple-500/50',
      icon: Calendar,
      total: stats.events.total,
      subtitle: `${stats.events.today} today`,
      urgent: null,
    },
    {
      title: 'Reminders',
      href: '/reminders',
      gradient: 'bg-gradient-reminders',
      shadowColor: 'shadow-orange-500/50',
      icon: Bell,
      total: stats.reminders.total,
      subtitle: `${stats.reminders.active} active`,
      urgent: null,
    },
    {
      title: 'Messages',
      href: '/messages',
      gradient: 'bg-gradient-messages',
      shadowColor: 'shadow-green-500/50',
      icon: MessageCircle,
      total: stats.messages.total,
      subtitle: `${stats.messages.conversations} conversations`,
      urgent: stats.messages.unread > 0 ? `${stats.messages.unread} unread` : null,
    },
    {
      title: 'Shopping',
      href: '/shopping',
      gradient: 'bg-gradient-shopping',
      shadowColor: 'shadow-teal-500/50',
      icon: ShoppingCart,
      total: stats.shopping.total,
      subtitle: `${stats.shopping.active} active lists`,
      urgent: null,
    },
    {
      title: 'Meals',
      href: '/meals',
      gradient: 'bg-gradient-meals',
      shadowColor: 'shadow-red-500/50',
      icon: UtensilsCrossed,
      total: stats.meals.total,
      subtitle: `${stats.meals.thisWeek} this week`,
      urgent: null,
    },
    {
      title: 'Household',
      href: '/household',
      gradient: 'bg-gradient-household',
      shadowColor: 'shadow-yellow-500/50',
      icon: Home,
      total: stats.household.chores,
      subtitle: `${stats.household.pending} pending`,
      urgent: null,
    },
    {
      title: 'Goals',
      href: '/goals',
      gradient: 'bg-gradient-goals',
      shadowColor: 'shadow-indigo-500/50',
      icon: Target,
      total: stats.goals.total,
      subtitle: `${stats.goals.active} active`,
      urgent: null,
    },
  ];

  // Mock recent activity data - in production, this would come from a real activity log
  const recentActivity = [
    {
      id: 1,
      user: 'Sarah',
      action: 'completed',
      item: 'Buy groceries',
      feature: 'Tasks',
      icon: CheckSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      time: '10 min ago',
    },
    {
      id: 2,
      user: 'John',
      action: 'added',
      item: 'Dinner with friends',
      feature: 'Calendar',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      time: '1 hour ago',
    },
    {
      id: 3,
      user: 'Sarah',
      action: 'planned',
      item: 'Spaghetti Bolognese',
      feature: 'Meals',
      icon: UtensilsCrossed,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      time: '2 hours ago',
    },
    {
      id: 4,
      user: 'John',
      action: 'added to',
      item: 'Weekly groceries',
      feature: 'Shopping',
      icon: ShoppingCart,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      time: '3 hours ago',
    },
    {
      id: 5,
      user: 'Sarah',
      action: 'sent',
      item: 'Meeting reminder message',
      feature: 'Messages',
      icon: MessageCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      time: '5 hours ago',
    },
  ];

  // Mock space members data
  const spaceMembers = [
    {
      id: 1,
      name: 'Sarah',
      avatar: 'S',
      tasksToday: 5,
      checkedIn: true,
      bgColor: 'bg-purple-500',
    },
    {
      id: 2,
      name: 'John',
      avatar: 'J',
      tasksToday: 3,
      checkedIn: false,
      bgColor: 'bg-blue-500',
    },
  ];

  // Mock check-in data
  const partnerCheckIn = {
    name: 'Sarah',
    mood: '😊',
    moodLabel: 'Great',
    note: 'Excited for our date night tonight!',
    time: '2 hours ago',
  };

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
    // In production, this would save to backend
    console.log('Check-in:', { mood: selectedMood, note: checkInNote });
    // Reset form
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
      <div className="min-h-screen bg-gradient-to-b from-white via-purple-100/30 via-40% to-purple-200 dark:from-black dark:via-purple-900/30 dark:via-40% dark:to-purple-900 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Header */}
          <div className="relative overflow-hidden shimmer-gradient rounded-2xl p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-8 h-8" />
                <h1 className="text-4xl font-bold">
                  {greeting()}, {user.name}!
                </h1>
              </div>
              <p className="text-purple-100 text-lg">
                {currentSpace.name} • {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              <div className="mt-6 flex items-center gap-2 text-white/90">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">
                  You have {stats.tasks.dueToday} tasks due today and {stats.events.today} events scheduled
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats - 8 Feature Cards */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Home className="w-6 h-6" />
              Your Features at a Glance
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg animate-pulse">
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featureCards.map((card) => {
                  const Icon = card.icon;
                  const getShadowClass = () => {
                    switch(card.title) {
                      case 'Tasks': return 'hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)]';
                      case 'Calendar': return 'hover:shadow-[0_20px_50px_rgba(168,85,247,0.5)]';
                      case 'Reminders': return 'hover:shadow-[0_20px_50px_rgba(251,146,60,0.5)]';
                      case 'Messages': return 'hover:shadow-[0_20px_50px_rgba(34,197,94,0.5)]';
                      case 'Shopping': return 'hover:shadow-[0_20px_50px_rgba(20,184,166,0.5)]';
                      case 'Meals': return 'hover:shadow-[0_20px_50px_rgba(239,68,68,0.5)]';
                      case 'Household': return 'hover:shadow-[0_20px_50px_rgba(234,179,8,0.5)]';
                      case 'Goals': return 'hover:shadow-[0_20px_50px_rgba(99,102,241,0.5)]';
                      default: return '';
                    }
                  };
                  const getTitleColorClass = () => {
                    switch(card.title) {
                      case 'Tasks': return 'text-blue-600 dark:text-blue-400';
                      case 'Calendar': return 'text-purple-600 dark:text-purple-400';
                      case 'Reminders': return 'text-orange-600 dark:text-orange-400';
                      case 'Messages': return 'text-green-600 dark:text-green-400';
                      case 'Shopping': return 'text-teal-600 dark:text-teal-400';
                      case 'Meals': return 'text-red-600 dark:text-red-400';
                      case 'Household': return 'text-yellow-600 dark:text-yellow-400';
                      case 'Goals': return 'text-indigo-600 dark:text-indigo-400';
                      default: return 'text-gray-600 dark:text-gray-400';
                    }
                  };
                  return (
                    <Link
                      key={card.title}
                      href={card.href}
                      className={`group bg-transparent rounded-2xl p-6 ${getShadowClass()} hover:-translate-y-2 transition-all duration-300 cursor-pointer`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <p className={`text-lg font-bold ${getTitleColorClass()} mb-1`}>
                            {card.title}
                          </p>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {card.total}
                          </p>
                        </div>
                        <div className={`w-14 h-14 ${card.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {card.subtitle}
                        </p>
                        {card.urgent && (
                          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3" />
                            {card.urgent}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-transparent rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  Recent Activity
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Family updates
                </span>
              </div>

              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-4 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className={`w-10 h-10 ${activity.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-semibold">{activity.user}</span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">{activity.action}</span>{' '}
                          <span className="font-medium">{activity.item}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {activity.feature} • {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Space Members & Daily Check-In */}
            <div className="bg-transparent rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Daily Check-In
              </h2>

              {/* Space Members */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Space Members</p>
                <div className="flex items-center gap-3">
                  {spaceMembers.map((member) => (
                    <div key={member.id} className="flex flex-col items-center">
                      <div className="relative">
                        <div className={`w-12 h-12 ${member.bgColor} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                          {member.avatar}
                        </div>
                        {member.checkedIn && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                            <Heart className="w-3 h-3 text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{member.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{member.tasksToday} tasks</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Your Check-In */}
              <div className="mb-6">
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                  rows={2}
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

              {/* Partner's Check-In */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{partnerCheckIn.name}'s Check-In</p>
                {partnerCheckIn.mood ? (
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                    <div className="text-3xl">{partnerCheckIn.mood}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Feeling {partnerCheckIn.moodLabel}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        "{partnerCheckIn.note}"
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{partnerCheckIn.time}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center">
                    <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Waiting for {partnerCheckIn.name} to check in today
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="bg-transparent rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Space Overview
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.tasks.total + stats.events.total + stats.reminders.total}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total Items
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.goals.completed}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Goals Completed
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.shopping.active}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Active Lists
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.meals.thisWeek}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Meals This Week
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}
