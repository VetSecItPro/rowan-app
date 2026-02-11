'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import nextDynamic from 'next/dynamic';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { checkInsService, type DailyCheckIn, type CheckInStats } from '@/lib/services/checkins-service';
import { reactionsService, type CheckInReaction } from '@/lib/services/reactions-service';
import { Tooltip } from '@/components/shared/Tooltip';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { logger } from '@/lib/logger';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
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
  ChevronRight,
  Zap,
  List,
  ChevronLeft,
  Trophy
} from 'lucide-react';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { InvitePartnerModal } from '@/components/spaces/InvitePartnerModal';
import { WelcomeWidget } from '@/components/dashboard/WelcomeWidget';
import { TodayAtAGlance } from '@/components/dashboard/TodayAtAGlance';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { format } from 'date-fns';
import { formatDate, formatTimestamp, getCurrentDateString } from '@/lib/utils/date-utils';
import { usePrefetchAllData } from '@/lib/hooks/usePrefetchData';

// Lazy-load heavy below-the-fold components to reduce First Load JS (FIX-034)
const ActivityFeed = nextDynamic(
  () => import('@/components/dashboard/ActivityFeed').then(mod => ({ default: mod.ActivityFeed })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-64" /> }
);

const CountdownWidget = nextDynamic(
  () => import('@/components/calendar/CountdownWidget').then(mod => ({ default: mod.CountdownWidget })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-48" /> }
);

const WeeklyInsights = nextDynamic(
  () => import('@/components/checkins/WeeklyInsights').then(mod => ({ default: mod.WeeklyInsights })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-32" /> }
);

const CheckInSuccess = nextDynamic(
  () => import('@/components/checkins/CheckInSuccess').then(mod => ({ default: mod.CheckInSuccess })),
  { ssr: false }
);

const PointsDisplay = nextDynamic(
  () => import('@/components/rewards').then(mod => ({ default: mod.PointsDisplay })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-48" /> }
);

const LeaderboardWidget = nextDynamic(
  () => import('@/components/rewards').then(mod => ({ default: mod.LeaderboardWidget })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-48" /> }
);


const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

// Mobile scroll animation variant - subtle fade + slide
const mobileCardAnimation = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      delay: index * 0.04, // Stagger based on index
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] // Smooth easing
    }
  })
};

// Animated card wrapper for mobile scroll animations
const AnimatedCard = memo(function AnimatedCard({
  children,
  index = 0
}: {
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      variants={mobileCardAnimation}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2, margin: "-50px" }}
      custom={index}
      className="h-full"
    >
      {children}
    </motion.div>
  );
});

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
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${colorClasses[color as keyof typeof colorClasses]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-400 mt-1">{percentage}% complete</p>
      )}
    </div>
  );
});

