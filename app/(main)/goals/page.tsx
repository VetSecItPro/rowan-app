'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Target, Search, Plus, CheckCircle2, TrendingUp, Award, LayoutGrid, List, Sparkles, MessageCircle, GitBranch, X, BarChart3, Calendar, MoreHorizontal, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { GoalCard } from '@/components/goals/GoalCard';
import { SortableGoalsList } from '@/components/goals/SortableGoalsList';
import { MilestoneCard } from '@/components/goals/MilestoneCard';
import dynamicImport from 'next/dynamic';

// Dynamic imports for heavy modal components (load only when opened)
const NewGoalModal = dynamicImport(() => import('@/components/goals/NewGoalModal').then(mod => ({ default: mod.NewGoalModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-white dark:bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const NewMilestoneModal = dynamicImport(() => import('@/components/goals/NewMilestoneModal').then(mod => ({ default: mod.NewMilestoneModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-white dark:bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const NewHabitModal = dynamicImport(() => import('@/components/goals/NewHabitModal').then(mod => ({ default: mod.NewHabitModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-white dark:bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const TemplateSelectionModal = dynamicImport(() => import('@/components/goals/TemplateSelectionModal').then(mod => ({ default: mod.TemplateSelectionModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-white dark:bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const GoalCheckInModal = dynamicImport(() => import('@/components/goals/GoalCheckInModal').then(mod => ({ default: mod.GoalCheckInModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-white dark:bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

const CheckInFrequencyModal = dynamicImport(() => import('@/components/goals/CheckInFrequencyModal').then(mod => ({ default: mod.CheckInFrequencyModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="bg-white dark:bg-gray-800 rounded-lg p-4">Loading...</div></div>
});

// Dynamic imports for heavy view components (load only when active)
const CheckInHistoryTimeline = dynamicImport(() => import('@/components/goals/CheckInHistoryTimeline').then(mod => ({ default: mod.CheckInHistoryTimeline })), {
  loading: () => <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
});

const ActivityFeed = dynamicImport(() => import('@/components/goals/ActivityFeed').then(mod => ({ default: mod.ActivityFeed })), {
  loading: () => <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
});

const HabitTracker = dynamicImport(() => import('@/components/goals/HabitTracker').then(mod => ({ default: mod.HabitTracker })), {
  loading: () => <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
});

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { GoalCardSkeleton, MilestoneCardSkeleton, StatsCardSkeleton } from '@/components/ui/Skeleton';

const BadgesWidget = dynamicImport(() => import('@/components/goals/badges/BadgesWidget'), {
  loading: () => <div className="p-4 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
});

import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { goalsService, Goal, CreateGoalInput, Milestone, CreateMilestoneInput, GoalTemplate, CreateCheckInInput } from '@/lib/services/goals-service';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { usePresence } from '@/lib/hooks/usePresence';
import { OnlineUsersIndicator, PresenceIndicator } from '@/components/shared/PresenceIndicator';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';

type ViewMode = 'goals' | 'milestones' | 'habits' | 'activity';

export default function GoalsPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const goalsRef = useRef<Goal[]>([]);
  const userActionsRef = useRef<Set<string>>(new Set()); // Track user-initiated actions
  const [loading, setLoading] = useState(true);
  const [spaceMembers, setSpaceMembers] = useState<Array<{ id: string; name: string; email: string; avatar_url?: string }>>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('goals');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isHistoryTimelineOpen, setIsHistoryTimelineOpen] = useState(false);
  const [isFrequencyModalOpen, setIsFrequencyModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [editingHabit, setEditingHabit] = useState<any | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [checkInGoal, setCheckInGoal] = useState<Goal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);
  const [frequencyGoal, setFrequencyGoal] = useState<Goal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned-to-me' | 'unassigned'>('all');
  const [focusMode, setFocusMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; action: 'delete-goal' | 'delete-milestone'; id: string }>({ isOpen: false, action: 'delete-goal', id: '' });

  // Presence tracking for collaborative editing
  const { onlineUsers, getUsersViewingGoal, updateViewingGoal } = usePresence({
    channelName: 'goals-presence',
    spaceId: spaceId || '',
    userId: user?.id || '',
    userEmail: user?.email,
  });

  // Memoized filtered goals with search, status, assignment, and focus mode
  const filteredGoals = useMemo(() => {
    let filtered = goals;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(g => {
        if (statusFilter === 'active') return g.status === 'active';
        if (statusFilter === 'completed') return g.status === 'completed';
        return true;
      });
    }

    // Apply assignment filter
    if (assignmentFilter !== 'all') {
      filtered = filtered.filter(g => {
        if (assignmentFilter === 'assigned-to-me') return g.assigned_to === user?.id;
        if (assignmentFilter === 'unassigned') return !g.assigned_to;
        return true;
      });
    }

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(lowerQuery) ||
        g.description?.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply focus mode - show only top 3 goals (pinned + highest priority)
    if (focusMode && filtered.length > 3) {
      filtered = filtered.slice(0, 3);
    }

    return filtered;
  }, [goals, searchQuery, statusFilter, assignmentFilter, focusMode, user?.id]);

  // Memoized filtered milestones with search
  const filteredMilestones = useMemo(() => {
    if (!searchQuery) return milestones;

    const lowerQuery = searchQuery.toLowerCase();
    return milestones.filter(m =>
      m.title.toLowerCase().includes(lowerQuery) ||
      m.description?.toLowerCase().includes(lowerQuery)
    );
  }, [milestones, searchQuery]);

  // Memoized stats calculation
  const stats = useMemo(() => {
    const active = goals.filter(g => g.status === 'active').length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const inProgress = goals.filter(g => g.status === 'active' && g.progress > 0 && g.progress < 100).length;
    const milestonesReached = milestones.filter(m => m.completed).length;

    return { active, completed, inProgress, milestonesReached };
  }, [goals, milestones]);

  // Keep goalsRef in sync with goals state
  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpace]);

  // Real-time subscription for goals and milestones
  useEffect(() => {
    if (!currentSpace) return;

    const supabase = createClient();

    // Subscribe to goals changes
    const goalsChannel = supabase
      .channel('goals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `space_id=eq.${currentSpace.id}`
        },
        (payload) => {
          const goalId = (payload.new as any)?.id || (payload.old as any)?.id;
          const isUserAction = goalId && userActionsRef.current.has(goalId);

          if (payload.eventType === 'INSERT') {
            const newGoal = payload.new as Goal;
            setGoals(prev => [...prev, newGoal]);
            if (!isUserAction) {
              toast.info(`New goal added: ${newGoal.title}`);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedGoal = payload.new as Goal;
            setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
            if (!isUserAction) {
              toast.info(`Goal updated: ${updatedGoal.title}`);
            }
            // Clean up action tracking
            if (goalId) userActionsRef.current.delete(goalId);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setGoals(prev => prev.filter(g => g.id !== deletedId));
            if (!isUserAction) {
              toast.info('A goal was removed');
            }
            if (deletedId) userActionsRef.current.delete(deletedId);
          }
        }
      )
      .subscribe();

    // Subscribe to milestones changes
    // Note: goal_milestones doesn't have space_id, so we check if the milestone belongs to a goal in current space
    const milestonesChannel = supabase
      .channel('milestones-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goal_milestones'
        },
        (payload) => {
          // Check if milestone belongs to a goal in current space
          const belongsToCurrentSpace = (milestone: Milestone) => {
            return goalsRef.current.some(g => g.id === milestone.goal_id);
          };

          const milestoneId = (payload.new as any)?.id || (payload.old as any)?.id;
          const isUserAction = milestoneId && userActionsRef.current.has(milestoneId);

          if (payload.eventType === 'INSERT') {
            const newMilestone = payload.new as Milestone;
            if (belongsToCurrentSpace(newMilestone)) {
              setMilestones(prev => [...prev, newMilestone]);
              if (!isUserAction) {
                toast.info(`New milestone added: ${newMilestone.title}`);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMilestone = payload.new as Milestone;
            if (belongsToCurrentSpace(updatedMilestone)) {
              setMilestones(prev => prev.map(m => m.id === updatedMilestone.id ? updatedMilestone : m));
              if (!isUserAction) {
                toast.info(`Milestone updated: ${updatedMilestone.title}`);
              }
            }
            if (milestoneId) userActionsRef.current.delete(milestoneId);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMilestones(prev => prev.filter(m => m.id !== deletedId));
            if (!isUserAction) {
              toast.info('A milestone was removed');
            }
            if (deletedId) userActionsRef.current.delete(deletedId);
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(goalsChannel);
      supabase.removeChannel(milestonesChannel);
    };
  }, [currentSpace]);

  const loadData = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const [goalsData, milestonesData, membersResult] = await Promise.all([
        goalsService.getGoals(currentSpace.id),
        goalsService.getAllMilestones(currentSpace.id),
        supabase
          .from('space_members')
          .select('user:users(id, name, email, avatar_url)')
          .eq('space_id', currentSpace.id)
      ]);

      setGoals(goalsData);
      setMilestones(milestonesData);

      // Map space members data
      if (membersResult.data) {
        const members = membersResult.data
          .map((m: any) => m.user)
          .filter((u: any) => u != null);
        setSpaceMembers(members);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  const handleCreateGoal = useCallback(async (goalData: CreateGoalInput) => {
    try {
      if (editingGoal) {
        await goalsService.updateGoal(editingGoal.id, goalData);
        // Real-time subscription will handle the update
      } else {
        // Optimistic update - add to UI immediately
        const optimisticGoal: Goal = {
          id: `temp-${Date.now()}`, // Temporary ID
          title: goalData.title,
          status: goalData.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          space_id: goalData.space_id,
          description: goalData.description || undefined,
          category: goalData.category || undefined,
          target_date: goalData.target_date || undefined,
          progress: 0,
          completed_at: undefined,
          created_by: user?.id || '',
        };

        setGoals(prev => [optimisticGoal, ...prev]);

        try {
          await goalsService.createGoal(goalData);
          // Real-time subscription will replace the optimistic goal with the real one
        } catch (error) {
          // Revert optimistic update on error
          setGoals(prev => prev.filter(goal => goal.id !== optimisticGoal.id));
          throw error;
        }
      }
      setEditingGoal(null);
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  }, [editingGoal, setGoals, user]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-goal', id: goalId });
  }, []);

  const handleCreateMilestone = useCallback(async (milestoneData: CreateMilestoneInput) => {
    try {
      if (editingMilestone) {
        await goalsService.updateMilestone(editingMilestone.id, milestoneData);
      } else {
        await goalsService.createMilestone(milestoneData);
      }
      loadData();
      setEditingMilestone(null);
    } catch (error) {
      console.error('Failed to save milestone:', error);
    }
  }, [editingMilestone, loadData]);

  const handleCreateHabit = useCallback(async (habitData: any) => {
    try {
      // TODO: Implement habit creation service when backend is ready
      console.log('Creating habit:', habitData);
      toast.success('Habit created successfully!');

      // For now, just close the modal
      setEditingHabit(null);
    } catch (error) {
      console.error('Failed to save habit:', error);
      toast.error('Failed to create habit. Please try again.');
    }
  }, [editingHabit]);

  const handleCreateCheckIn = useCallback(async (checkInData: CreateCheckInInput) => {
    try {
      await goalsService.createCheckIn(checkInData);
      toast.success('Check-in saved successfully!');
      loadData(); // Reload to update goal progress
    } catch (error) {
      console.error('Failed to save check-in:', error);
      toast.error('Failed to save check-in. Please try again.');
    }
  }, [loadData]);

  const handleDeleteMilestone = useCallback(async (milestoneId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-milestone', id: milestoneId });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const { action, id } = confirmDialog;
    setConfirmDialog({ isOpen: false, action: 'delete-goal', id: '' });

    // Optimistic update - remove from UI immediately
    if (action === 'delete-goal') {
      setGoals(prev => prev.filter(goal => goal.id !== id));
    } else if (action === 'delete-milestone') {
      setMilestones(prev => prev.filter(milestone => milestone.id !== id));
    }

    try {
      if (action === 'delete-goal') {
        await goalsService.deleteGoal(id);
      } else if (action === 'delete-milestone') {
        await goalsService.deleteMilestone(id);
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      // Revert optimistic update on error
      loadData();
    }
  }, [confirmDialog, loadData]);

  const handleToggleMilestone = useCallback(async (milestoneId: string, completed: boolean) => {
    // Mark as user action
    userActionsRef.current.add(milestoneId);

    // Optimistic update
    const previousMilestones = milestones;
    setMilestones(prev => prev.map(m =>
      m.id === milestoneId
        ? { ...m, completed, completed_at: completed ? new Date().toISOString() : undefined }
        : m
    ));

    try {
      await goalsService.toggleMilestone(milestoneId, completed);
      // Real-time subscription will handle the update
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
      // Revert on error
      setMilestones(previousMilestones);
      userActionsRef.current.delete(milestoneId);
    }
  }, [milestones]);

  const handleGoalStatusChange = useCallback(async (goalId: string, status: 'not-started' | 'in-progress' | 'completed') => {
    const statusMap = {
      'not-started': 'active' as const,
      'in-progress': 'active' as const,
      'completed': 'completed' as const,
    };
    const progressMap = {
      'not-started': 0,
      'in-progress': 50,
      'completed': 100,
    };

    // Mark as user action
    userActionsRef.current.add(goalId);

    // Optimistic update
    const previousGoals = goals;
    setGoals(prev => prev.map(g =>
      g.id === goalId
        ? { ...g, status: statusMap[status], progress: progressMap[status] }
        : g
    ));

    try {
      await goalsService.updateGoal(goalId, {
        status: statusMap[status],
        progress: progressMap[status],
      });
      // Real-time subscription will handle the update
    } catch (error) {
      console.error('Failed to update goal status:', error);
      // Revert on error
      setGoals(previousGoals);
      userActionsRef.current.delete(goalId);
    }
  }, [goals]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchTyping(true);
    setTimeout(() => setIsSearchTyping(false), 300);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleOpenGoalModal = useCallback(() => {
    setIsGoalModalOpen(true);
  }, []);

  const handleOpenMilestoneModal = useCallback(() => {
    setIsMilestoneModalOpen(true);
  }, []);

  const handleCloseGoalModal = useCallback(() => {
    setIsGoalModalOpen(false);
    setEditingGoal(null);
    setSelectedTemplate(null);
  }, []);

  const handleCloseMilestoneModal = useCallback(() => {
    setIsMilestoneModalOpen(false);
    setEditingMilestone(null);
  }, []);

  const handleOpenHabitModal = useCallback(() => {
    setIsHabitModalOpen(true);
  }, []);

  const handleCloseHabitModal = useCallback(() => {
    setIsHabitModalOpen(false);
    setEditingHabit(null);
  }, []);

  const handleOpenCheckInModal = useCallback((goal: Goal) => {
    setCheckInGoal(goal);
    setIsCheckInModalOpen(true);
  }, []);

  const handleCloseCheckInModal = useCallback(() => {
    setIsCheckInModalOpen(false);
    setCheckInGoal(null);
  }, []);

  const handleOpenHistoryTimeline = useCallback((goal: Goal) => {
    setHistoryGoal(goal);
    setIsHistoryTimelineOpen(true);
  }, []);

  const handleCloseHistoryTimeline = useCallback(() => {
    setIsHistoryTimelineOpen(false);
    setHistoryGoal(null);
  }, []);

  const handleOpenFrequencyModal = useCallback((goal: Goal) => {
    setFrequencyGoal(goal);
    setIsFrequencyModalOpen(true);
  }, []);

  const handleCloseFrequencyModal = useCallback(() => {
    setIsFrequencyModalOpen(false);
    setFrequencyGoal(null);
  }, []);

  const handleEditGoal = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  }, []);

  const handleEditMilestone = useCallback((milestone: Milestone) => {
    setEditingMilestone(milestone);
    setIsMilestoneModalOpen(true);
  }, []);

  const handleNewButtonClick = useCallback(() => {
    if (viewMode === 'goals') {
      // Open template selection modal for goals
      setIsTemplateModalOpen(true);
    } else if (viewMode === 'milestones') {
      handleOpenMilestoneModal();
    } else if (viewMode === 'habits') {
      handleOpenHabitModal();
    } else if (viewMode === 'activity') {
      // For activity view, default to creating a new goal
      setIsTemplateModalOpen(true);
    }
  }, [viewMode, handleOpenMilestoneModal, handleOpenHabitModal]);

  const handleSelectTemplate = useCallback((template: GoalTemplate) => {
    // Set template data and open NewGoalModal for editing
    setSelectedTemplate(template);
    setIsTemplateModalOpen(false);
    setIsGoalModalOpen(true);
  }, []);

  const handleCloseTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(false);
  }, []);

  const handleCreateFromScratch = useCallback(() => {
    setIsTemplateModalOpen(false);
    setIsGoalModalOpen(true);
  }, []);

  const handleReorderGoals = useCallback(async (goalIds: string[]) => {
    if (!currentSpace) return;

    try {
      await goalsService.reorderGoals(currentSpace.id, goalIds);
      // Optimistically update local state
      const reorderedGoals = goalIds.map(id => goals.find(g => g.id === id)!).filter(Boolean);
      setGoals(reorderedGoals);
    } catch (error) {
      console.error('Failed to reorder goals:', error);
      loadData(); // Reload on error
    }
  }, [currentSpace, goals, loadData]);

  const handlePriorityChange = useCallback(async (goalId: string, priority: 'none' | 'p1' | 'p2' | 'p3' | 'p4') => {
    // Mark as user action
    userActionsRef.current.add(goalId);

    // Optimistic update
    const previousGoals = goals;
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, priority } : g
    ));

    try {
      await goalsService.updateGoalPriority(goalId, priority);
      // Real-time subscription will handle the update
    } catch (error) {
      console.error('Failed to update goal priority:', error);
      // Revert on error
      setGoals(previousGoals);
      userActionsRef.current.delete(goalId);
    }
  }, [goals]);

  const handleTogglePin = useCallback(async (goalId: string, isPinned: boolean) => {
    // Mark as user action
    userActionsRef.current.add(goalId);

    // Optimistic update
    const previousGoals = goals;
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, is_pinned: isPinned } : g
    ));

    try {
      await goalsService.toggleGoalPin(goalId, isPinned);
      // Real-time subscription will handle the update
    } catch (error) {
      console.error('Failed to toggle goal pin:', error);
      // Revert on error
      setGoals(previousGoals);
      userActionsRef.current.delete(goalId);
    }
  }, [goals]);

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Goals & Milestones' }]}>
      <PageErrorBoundary>
        <PullToRefresh onRefresh={loadData} disabled={loading}>
          <div className="p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-goals flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-goals bg-clip-text text-transparent">
                  Goals & Milestones
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Achieve your dreams together
                </p>
              </div>
              {/* Online users indicator */}
              {onlineUsers.length > 0 && (
                <div className="mt-2 sm:mt-0 sm:ml-4">
                  <OnlineUsersIndicator count={onlineUsers.length} />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Simplified Navigation - Core tabs only */}
              <div className="flex items-center gap-1 p-1.5 bg-gradient-to-r from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl border border-indigo-200 dark:border-indigo-700 sm:min-w-[380px]">
                <button
                  onClick={() => handleViewModeChange('goals')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[90px] ${
                    viewMode === 'goals'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm">Goals</span>
                </button>
                <button
                  onClick={() => handleViewModeChange('milestones')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[90px] ${
                    viewMode === 'milestones'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm">Milestones</span>
                </button>
                <button
                  onClick={() => handleViewModeChange('habits')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[90px] ${
                    viewMode === 'habits'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span className="text-sm">Habits</span>
                </button>
                <button
                  onClick={() => handleViewModeChange('activity')}
                  className={`px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1 transition-all font-medium flex-1 sm:flex-initial sm:min-w-[90px] ${
                    viewMode === 'activity'
                      ? 'bg-gradient-goals text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">Activity</span>
                </button>
              </div>
              <button
                onClick={handleNewButtonClick}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 sm:min-w-[150px]"
              >
                <Plus className="w-5 h-5" />
                <span>New {viewMode === 'goals' ? 'Goal' : viewMode === 'milestones' ? 'Milestone' : viewMode === 'habits' ? 'Habit' : 'Goal'}</span>
              </button>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="stats-grid-mobile gap-4 sm:gap-6">
            {loading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : (
              <>
            {/* Active Goals */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Active Goals</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-goals rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                {stats.active > 0 && (
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <Target className="w-3 h-3" />
                    <span className="text-xs font-medium">Ongoing</span>
                  </div>
                )}
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">In Progress</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
                {stats.inProgress > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">Working on it</span>
                  </div>
                )}
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Milestones</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.milestonesReached}</p>
                {stats.milestonesReached > 0 && (
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <Award className="w-3 h-3" />
                    <span className="text-xs font-medium">Reached!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Completed */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Completed</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                {(stats.active + stats.completed) > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">
                      {(() => {
                        const percentage = Math.round((stats.completed / (stats.active + stats.completed)) * 100);
                        if (percentage >= 67) return `${percentage}% 🎉`;
                        if (percentage >= 34) return `${percentage}%`;
                        return percentage > 0 ? `${percentage}%` : 'Start';
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            </>
            )}
          </div>

          {/* Search Bar */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className={`apple-search-container goals-search group ${isSearchTyping ? 'apple-search-typing' : ''}`}>
              <Search className="apple-search-icon" />
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                placeholder="Search goals..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="apple-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="apple-search-clear"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Goals/Milestones List */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
            {/* Header with Month Badge and Status Filter - Hide for habits since it has custom header */}
            {viewMode !== 'habits' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {viewMode === 'goals' ? `All Goals (${filteredGoals.length})` :
                   viewMode === 'milestones' ? `Achievement Wall (${filteredMilestones.length})` :
                   'Activity Feed'}
                </h2>
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>

              {/* Filter Controls Container - Only show for goals view */}
              {viewMode === 'goals' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Status Filter */}
                  <div className="bg-gray-50 dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg p-1 flex gap-1 w-fit">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                        statusFilter === 'all'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter('active')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                        statusFilter === 'active'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setStatusFilter('completed')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                        statusFilter === 'completed'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >
                      Completed
                    </button>
                  </div>

                  {/* Assignment Filter */}
                  <div className="bg-gray-50 dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg p-1 flex gap-1 w-fit">
                    <button
                      onClick={() => setAssignmentFilter('all')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[60px] ${
                        assignmentFilter === 'all'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setAssignmentFilter('assigned-to-me')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[80px] ${
                        assignmentFilter === 'assigned-to-me'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >
                      Mine
                    </button>
                    <button
                      onClick={() => setAssignmentFilter('unassigned')}
                      className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap min-w-[100px] ${
                        assignmentFilter === 'unassigned'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >
                      Unassigned
                    </button>
                  </div>
                </div>
              )}

              {/* Focus Mode Toggle */}
              {viewMode === 'goals' && filteredGoals.length > 3 && (
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className={`px-4 py-2.5 text-sm font-medium md:px-3 md:py-1.5 md:text-xs rounded-md transition-all whitespace-nowrap flex items-center gap-2 ${
                    focusMode
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-700'
                  }`}
                  title="Show only top 3 priority goals"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Focus Mode</span>
                  <span className="sm:hidden">Focus</span>
                </button>
              )}
            </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {viewMode === 'goals' ? (
                  [...Array(5)].map((_, i) => <GoalCardSkeleton key={i} />)
                ) : (
                  [...Array(5)].map((_, i) => <MilestoneCardSkeleton key={i} />)
                )}
              </div>
            ) : viewMode === 'goals' ? (
              /* Goals View */
              filteredGoals.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No goals found</p>
                  <p className="text-gray-500 dark:text-gray-500 mb-6">
                    {searchQuery ? 'Try adjusting your search' : 'Set your first goal to get started!'}
                  </p>
                  {!searchQuery && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={handleOpenGoalModal}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-lg inline-flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Create Goal
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  <SortableGoalsList
                    goals={filteredGoals}
                    onReorder={handleReorderGoals}
                    onEdit={handleEditGoal}
                    onDelete={handleDeleteGoal}
                    onCheckIn={handleOpenCheckInModal}
                    onShowHistory={handleOpenHistoryTimeline}
                    onFrequencySettings={handleOpenFrequencyModal}
                    onStatusChange={handleGoalStatusChange}
                    onPriorityChange={handlePriorityChange}
                    onTogglePin={handleTogglePin}
                    getUsersViewingGoal={getUsersViewingGoal}
                  />
                </div>
              )
            ) : viewMode === 'milestones' ? (
              /* Milestones View */
              filteredMilestones.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No milestones found</p>
                  <p className="text-gray-500 dark:text-gray-500">Try adjusting your search</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {filteredMilestones.map((milestone) => {
                    const relatedGoal = goals.find(g => g.id === milestone.goal_id);
                    return (
                      <MilestoneCard
                        key={milestone.id}
                        milestone={milestone}
                        goalTitle={relatedGoal?.title}
                        onEdit={handleEditMilestone}
                        onDelete={handleDeleteMilestone}
                        onToggle={handleToggleMilestone}
                      />
                    );
                  })}
                </div>
              )
            ) : viewMode === 'habits' ? (
              /* Habits View */
              <div className="space-y-6">
                {/* Custom header for Habits without button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                          Habit Tracker
                        </h2>
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full">
                          {format(new Date(), 'MMM yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Build consistent healthy habits daily
                      </p>
                    </div>
                  </div>
                </div>
                {spaceId && <HabitTracker spaceId={spaceId} />}
              </div>
            ) : (
              /* Activity View */
              <div className="space-y-6">
                <ActivityFeed
                  spaceId={spaceId}
                  className="max-h-[600px]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      </PullToRefresh>
      </PageErrorBoundary>
      {/* Always render modals with fallback spaceId */}
      <TemplateSelectionModal
        isOpen={isTemplateModalOpen}
        onClose={handleCloseTemplateModal}
        onSelectTemplate={handleSelectTemplate}
        onCreateFromScratch={handleCreateFromScratch}
        spaceId={spaceId}
      />
      <NewGoalModal
        isOpen={isGoalModalOpen}
        onClose={handleCloseGoalModal}
        onSave={handleCreateGoal}
        editGoal={editingGoal}
        spaceId={spaceId}
        availableGoals={goals.filter(g => g.status === 'active')}
        selectedTemplate={selectedTemplate}
        spaceMembers={spaceMembers}
      />
      <NewMilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={handleCloseMilestoneModal}
        onSave={handleCreateMilestone}
        editMilestone={editingMilestone}
        goalId={goals[0]?.id || spaceId}
        availableGoals={goals.filter(g => g.status === 'active')}
      />
      <NewHabitModal
        isOpen={isHabitModalOpen}
        onClose={handleCloseHabitModal}
        onSave={handleCreateHabit}
        editHabit={editingHabit}
        spaceId={spaceId}
      />
      {checkInGoal && (
        <GoalCheckInModal
          isOpen={isCheckInModalOpen}
          onClose={handleCloseCheckInModal}
          onSave={handleCreateCheckIn}
          goalTitle={checkInGoal.title}
          goalId={checkInGoal.id}
          currentProgress={checkInGoal.progress}
        />
      )}
      {historyGoal && (
        <CheckInHistoryTimeline
          goalId={historyGoal.id}
          isOpen={isHistoryTimelineOpen}
          onClose={handleCloseHistoryTimeline}
        />
      )}
      {frequencyGoal && (
        <CheckInFrequencyModal
          isOpen={isFrequencyModalOpen}
          onClose={handleCloseFrequencyModal}
          goalId={frequencyGoal.id}
          goalTitle={frequencyGoal.title}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: 'delete-goal', id: '' })}
        onConfirm={handleConfirmDelete}
        title={confirmDialog.action === 'delete-goal' ? 'Delete Goal' : 'Delete Milestone'}
        message={confirmDialog.action === 'delete-goal'
          ? 'Are you sure you want to delete this goal? This action cannot be undone.'
          : 'Are you sure you want to delete this milestone? This action cannot be undone.'}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </FeatureLayout>
  );
}
