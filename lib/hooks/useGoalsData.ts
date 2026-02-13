'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import { usePresence } from '@/lib/hooks/usePresence';
import { goalsService, Goal, Milestone } from '@/lib/services/goals-service';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewMode = 'goals' | 'milestones' | 'habits' | 'activity';

export type SpaceMemberRow = {
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
};

export type SpaceMember = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
};

export type GoalsStats = {
  active: number;
  completed: number;
  inProgress: number;
  milestonesReached: number;
};

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseGoalsDataReturn {
  // Auth / access
  currentSpace: ReturnType<typeof useAuthWithSpaces>['currentSpace'];
  user: ReturnType<typeof useAuthWithSpaces>['user'];
  spaceId: string | undefined;
  hasAccess: boolean;
  gateLoading: boolean;

  // Core data
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
  spaceMembers: SpaceMember[];
  loading: boolean;

  // Refs
  goalsRef: React.MutableRefObject<Goal[]>;
  userActionsRef: React.MutableRefObject<Set<string>>;

  // View / filter state
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  isSearchTyping: boolean;
  setIsSearchTyping: React.Dispatch<React.SetStateAction<boolean>>;
  statusFilter: string;
  setStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  assignmentFilter: 'all' | 'assigned-to-me' | 'unassigned';
  setAssignmentFilter: React.Dispatch<React.SetStateAction<'all' | 'assigned-to-me' | 'unassigned'>>;
  focusMode: boolean;
  setFocusMode: React.Dispatch<React.SetStateAction<boolean>>;

  // Computed / memoized
  filteredGoals: Goal[];
  filteredMilestones: Milestone[];
  stats: GoalsStats;

  // Presence
  onlineUsers: ReturnType<typeof usePresence>['onlineUsers'];
  getUsersViewingGoal: ReturnType<typeof usePresence>['getUsersViewingGoal'];

  // Actions
  loadData: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGoalsData(): UseGoalsDataReturn {
  // SECURITY: Check feature access FIRST, before loading any data
  const { hasAccess, isLoading: gateLoading } = useFeatureGate('goals');

  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;

  // Core data state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const goalsRef = useRef<Goal[]>([]);
  const userActionsRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);

  // View / filter state
  const [viewMode, setViewMode] = useState<ViewMode>('goals');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned-to-me' | 'unassigned'>('all');
  const [focusMode, setFocusMode] = useState(false);

  // Presence tracking for collaborative editing
  const { onlineUsers, getUsersViewingGoal } = usePresence({
    channelName: 'goals-presence',
    spaceId: spaceId || '',
    userId: user?.id || '',
    userEmail: user?.email,
  });

  // ─── Memoized computed values ───────────────────────────────────────────────

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

  const filteredMilestones = useMemo(() => {
    if (!searchQuery) return milestones;

    const lowerQuery = searchQuery.toLowerCase();
    return milestones.filter(m =>
      m.title.toLowerCase().includes(lowerQuery) ||
      m.description?.toLowerCase().includes(lowerQuery)
    );
  }, [milestones, searchQuery]);

  const stats = useMemo<GoalsStats>(() => {
    const active = goals.filter(g => g.status === 'active').length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const inProgress = goals.filter(g => g.status === 'active' && g.progress > 0 && g.progress < 100).length;
    const milestonesReached = milestones.filter(m => m.completed).length;

    return { active, completed, inProgress, milestonesReached };
  }, [goals, milestones]);

  // ─── Keep goalsRef in sync ──────────────────────────────────────────────────

  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
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
        const members = (membersResult.data as SpaceMemberRow[])
          .map((member) => member.user)
          .filter((member): member is NonNullable<SpaceMemberRow['user']> => member != null)
          .map(member => ({
            ...member,
            avatar_url: member.avatar_url ?? undefined
          }));
        setSpaceMembers(members);
      }

    } catch (error) {
      logger.error('Failed to load data:', error, { component: 'page', action: 'execution' });
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  // ─── Initial data load ─────────────────────────────────────────────────────

  useEffect(() => {
    // SECURITY: Only load data if user has access
    if (!gateLoading && hasAccess) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpace, gateLoading, hasAccess]);

  // ─── Real-time subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    // SECURITY: Only subscribe if user has access
    if (!currentSpace || !hasAccess || gateLoading) return;

    const supabase = createClient();

    // Subscribe to goals changes
    const goalsChannel = supabase
      .channel(`goals-changes:${currentSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `space_id=eq.${currentSpace.id}`
        },
        (payload: RealtimePostgresChangesPayload<{[key: string]: unknown}>) => {
          const goalId = (payload.new as Record<string, unknown>)?.id || (payload.old as Record<string, unknown>)?.id;
          const isUserAction = goalId && userActionsRef.current.has(goalId as string);

          if (payload.eventType === 'INSERT') {
            const newGoal = payload.new as unknown as Goal;
            setGoals(prev => [...prev, newGoal]);
            if (!isUserAction) {
              toast.info(`New goal added: ${newGoal.title}`);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedGoal = payload.new as unknown as Goal;
            setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
            if (!isUserAction) {
              toast.info(`Goal updated: ${updatedGoal.title}`);
            }
            // Clean up action tracking
            if (goalId) userActionsRef.current.delete(goalId as string);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
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
    const milestonesChannel = supabase
      .channel(`milestones-changes:${currentSpace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goal_milestones'
        },
        (payload: RealtimePostgresChangesPayload<{[key: string]: unknown}>) => {
          // Check if milestone belongs to a goal in current space
          const belongsToCurrentSpace = (milestone: Milestone) => {
            return goalsRef.current.some(g => g.id === milestone.goal_id);
          };

          const milestoneId = (payload.new as Record<string, unknown>)?.id || (payload.old as Record<string, unknown>)?.id;
          const isUserAction = milestoneId && userActionsRef.current.has(milestoneId as string);

          if (payload.eventType === 'INSERT') {
            const newMilestone = payload.new as unknown as Milestone;
            if (belongsToCurrentSpace(newMilestone)) {
              setMilestones(prev => [...prev, newMilestone]);
              if (!isUserAction) {
                toast.info(`New milestone added: ${newMilestone.title}`);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMilestone = payload.new as unknown as Milestone;
            if (belongsToCurrentSpace(updatedMilestone)) {
              setMilestones(prev => prev.map(m => m.id === updatedMilestone.id ? updatedMilestone : m));
              if (!isUserAction) {
                toast.info(`Milestone updated: ${updatedMilestone.title}`);
              }
            }
            if (milestoneId) userActionsRef.current.delete(milestoneId as string);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
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

  return {
    // Auth / access
    currentSpace,
    user,
    spaceId,
    hasAccess,
    gateLoading,

    // Core data
    goals,
    setGoals,
    milestones,
    setMilestones,
    spaceMembers,
    loading,

    // Refs
    goalsRef,
    userActionsRef,

    // View / filter state
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    isSearchTyping,
    setIsSearchTyping,
    statusFilter,
    setStatusFilter,
    assignmentFilter,
    setAssignmentFilter,
    focusMode,
    setFocusMode,

    // Computed / memoized
    filteredGoals,
    filteredMilestones,
    stats,

    // Presence
    onlineUsers,
    getUsersViewingGoal,

    // Actions
    loadData,
  };
}