// Trend Indicator Component - Memoized
const TrendIndicator = memo(function TrendIndicator({ value, label }: { value: number; label: string }) {
  if (value === 0) return null;

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <div className={`flex items-center gap-1 text-xs ${colorClass} font-medium`}>
      <Icon className="w-3 h-3" />
      <span>{Math.abs(value)} {label}</span>
    </div>
  );
});

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, currentSpace, loading: authLoading, refreshSpaces } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Prefetch all feature data immediately for instant navigation to other pages
  usePrefetchAllData({ delay: 300 });

  // Handle ?invite=true query parameter from header dropdown
  useEffect(() => {
    if (searchParams?.get('invite') === 'true' && spaceId) {
      setShowInviteModal(true);
      // Remove the query param from URL without navigation
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, spaceId, router]);

  const { stats, loading: statsLoading, refreshStats } = useDashboardStats(user, currentSpace, authLoading);
  const loading = statsLoading;
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [checkInNote, setCheckInNote] = useState('');
  const [checkInHighlights, setCheckInHighlights] = useState('');
  const [checkInChallenges, setCheckInChallenges] = useState('');
  const [checkInGratitude, setCheckInGratitude] = useState('');
  const [recentCheckIns, setRecentCheckIns] = useState<DailyCheckIn[]>([]);
  const [checkInStats, setCheckInStats] = useState<CheckInStats | null>(null);
  const [checkInSaving, setCheckInSaving] = useState(false);
  const [checkInExpanded, setCheckInExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'checkin' | 'journal'>('checkin');
  const [journalView, setJournalView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [checkInReactions, setCheckInReactions] = useState<Record<string, CheckInReaction[]>>({});
  const [partnerReactionLoading, setPartnerReactionLoading] = useState(false);
  const [checkInEnergy, setCheckInEnergy] = useState<number | null>(null);
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false);
  const [lastCheckInMood, setLastCheckInMood] = useState<string>('');

  // Auth protection - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);


  // Real-time subscriptions

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

        // Load reactions for all check-ins
        const reactionsMap: Record<string, CheckInReaction[]> = {};
        await Promise.all(
          recent.map(async (checkIn) => {
            try {
              const reactions = await reactionsService.getReactionsForCheckIn(checkIn.id);
              reactionsMap[checkIn.id] = reactions;
            } catch (error) {
              logger.error('Failed to load reactions for check-in ${checkIn.id}:', error, { component: 'page', action: 'execution' });
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
          setCheckInEnergy(today.energy_level ?? null);
          setCheckInExpanded(true);
        }
      } catch (error) {
        logger.error('Failed to load check-ins:', error, { component: 'page', action: 'execution' });
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
      await checkInsService.createCheckIn(user.id, {
        space_id: currentSpace.id,
        mood: selectedMood,
        energy_level: checkInEnergy ?? undefined,
        note: checkInNote || undefined,
        highlights: checkInHighlights || undefined,
        challenges: checkInChallenges || undefined,
        gratitude: checkInGratitude || undefined,
      });

      // Store mood for success modal before clearing
      setLastCheckInMood(selectedMood);

      setSelectedMood(null);
      setCheckInNote('');
      setCheckInHighlights('');
      setCheckInChallenges('');
      setCheckInGratitude('');
      setCheckInEnergy(null);
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
      logger.error('Failed to create check-in:', error, { component: 'page', action: 'execution' });
    } finally {
      setCheckInSaving(false);
    }
  }, [selectedMood, checkInNote, checkInHighlights, checkInChallenges, checkInGratitude, checkInEnergy, user, currentSpace]);

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
      logger.error('Failed to send reaction:', error, { component: 'page', action: 'execution' });
    } finally {
      setPartnerReactionLoading(false);
    }
  }, [user]);

  // Show loading state while checking authentication
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading...</p>
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
        <PullToRefresh onRefresh={refreshStats}>
          <div className="min-h-screen p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
              {/* Time-Aware Welcome Widget */}
              <WelcomeWidget userName={user?.name ?? undefined} />


              {/* Today at a Glance - Shows today's events, tasks, meals, reminders */}
              {spaceId && (
                <TodayAtAGlance spaceId={spaceId} />
              )}

              {/* Enhanced Feature Cards - 8 Cards */}
              <div>

                {loading ? (
                  <div className="grid stats-grid-mobile gap-4 sm:gap-6">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="bg-gray-800/40 backdrop-blur-md border border-gray-700/20 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg animate-pulse">
                        <div className="h-28 sm:h-32 bg-gray-700 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid stats-grid-mobile gap-4 sm:gap-6">
                    {/* Tasks & Chores Card */}
                    <AnimatedCard index={0}>
                      <Link
                        href="/tasks"
                        className="group bg-gray-800/30 backdrop-blur-md border-2 border-gray-700/20 hover:border-blue-500 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col min-h-[340px] h-full"
                      >
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-blue-400">Tasks & Chores</h3>
                              {stats.tasks.trend !== 0 && <TrendIndicator value={stats.tasks.trend} label="this week" />}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl sm:text-3xl font-bold text-white">
                                {stats.tasks.pending}
                              </p>
                              <p className="text-sm text-gray-400">pending</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                            <CheckSquare className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{stats.tasks.pending} pending</span>
                            <span className="text-gray-400">{stats.tasks.inProgress} in progress</span>
                          </div>
                          {stats.tasks.dueToday > 0 && (
                            <p className="text-sm text-orange-400 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {stats.tasks.dueToday} due today
                            </p>
                          )}
                          {stats.tasks.overdue > 0 && (
                            <p className="text-sm text-red-400 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              {stats.tasks.overdue} overdue
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {stats.tasks.highPriority} high priority • {stats.tasks.assignedToMe} assigned to you
                          </p>
                        </div>

                        <ProgressBar value={stats.tasks.completed} max={stats.tasks.total} color="blue" />

                        {stats.tasks.recentTasks.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-xs text-gray-400 mb-2 font-medium">Recent:</p>
                            {stats.tasks.recentTasks.slice(0, 2).map(task => (
                              <p key={task.id} className="text-xs text-gray-300 truncate">
                                • {task.title}
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="mt-auto pt-3 flex items-center justify-end text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                          <span>View all</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    </AnimatedCard>

                    {/* Calendar Card */}
                    <AnimatedCard index={1}>
                      <Link
                        href="/calendar"
                        className="group bg-gray-800/30 backdrop-blur-md border-2 border-gray-700/20 hover:border-purple-500 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(168,85,247,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col min-h-[340px] h-full"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-purple-400">Calendar</h3>
                              {stats.events.trend !== 0 && <TrendIndicator value={stats.events.trend} label="this week" />}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl sm:text-3xl font-bold text-white">
                                {stats.events.upcoming}
                              </p>
                              <p className="text-sm text-gray-400">upcoming</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                            <Calendar className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{stats.events.today} today</span>
                            <span className="text-gray-400">{stats.events.thisWeek} this week</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {stats.events.personal} personal • {stats.events.shared} shared
                          </p>
                        </div>

                        {stats.events.nextEvent && (
                          <div className="p-3 bg-purple-900/20 rounded-lg mb-3">
                            <p className="text-xs text-purple-300 font-medium mb-1">Next event:</p>
                            <p className="text-sm text-white font-medium truncate">
                              {stats.events.nextEvent.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatTimestamp(stats.events.nextEvent.start_time, 'MMM d, h:mm a')}
                            </p>
                          </div>
                        )}

                        <div className="mt-auto pt-3 flex items-center justify-end text-purple-400 text-sm font-medium group-hover:gap-2 transition-all">
                          <span>View all</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    </AnimatedCard>

                    {/* Reminders Card */}
                    <AnimatedCard index={2}>
                      <Link
                        href="/reminders"
                        className="group bg-gray-800/30 backdrop-blur-md border-2 border-gray-700/20 hover:border-pink-500 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(236,72,153,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col min-h-[340px] h-full"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-pink-400">Reminders</h3>
                              {stats.reminders.trend !== 0 && <TrendIndicator value={stats.reminders.trend} label="this week" />}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl sm:text-3xl font-bold text-white">
                                {stats.reminders.active}
                              </p>
                              <p className="text-sm text-gray-400">active</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                            <Bell className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          {stats.reminders.overdue > 0 && (
                            <p className="text-sm text-red-400 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              {stats.reminders.overdue} overdue
                            </p>
                          )}
                          {stats.reminders.dueToday > 0 && (
                            <p className="text-sm text-pink-400 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {stats.reminders.dueToday} due today
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {stats.reminders.completed} completed • {stats.reminders.total} total
                          </p>
                        </div>

                        {stats.reminders.nextDue && (
                          <div className="p-3 bg-orange-900/20 rounded-lg mb-3">
                            <p className="text-xs text-orange-300 font-medium mb-1">Next due:</p>
                            <p className="text-sm text-white font-medium truncate">
                              {stats.reminders.nextDue.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatTimestamp(stats.reminders.nextDue.reminder_time, 'MMM d, h:mm a')}
                            </p>
                          </div>
                        )}

                        <div className="mt-auto pt-3 flex items-center justify-end text-orange-400 text-sm font-medium group-hover:gap-2 transition-all">
                          <span>View all</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    </AnimatedCard>

                    {/* Messages Card */}
                    <AnimatedCard index={3}>
                      <Link
                        href="/messages"
                        className="group bg-gray-800/30 backdrop-blur-md border-2 border-gray-700/20 hover:border-green-500 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(34,197,94,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col min-h-[340px] h-full"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-green-400">Messages</h3>
                              {stats.messages.trend !== 0 && <TrendIndicator value={stats.messages.trend} label="this week" />}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl sm:text-3xl font-bold text-white">
                                {stats.messages.total}
                              </p>
                              <p className="text-sm text-gray-400">total</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                            <MessageCircle className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{stats.messages.today} today</span>
                            <span className="text-gray-400">{stats.messages.conversations} conversations</span>
                          </div>
                          {stats.messages.unread > 0 && (
                            <p className="text-sm text-green-400 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              {stats.messages.unread} unread
                            </p>
                          )}
                        </div>

                        {stats.messages.lastMessage && (
                          <div className="p-3 bg-green-900/20 rounded-lg mb-3">
                            <p className="text-xs text-green-300 font-medium mb-1">
                              {stats.messages.lastMessage.sender}:
                            </p>
                            <p className="text-sm text-white truncate">
                              &quot;{stats.messages.lastMessage.content}&quot;
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTimestamp(stats.messages.lastMessage.created_at, 'h:mm a')}
                            </p>
                          </div>
                        )}

                        <div className="mt-auto pt-3 flex items-center justify-end text-green-400 text-sm font-medium group-hover:gap-2 transition-all">
                          <span>View all</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    </AnimatedCard>

                    {/* Shopping Card */}
                    <AnimatedCard index={4}>
                      <Link
                        href="/shopping"
                        className="group bg-gray-800/30 backdrop-blur-md border-2 border-gray-700/20 hover:border-teal-500 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(20,184,166,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col min-h-[340px] h-full"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-teal-400">Shopping</h3>
                              {stats.shopping.trend !== 0 && <TrendIndicator value={stats.shopping.trend} label="this week" />}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl sm:text-3xl font-bold text-white">
                                {stats.shopping.uncheckedItems}
                              </p>
                              <p className="text-sm text-gray-400">remaining</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                            <ShoppingCart className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{stats.shopping.totalLists} lists</span>
                            <span className="text-gray-400">{stats.shopping.activeLists} active</span>
                          </div>
                          <p className="text-sm text-teal-400 flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            {stats.shopping.checkedToday} checked today
                          </p>
                          <p className="text-xs text-gray-400">
                            {stats.shopping.uncheckedItems} items remaining
                          </p>
                        </div>

                        {stats.shopping.urgentList && (
                          <div className="p-3 bg-teal-900/20 rounded-lg mb-3">
                            <p className="text-xs text-teal-300 font-medium mb-1">Urgent:</p>
                            <p className="text-sm text-white font-medium truncate">
                              {stats.shopping.uncheckedItems} items for &quot;{stats.shopping.urgentList}&quot;
                            </p>
                          </div>
                        )}

                        <div className="mt-auto pt-3 flex items-center justify-end text-teal-400 text-sm font-medium group-hover:gap-2 transition-all">
                          <span>View all</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    </AnimatedCard>

                    {/* Meals Card */}
                    <AnimatedCard index={5}>
                      <Link
                        href="/meals"
                        className="group bg-gray-800/30 backdrop-blur-md border-2 border-gray-700/20 hover:border-orange-500 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(239,68,68,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col min-h-[340px] h-full"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-red-400">Meals</h3>
                              {stats.meals.trend !== 0 && <TrendIndicator value={stats.meals.trend} label="this week" />}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl sm:text-3xl font-bold text-white">
                                {stats.meals.thisWeek}
                              </p>
                              <p className="text-sm text-gray-400">this week</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                            <UtensilsCrossed className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{stats.meals.mealsToday} today</span>
                            <span className="text-gray-400">{stats.meals.thisWeek} this week</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {stats.meals.savedRecipes} saved recipes
                          </p>
                        </div>

                        {stats.meals.nextMeal && (
                          <div className="p-3 bg-red-900/20 rounded-lg mb-3">
                            <p className="text-xs text-red-300 font-medium mb-1">Next meal:</p>
                            <p className="text-sm text-white font-medium truncate">
                              {stats.meals.nextMeal.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatTimestamp(stats.meals.nextMeal.scheduled_date, 'MMM d, h:mm a')}
                            </p>
                          </div>
                        )}

                        <div className="mt-auto pt-3 flex items-center justify-end text-red-400 text-sm font-medium group-hover:gap-2 transition-all">
                          <span>View all</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    </AnimatedCard>

                    {/* Projects & Budget Card */}
                    <AnimatedCard index={6}>
                      <Link
                        href="/projects"
                        className="group bg-gray-800/30 backdrop-blur-md border-2 border-gray-700/20 hover:border-yellow-500 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(234,179,8,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col min-h-[340px] h-full"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-amber-400">Projects & Budget</h3>
                              {stats.projects.trend !== 0 && <TrendIndicator value={stats.projects.trend} label="this week" />}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl sm:text-3xl font-bold text-white">
                                {stats.projects.inProgress}
                              </p>
                              <p className="text-sm text-gray-400">active</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                            <Home className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{stats.projects.inProgress} in progress</span>
                            <span className="text-gray-400">{stats.projects.completed} completed</span>
                          </div>
                          {(stats.projects.planning > 0 || stats.projects.onHold > 0) && (
                            <p className="text-xs text-gray-400">
                              {stats.projects.planning} planning • {stats.projects.onHold} on hold
                            </p>
                          )}
                        </div>

                        <div className="p-3 bg-amber-900/20 rounded-lg mb-3">
                          <p className="text-xs text-amber-300 font-medium mb-1">Monthly Budget:</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white font-bold">
                              ${stats.household.spent.toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-400">
                              / ${stats.household.monthlyBudget.toLocaleString()}
                            </span>
                          </div>
                          <ProgressBar
                            value={stats.household.spent}
                            max={stats.household.monthlyBudget}
                            color="amber"
                            showLabel={false}
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            {stats.household.pendingBills} pending {stats.household.pendingBills === 1 ? 'bill' : 'bills'} • ${stats.projects.totalExpenses.toLocaleString()} total expenses
                          </p>
                        </div>

                        <div className="mt-auto pt-3 flex items-center justify-end text-amber-400 text-sm font-medium group-hover:gap-2 transition-all">
                          <span>View all</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    </AnimatedCard>

                    {/* Goals Card */}
                    <AnimatedCard index={7}>
                      <Link
                        href="/goals"
                        className="group bg-gray-800/30 backdrop-blur-md border-2 border-gray-700/20 hover:border-indigo-500 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(99,102,241,0.5)] hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col min-h-[340px] h-full"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base sm:text-lg font-bold text-indigo-400">Goals</h3>
                              {stats.goals.trend !== 0 && <TrendIndicator value={stats.goals.trend} label="this week" />}
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl sm:text-3xl font-bold text-white">
                                {stats.goals.active}
                              </p>
                              <p className="text-sm text-gray-400">active</p>
                            </div>
                          </div>
                          <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                            <Target className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">{stats.goals.inProgress} in progress</span>
                            <span className="text-gray-400">{stats.goals.completed} completed</span>
                          </div>
                        </div>

                        {stats.goals.topGoal && (
                          <div className="p-3 bg-indigo-900/20 rounded-lg mb-3">
                            <p className="text-xs text-indigo-300 font-medium mb-1">Top goal:</p>
                            <p className="text-sm text-white font-medium truncate mb-2">
                              {stats.goals.topGoal.title}
                            </p>
                            <ProgressBar
                              value={stats.goals.topGoal.progress}
                              max={100}
                              color="indigo"
                              showLabel={false}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              {stats.goals.topGoal.progress}% complete
                            </p>
                          </div>
                        )}

                        <div className="p-3 bg-indigo-900/20 rounded-lg mb-3">
                          <p className="text-xs text-indigo-300 font-medium mb-1">Overall progress:</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white font-bold">
                              {stats.goals.overallProgress}%
                            </span>
                          </div>
                          <ProgressBar
                            value={stats.goals.overallProgress}
                            max={100}
                            color="indigo"
                            showLabel={false}
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            {stats.goals.total} total goals
                          </p>
                        </div>

                        <div className="mt-auto pt-3 flex items-center justify-end text-indigo-400 text-sm font-medium group-hover:gap-2 transition-all">
                          <span>View all</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    </AnimatedCard>
                  </div>
                )}
              </div>

              {/* Real-time updates indicator */}
              <div className="flex items-center justify-end gap-2 text-xs sm:text-sm text-gray-400 -mt-2">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 animate-pulse" />
                <span>Real-time updates</span>
              </div>

              {/* Upcoming Events - Countdown Widget */}
              {spaceId && (
                <div className="mb-6">
                  <CountdownWidget
                    spaceId={spaceId}
                    maxItems={6}
                    onEventClick={(eventId) => router.push(`/calendar?event=${eventId}`)}
                    onAddCountdown={() => router.push('/calendar')}
                  />
                </div>
              )}

              {/* Daily Check-In & Activity Feed - Split Layout */}
              <motion.div
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:min-h-[600px]"
              >
                {/* Left: Daily Check-In */}
                <div
                  id="daily-checkin"
                  className="group bg-gradient-to-br from-pink-900/30 via-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(236,72,153,0.3)] border border-pink-500/20 hover:border-pink-400/50 transition-all duration-300 flex flex-col scroll-mt-24">
                  {/* Compact Header with Date, Toggle, and Streak Badge */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                        <h2 className="text-lg sm:text-xl font-bold text-white">Daily Check-In</h2>
                      </div>
                      <p className="text-xs text-gray-400 ml-7">{formatDate(getCurrentDateString(), 'EEEE, MMMM d, yyyy')}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mode Toggle - Compact Pill Design */}
                      <div className="flex items-center gap-0.5 p-0.5 bg-gray-800/50 rounded-full border border-gray-700">
                        <Tooltip content="Record your mood and share highlights">
                          <button
                            onClick={() => setViewMode('checkin')}
                            className={`px-2.5 py-1 rounded-full flex items-center justify-center gap-1 transition-all text-xs font-medium ${viewMode === 'checkin'
                              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white'
                              }`}
                          >
                            <Heart className="w-3 h-3" />
                            <span>Check In</span>
                          </button>
                        </Tooltip>
                        <Tooltip content="View your mood history and insights">
                          <button
                            onClick={() => setViewMode('journal')}
                            className={`px-2.5 py-1 rounded-full flex items-center justify-center gap-1 transition-all text-xs font-medium ${viewMode === 'journal'
                              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white'
                              }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Journal</span>
                          </button>
                        </Tooltip>
                      </div>

                      {/* Streak Badges - Stacked Vertically */}
                      {checkInStats && (
                        <div className="flex flex-col gap-1.5">
                          {/* Current Streak or Days Since Last Check-in */}
                          {checkInStats.currentStreak > 0 ? (
                            <Tooltip content={`You've checked in ${checkInStats.currentStreak} days in a row!${checkInStats.longestStreak > checkInStats.currentStreak ? ` Best: ${checkInStats.longestStreak} days` : ' This is your best streak!'}`}>
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-full cursor-help">
                                <Zap className="w-3.5 h-3.5 text-orange-500" />
                                <span className="text-sm font-bold text-orange-400">{checkInStats.currentStreak}</span>
                                <span className="text-xs text-gray-400">day streak</span>
                              </div>
                            </Tooltip>
                          ) : checkInStats.daysSinceLastCheckIn !== null && checkInStats.daysSinceLastCheckIn > 0 ? (
                            <Tooltip content={`Last check-in was ${checkInStats.daysSinceLastCheckIn} day${checkInStats.daysSinceLastCheckIn === 1 ? '' : 's'} ago. Check in today to restart your streak!${checkInStats.longestStreak > 0 ? ` Your best: ${checkInStats.longestStreak} days` : ''}`}>
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-gray-800/50 to-slate-800/50 rounded-full cursor-help border border-gray-700">
                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-sm font-bold text-gray-400">{checkInStats.daysSinceLastCheckIn}</span>
                                <span className="text-xs text-gray-500">day{checkInStats.daysSinceLastCheckIn === 1 ? '' : 's'} ago</span>
                              </div>
                            </Tooltip>
                          ) : (
                            <Tooltip content="Start your check-in streak today!">
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-full cursor-help whitespace-nowrap">
                                <Zap className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                <span className="text-xs text-gray-400">Start Streak</span>
                              </div>
                            </Tooltip>
                          )}

                          {/* Longest Streak Badge (show when there's a record) */}
                          {checkInStats.longestStreak > 0 && checkInStats.currentStreak === 0 && (
                            <Tooltip content={`Your best streak: ${checkInStats.longestStreak} consecutive days!`}>
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-full cursor-help">
                                <Trophy className="w-3.5 h-3.5 text-purple-500" />
                                <span className="text-sm font-bold text-purple-400">{checkInStats.longestStreak}</span>
                                <span className="text-xs text-gray-400">best</span>
                              </div>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Check-In Mode */}
                  {viewMode === 'checkin' && (
                    <>
                      {/* Partner Moods - Side by Side with Placeholder */}
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
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 backdrop-blur-md rounded-full border border-pink-700/50">
                                  <span className="text-xl">{userEmoji}</span>
                                  <span className="text-xs font-medium text-gray-300">You</span>
                                </div>
                              )}

                              {/* Partner mood or placeholder */}
                              {partnerEmoji && partnerToday ? (
                                <>
                                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 backdrop-blur-md rounded-full border border-purple-700/50">
                                    <span className="text-xl">{partnerEmoji}</span>
                                    <span className="text-xs font-medium text-gray-300">Partner</span>
                                  </div>

                                  {/* Reaction Buttons */}
                                  <div className="flex items-center gap-1">
                                    {checkInReactions[partnerToday.id]?.length > 0 ? (
                                      <div className="flex items-center gap-1 px-2 py-1 bg-pink-900/30 rounded-full border border-pink-700">
                                        <span className="text-sm">
                                          {checkInReactions[partnerToday.id][0].reaction_type === 'heart' && '❤️'}
                                          {checkInReactions[partnerToday.id][0].reaction_type === 'hug' && '🤗'}
                                          {checkInReactions[partnerToday.id][0].reaction_type === 'strength' && '💪'}
                                        </span>
                                        <span className="text-xs text-pink-400 font-medium">Sent</span>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleSendReaction(partnerToday.id, 'heart')}
                                          disabled={partnerReactionLoading}
                                          className="p-2 hover:bg-pink-900/30 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50"
                                          title="Send love"
                                        >
                                          <span className="text-lg">❤️</span>
                                        </button>
                                        <button
                                          onClick={() => handleSendReaction(partnerToday.id, 'hug')}
                                          disabled={partnerReactionLoading}
                                          className="p-2 hover:bg-purple-900/30 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50"
                                          title="Send hug"
                                        >
                                          <span className="text-lg">🤗</span>
                                        </button>
                                        <button
                                          onClick={() => handleSendReaction(partnerToday.id, 'strength')}
                                          disabled={partnerReactionLoading}
                                          className="p-2 hover:bg-blue-900/30 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50"
                                          title="Send strength"
                                        >
                                          <span className="text-lg">💪</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </>
                              ) : userEmoji ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/60 backdrop-blur-md rounded-full border border-gray-600/50">
                                  <span className="text-xl">💭</span>
                                  <span className="text-xs font-medium text-gray-400">Partner hasn&apos;t checked in yet</span>
                                </div>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>

                      {/* Elegant Mood Selector - Apple-Inspired Design */}
                      <div className="flex items-center justify-center gap-3 sm:gap-4 w-full mb-3">
                        {moodOptions.map((mood) => {
                          // Color schemes for each mood (Apple Health-inspired gradients)
                          const moodStyles = {
                            great: {
                              gradient: 'from-green-400 to-emerald-500',
                              glow: 'shadow-green-500/30',
                              ring: 'ring-green-400/50',
                              bgActive: 'bg-gradient-to-br from-green-900/40 to-emerald-900/40',
                              bgHover: 'bg-gradient-to-br from-green-900/20 to-emerald-900/20'
                            },
                            good: {
                              gradient: 'from-blue-400 to-cyan-500',
                              glow: 'shadow-blue-500/30',
                              ring: 'ring-blue-400/50',
                              bgActive: 'bg-gradient-to-br from-blue-900/40 to-cyan-900/40',
                              bgHover: 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20'
                            },
                            okay: {
                              gradient: 'from-gray-400 to-slate-500',
                              glow: 'shadow-gray-500/30',
                              ring: 'ring-gray-400/50',
                              bgActive: 'bg-gradient-to-br from-gray-800/60 to-slate-800/60',
                              bgHover: 'bg-gradient-to-br from-gray-800/40 to-slate-800/40'
                            },
                            meh: {
                              gradient: 'from-amber-400 to-orange-500',
                              glow: 'shadow-amber-500/30',
                              ring: 'ring-amber-400/50',
                              bgActive: 'bg-gradient-to-br from-amber-900/40 to-orange-900/40',
                              bgHover: 'bg-gradient-to-br from-amber-900/20 to-orange-900/20'
                            },
                            rough: {
                              gradient: 'from-purple-400 to-pink-500',
                              glow: 'shadow-purple-500/30',
                              ring: 'ring-purple-400/50',
                              bgActive: 'bg-gradient-to-br from-purple-900/40 to-pink-900/40',
                              bgHover: 'bg-gradient-to-br from-purple-900/20 to-pink-900/20'
                            }
                          };

                          const style = moodStyles[mood.value as keyof typeof moodStyles];
                          const isSelected = selectedMood === mood.value;

                          return (
                            <Tooltip key={mood.value} content={`I'm feeling ${mood.label.toLowerCase()} today`} position="top">
                              <button
                                onClick={() => handleMoodSelect(mood.value)}
                                className={`group relative flex flex-col items-center gap-2 transition-all duration-300 transform ${isSelected ? 'scale-125' : 'hover:scale-150 active:scale-110'
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
                                    ? 'opacity-100 text-white'
                                    : 'opacity-0 sm:group-hover:opacity-70 text-gray-400'
                                  }
                      `}>
                                  {mood.label}
                                </span>
                              </button>
                            </Tooltip>
                          );
                        })}
                      </div>

                      {/* Quick Preview Section - Show today's check-in if exists */}
                      {(() => {
                        const today = getCurrentDateString();
                        const todayCheckIn = recentCheckIns.find(c => c.user_id === user?.id && c.date === today);
                        const last7Days = recentCheckIns.filter(c => c.user_id === user?.id).slice(0, 7);

                        if (todayCheckIn && !selectedMood) {
                          return (
                            <div className="mt-4 p-4 bg-gradient-to-br from-gray-800/60 to-purple-900/20 backdrop-blur-sm rounded-xl border border-purple-700/30">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{moodOptions.find(m => m.value === todayCheckIn.mood)?.emoji}</span>
                                  <div>
                                    <p className="text-sm font-semibold text-white">
                                      Feeling {moodOptions.find(m => m.value === todayCheckIn.mood)?.label} today
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Checked in {formatTimestamp(todayCheckIn.created_at, 'h:mm a')}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedMood(todayCheckIn.mood as typeof selectedMood);
                                    setCheckInExpanded(true);
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-900/30 rounded-lg transition-colors"
                                >
                                  Update
                                </button>
                              </div>

                              {/* Show gratitude/highlights if exists */}
                              {todayCheckIn.gratitude && (
                                <div className="mt-3 p-3 bg-pink-900/20 rounded-lg border border-pink-700/30">
                                  <p className="text-xs font-medium text-pink-300 mb-1 flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    Grateful for:
                                  </p>
                                  <p className="text-sm text-gray-300">{todayCheckIn.gratitude}</p>
                                </div>
                              )}

                              {todayCheckIn.highlights && (
                                <div className="mt-2 p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/30">
                                  <p className="text-xs font-medium text-yellow-300 mb-1 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Highlight:
                                  </p>
                                  <p className="text-sm text-gray-300">{todayCheckIn.highlights}</p>
                                </div>
                              )}

                              {todayCheckIn.energy_level && (
                                <div className="mt-2 p-3 bg-amber-900/20 rounded-lg border border-amber-700/30">
                                  <p className="text-xs font-medium text-amber-300 mb-1.5 flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    Energy
                                  </p>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                      <div
                                        key={level}
                                        className={`h-3 flex-1 rounded-sm transition-colors ${
                                          level <= todayCheckIn.energy_level!
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                                            : 'bg-gray-700/50'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // If not checked in today, show 7-day mood trend
                        if (!todayCheckIn && last7Days.length > 0) {
                          return (
                            <div className="mt-4 p-4 bg-gradient-to-br from-gray-800/60 to-blue-900/20 backdrop-blur-sm rounded-xl border border-blue-700/30">
                              <p className="text-xs font-medium text-gray-400 mb-3">
                                Your mood over the last 7 days
                              </p>
                              <div className="flex items-end justify-between gap-1 h-16 mb-2">
                                {last7Days.reverse().map((checkIn, idx) => {
                                  const moodColors: Record<string, string> = {
                                    great: 'bg-green-500',
                                    good: 'bg-blue-500',
                                    okay: 'bg-gray-400',
                                    meh: 'bg-amber-500',
                                    rough: 'bg-purple-500'
                                  };
                                  const moodHeights: Record<string, string> = {
                                    great: 'h-full',
                                    good: 'h-4/5',
                                    okay: 'h-3/5',
                                    meh: 'h-2/5',
                                    rough: 'h-1/5'
                                  };
                                  return (
                                    <div key={idx} className="flex-1">
                                      <div className={`w-full ${moodHeights[checkIn.mood]} ${moodColors[checkIn.mood]} rounded-t transition-all hover:opacity-80`} />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })()}

                      {/* Smart Conditional Expansion */}
                      {checkInExpanded && selectedMood && (
                        <div className="space-y-3 mt-4 animate-expand overflow-hidden">
                          {/* Energy Level Selector */}
                          <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              Energy (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-7 shrink-0">Low</span>
                              <div className="flex items-end gap-1 flex-1">
                                {[1, 2, 3, 4, 5].map((level) => {
                                  const isActive = checkInEnergy !== null && level <= checkInEnergy;
                                  const heights = ['h-4', 'h-5', 'h-6', 'h-7', 'h-8'];
                                  return (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => setCheckInEnergy(checkInEnergy === level ? null : level)}
                                      className={`flex-1 rounded-md transition-all duration-200 ${heights[level - 1]} ${
                                        isActive
                                          ? 'bg-gradient-to-t from-amber-600 to-orange-400 shadow-sm shadow-amber-500/30'
                                          : 'bg-gray-700/60 hover:bg-gray-600/60'
                                      }`}
                                      aria-label={`Energy level ${level}`}
                                    />
                                  );
                                })}
                              </div>
                              <span className="text-xs text-gray-500 w-8 shrink-0 text-right">High</span>
                            </div>
                          </div>

                          {/* Positive moods: Great/Good → Gratitude/Highlights prompt */}
                          {(selectedMood === 'great' || selectedMood === 'good') && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                                  What went well today? (Optional)
                                </label>
                                <textarea
                                  placeholder="Share a win, big or small..."
                                  value={checkInHighlights}
                                  onChange={(e) => setCheckInHighlights(e.target.value)}
                                  maxLength={150}
                                  className="w-full px-3 py-2 bg-gray-900 border border-green-800 rounded-xl resize-none focus:outline-none focus:border-green-500 text-white text-sm transition-all"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                  <Heart className="w-3.5 h-3.5 text-pink-500" />
                                  What are you grateful for? (Optional)
                                </label>
                                <textarea
                                  placeholder="One thing you appreciate today..."
                                  value={checkInGratitude}
                                  onChange={(e) => setCheckInGratitude(e.target.value)}
                                  maxLength={150}
                                  className="w-full px-3 py-2 bg-gray-900 border border-pink-800 rounded-xl resize-none focus:outline-none focus:border-pink-500 text-white text-sm transition-all"
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}

                          {/* Negative moods: Meh/Rough → Support/Challenges prompt */}
                          {(selectedMood === 'meh' || selectedMood === 'rough') && (
                            <div>
                              <label className="text-sm font-medium text-gray-300 mb-1.5 block flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5 text-blue-500" />
                                What&apos;s been challenging? (Optional)
                              </label>
                              <p className="text-xs text-blue-400 mb-2 italic">
                                It&apos;s okay to not be okay. You&apos;re not alone.
                              </p>
                              <textarea
                                placeholder="Share what&apos;s on your mind..."
                                value={checkInChallenges}
                                onChange={(e) => setCheckInChallenges(e.target.value)}
                                maxLength={150}
                                className="w-full px-3 py-2 bg-gray-900 border border-blue-800 rounded-xl resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white text-sm transition-all"
                                rows={2}
                              />
                            </div>
                          )}

                          {/* Neutral mood: Okay → Optional note */}
                          {selectedMood === 'okay' && (
                            <div>
                              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                                Anything on your mind? (Optional)
                              </label>
                              <textarea
                                placeholder="Share your thoughts..."
                                value={checkInNote}
                                onChange={(e) => setCheckInNote(e.target.value)}
                                maxLength={150}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-white text-sm transition-all"
                                rows={2}
                              />
                            </div>
                          )}

                          {/* Submit Button */}
                          <div className="flex justify-end">
                            <button
                              onClick={handleCheckIn}
                              disabled={checkInSaving}
                              className={`px-5 py-2 rounded-full text-white text-sm font-semibold transition-all transform flex items-center gap-2 ${!checkInSaving
                                ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 hover:scale-105 shadow-md'
                                : 'bg-gray-700 cursor-not-allowed opacity-50'
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
                      <div className="inline-flex items-center gap-1 p-1 bg-gradient-to-r from-pink-900/30 to-purple-900/30 rounded-lg border border-pink-700">
                        <button
                          onClick={() => setJournalView('calendar')}
                          className={`px-2 sm:px-3 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all font-medium ${journalView === 'calendar'
                            ? 'bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white shadow-md'
                            : 'text-gray-300 hover:bg-gray-800/50'
                            }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs">Calendar</span>
                        </button>
                        <button
                          onClick={() => setJournalView('list')}
                          className={`px-2 sm:px-3 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all font-medium ${journalView === 'list'
                            ? 'bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white shadow-md'
                            : 'text-gray-300 hover:bg-gray-800/50'
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
                              className="p-2 hover:bg-pink-900/30 rounded-lg transition-colors"
                            >
                              <ChevronLeft className="w-5 h-5 text-gray-300" />
                            </button>
                            <h3 className="text-lg font-semibold text-white">
                              {format(calendarMonth, 'MMMM yyyy')}
                            </h3>
                            <button
                              onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                              className="p-2 hover:bg-pink-900/30 rounded-lg transition-colors"
                            >
                              <ChevronRight className="w-5 h-5 text-gray-300" />
                            </button>
                          </div>

                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                            {/* Day Headers */}
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                              <div key={day} className="text-center text-xs font-semibold text-gray-400 py-1 sm:py-2">
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
                                    className={`aspect-square p-0.5 sm:p-1 rounded border sm:rounded-lg transition-all ${isToday
                                      ? 'border-pink-500 bg-pink-900/20'
                                      : 'border-gray-700 hover:border-pink-600'
                                      }`}
                                  >
                                    <div className="text-[10px] sm:text-xs text-gray-300 font-medium mb-0.5">
                                      {day}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      {dayCheckIns.map((checkIn, idx) => {
                                        const moodEmoji = moodOptions.find(m => m.value === checkIn.mood)?.emoji;
                                        const isUser = checkIn.user_id === user?.id;
                                        return (
                                          <div
                                            key={idx}
                                            className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] sm:text-[10px] ${isUser
                                              ? 'bg-pink-900/40 border border-pink-700/50'
                                              : 'bg-purple-900/40 border border-purple-700/50'
                                              }`}
                                            title={isUser ? 'You' : 'Partner'}
                                          >
                                            <span className="text-sm sm:text-base leading-none">{moodEmoji}</span>
                                            <span className="text-[9px] sm:text-[10px] text-gray-300 truncate font-medium">
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
                              <Heart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                              <p className="text-sm text-gray-400">No check-ins yet</p>
                              <p className="text-xs text-gray-500 mt-1">Start checking in to build your journal</p>
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
                                  <div className="sticky top-0 bg-gradient-to-r from-pink-900/40 to-purple-900/40 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-pink-700/50">
                                    <p className="text-xs sm:text-sm font-semibold text-white">
                                      {formatDate(date, 'EEEE, MMMM d, yyyy')}
                                    </p>
                                  </div>

                                  {/* Check-ins for this date */}
                                  {groupedByDate[date].map((checkIn) => {
                                    const moodEmoji = moodOptions.find(m => m.value === checkIn.mood)?.emoji;
                                    const isUser = checkIn.user_id === user?.id;
                                    return (
                                      <div key={checkIn.id} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700 ml-2">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex items-center gap-3">
                                            <span className="text-3xl sm:text-4xl">{moodEmoji}</span>
                                            <div>
                                              <p className="text-sm font-semibold text-white">
                                                {isUser ? 'You' : 'Partner'}
                                              </p>
                                              <p className="text-xs text-gray-400">
                                                {moodOptions.find(m => m.value === checkIn.mood)?.label}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        {checkIn.energy_level && (
                                          <div className="mt-2 mb-1">
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <Zap className="w-3 h-3 text-amber-500" />
                                              <p className="text-xs font-semibold text-gray-300">Energy</p>
                                            </div>
                                            <div className="flex items-center gap-0.5 ml-5 max-w-32">
                                              {[1, 2, 3, 4, 5].map((level) => (
                                                <div
                                                  key={level}
                                                  className={`h-2 flex-1 rounded-sm ${
                                                    level <= checkIn.energy_level!
                                                      ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                                                      : 'bg-gray-700/50'
                                                  }`}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {checkIn.highlights && (
                                          <div className="mt-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <Sparkles className="w-3 h-3 text-yellow-500" />
                                              <p className="text-xs font-semibold text-gray-300">Highlights</p>
                                            </div>
                                            <p className="text-sm text-gray-400 ml-5">{checkIn.highlights}</p>
                                          </div>
                                        )}
                                        {checkIn.challenges && (
                                          <div className="mt-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <Heart className="w-3 h-3 text-blue-500" />
                                              <p className="text-xs font-semibold text-gray-300">Challenges</p>
                                            </div>
                                            <p className="text-sm text-gray-400 ml-5">{checkIn.challenges}</p>
                                          </div>
                                        )}
                                        {checkIn.gratitude && (
                                          <div className="mt-3">
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <Heart className="w-3 h-3 text-pink-500" />
                                              <p className="text-xs font-semibold text-gray-300">Grateful For</p>
                                            </div>
                                            <p className="text-sm text-gray-400 ml-5">{checkIn.gratitude}</p>
                                          </div>
                                        )}
                                        {checkIn.note && (
                                          <div className="mt-3">
                                            <p className="text-xs font-semibold text-gray-300 mb-1">Note</p>
                                            <p className="text-sm text-gray-400">{checkIn.note}</p>
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

                {/* Right: Activity Feed */}
                <div className="group bg-gradient-to-br from-slate-900/30 via-gray-900/20 to-stone-900/10 backdrop-blur-sm rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-[0_20px_50px_rgba(148,163,184,0.3)] border border-gray-500/20 hover:border-gray-400/50 transition-all duration-300 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg sm:text-xl font-bold text-white">Recent Activity</h2>
                  </div>

                  {/* Activity Feed Component - Scrollable */}
                  <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2 custom-scrollbar">
                    {currentSpace && <ActivityFeed spaceId={currentSpace.id} limit={50} />}
                  </div>
                </div>
              </motion.div>

              {/* Rewards Section - Points & Leaderboard */}
              {spaceId && user && (
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PointsDisplay
                    userId={user.id}
                    spaceId={spaceId}
                    variant="full"
                    showStreak={true}
                  />
                  <LeaderboardWidget
                    spaceId={spaceId}
                    currentUserId={user.id}
                    period="week"
                    maxEntries={5}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Space Management Modals */}
          <CreateSpaceModal
            isOpen={showCreateSpaceModal}
            onClose={() => setShowCreateSpaceModal(false)}
            onSpaceCreated={() => {
              refreshSpaces();
              setShowCreateSpaceModal(false);
            }}
          />

          {spaceId && (
            <InvitePartnerModal
              isOpen={showInviteModal}
              onClose={() => setShowInviteModal(false)}
              spaceId={spaceId}
              spaceName={currentSpace?.name || ''}
            />
          )}

          {/* Check-In Success Modal */}
          <CheckInSuccess
            isOpen={showCheckInSuccess}
            onClose={() => setShowCheckInSuccess(false)}
            mood={lastCheckInMood}
            streak={checkInStats?.currentStreak || 0}
          />
        </PullToRefresh>
      </FeatureLayout>
    </PageErrorBoundary>
  );
}
