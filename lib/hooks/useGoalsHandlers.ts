'use client';

import { useCallback, useRef } from 'react';
import { goalsService, Goal, Milestone, CreateGoalInput, CreateMilestoneInput, CreateCheckInInput } from '@/lib/services/goals-service';
import { toast } from 'sonner';
import { showSuccess, showError } from '@/lib/utils/toast';
import { logger } from '@/lib/logger';
import type { ViewMode } from '@/lib/hooks/useGoalsData';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Habit = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  frequency_type: 'daily' | 'weekly' | 'monthly';
  frequency_value?: number;
  target_count?: number;
  space_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateHabitInput = {
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  frequency_type: 'daily' | 'weekly' | 'monthly';
  frequency_value?: number;
  target_count?: number;
};

export type ConfirmDialogState = {
  isOpen: boolean;
  action: 'delete-goal' | 'delete-milestone';
  id: string;
};

// ─── Dependencies interface ───────────────────────────────────────────────────

export interface UseGoalsHandlersDeps {
  // Data state setters
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;

  // Refs
  userActionsRef: React.MutableRefObject<Set<string>>;

  // Auth
  user: { id: string; email?: string } | null;
  currentSpace: { id: string } | null;

  // Modal editing state setters (from useGoalsModals)
  editingGoal: Goal | null;
  setEditingGoal: React.Dispatch<React.SetStateAction<Goal | null>>;
  editingMilestone: Milestone | null;
  setEditingMilestone: React.Dispatch<React.SetStateAction<Milestone | null>>;
  editingHabit: Habit | null;
  setEditingHabit: React.Dispatch<React.SetStateAction<Habit | null>>;

  // Confirm dialog state
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;

  // View / filter setters (from useGoalsData)
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setIsSearchTyping: React.Dispatch<React.SetStateAction<boolean>>;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;

  // Data refresh
  loadData: () => Promise<void>;
}

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseGoalsHandlersReturn {
  handleCreateGoal: (goalData: CreateGoalInput) => Promise<void>;
  handleDeleteGoal: (goalId: string) => Promise<void>;
  handleCreateMilestone: (milestoneData: CreateMilestoneInput) => Promise<void>;
  handleDeleteMilestone: (milestoneId: string) => Promise<void>;
  handleCreateHabit: (habitData: CreateHabitInput) => Promise<void>;
  handleCreateCheckIn: (checkInData: CreateCheckInInput) => Promise<void>;
  handleConfirmDelete: () => Promise<void>;
  handleToggleMilestone: (milestoneId: string, completed: boolean) => Promise<void>;
  handleGoalStatusChange: (goalId: string, status: 'not-started' | 'in-progress' | 'completed') => Promise<void>;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleViewModeChange: (mode: ViewMode) => void;
  handleReorderGoals: (goalIds: string[]) => Promise<void>;
  handlePriorityChange: (goalId: string, priority: 'none' | 'p1' | 'p2' | 'p3' | 'p4') => Promise<void>;
  handleTogglePin: (goalId: string, isPinned: boolean) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Provides CRUD handlers for goals, milestones, and goal progress tracking */
export function useGoalsHandlers(deps: UseGoalsHandlersDeps): UseGoalsHandlersReturn {
  const {
    goals,
    setGoals,
    milestones,
    setMilestones,
    userActionsRef,
    user,
    currentSpace,
    editingGoal,
    setEditingGoal,
    editingMilestone,
    setEditingMilestone,
    setEditingHabit,
    confirmDialog,
    setConfirmDialog,
    setSearchQuery,
    setIsSearchTyping,
    setViewMode,
    loadData,
  } = deps;

  // Track pending deletion timeouts for undo support
  const pendingDeletionRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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
      logger.error('Failed to save goal:', error, { component: 'page', action: 'execution' });
    }
  }, [editingGoal, setGoals, user, setEditingGoal]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-goal', id: goalId });
  }, [setConfirmDialog]);

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
      logger.error('Failed to save milestone:', error, { component: 'page', action: 'execution' });
    }
  }, [editingMilestone, loadData, setEditingMilestone]);

  const handleCreateHabit = useCallback(async (habitData: CreateHabitInput) => {
    try {
      // TODO: Implement habit creation service when backend is ready
      logger.info('Creating habit:', { component: 'page', data: habitData });
      toast.success('Habit created successfully!');

      // For now, just close the modal
      setEditingHabit(null);
    } catch (error) {
      logger.error('Failed to save habit:', error, { component: 'page', action: 'execution' });
      toast.error('Failed to create habit. Please try again.');
    }
  }, [setEditingHabit]);

  const handleCreateCheckIn = useCallback(async (checkInData: CreateCheckInInput) => {
    try {
      await goalsService.createCheckIn(checkInData);
      toast.success('Check-in saved successfully!');
      loadData(); // Reload to update goal progress
    } catch (error) {
      logger.error('Failed to save check-in:', error, { component: 'page', action: 'execution' });
      toast.error('Failed to save check-in. Please try again.');
    }
  }, [loadData]);

  const handleDeleteMilestone = useCallback(async (milestoneId: string) => {
    setConfirmDialog({ isOpen: true, action: 'delete-milestone', id: milestoneId });
  }, [setConfirmDialog]);

  const handleConfirmDelete = useCallback(async () => {
    const { action, id } = confirmDialog;
    setConfirmDialog({ isOpen: false, action: 'delete-goal', id: '' });

    const isGoal = action === 'delete-goal';
    const label = isGoal ? 'Goal' : 'Milestone';

    // Save item data before removal for undo
    let savedGoal: Goal | undefined;
    let savedMilestone: Milestone | undefined;

    if (isGoal) {
      savedGoal = goals.find(g => g.id === id);
      if (!savedGoal) return;
      setGoals(prev => prev.filter(goal => goal.id !== id));
    } else {
      savedMilestone = milestones.find(m => m.id === id);
      if (!savedMilestone) return;
      setMilestones(prev => prev.filter(milestone => milestone.id !== id));
    }

    // Clear any existing timeout for this item
    const existingTimeout = pendingDeletionRef.current.get(id);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeoutId = setTimeout(async () => {
      try {
        if (isGoal) {
          await goalsService.deleteGoal(id);
        } else {
          await goalsService.deleteMilestone(id);
        }
        pendingDeletionRef.current.delete(id);
      } catch (error) {
        logger.error(`Failed to ${action}:`, error, { component: 'page', action: 'execution' });
        showError(`Failed to delete ${label.toLowerCase()}`);
        // Revert optimistic update on error
        if (isGoal && savedGoal) {
          setGoals(prev => [savedGoal!, ...prev]);
        } else if (savedMilestone) {
          setMilestones(prev => [savedMilestone!, ...prev]);
        }
        pendingDeletionRef.current.delete(id);
      }
    }, 5000);

    pendingDeletionRef.current.set(id, timeoutId);

    toast(`${label} deleted`, {
      description: 'You have 5 seconds to undo this action.',
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timeoutId);
          pendingDeletionRef.current.delete(id);
          if (isGoal && savedGoal) {
            setGoals(prev => [savedGoal!, ...prev]);
          } else if (savedMilestone) {
            setMilestones(prev => [savedMilestone!, ...prev]);
          }
          showSuccess(`${label} restored!`);
        },
      },
    });
  }, [confirmDialog, goals, milestones, setConfirmDialog, setGoals, setMilestones]);

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
      logger.error('Failed to toggle milestone:', error, { component: 'page', action: 'execution' });
      // Revert on error
      setMilestones(previousMilestones);
      userActionsRef.current.delete(milestoneId);
    }
  }, [milestones, setMilestones, userActionsRef]);

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
      logger.error('Failed to update goal status:', error, { component: 'page', action: 'execution' });
      // Revert on error
      setGoals(previousGoals);
      userActionsRef.current.delete(goalId);
    }
  }, [goals, setGoals, userActionsRef]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchTyping(true);
    setTimeout(() => setIsSearchTyping(false), 300);
  }, [setSearchQuery, setIsSearchTyping]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, [setViewMode]);

  const handleReorderGoals = useCallback(async (goalIds: string[]) => {
    if (!currentSpace) return;

    try {
      await goalsService.reorderGoals(currentSpace.id, goalIds);
      // Optimistically update local state
      const reorderedGoals = goalIds.map(id => goals.find(g => g.id === id)!).filter(Boolean);
      setGoals(reorderedGoals);
    } catch (error) {
      logger.error('Failed to reorder goals:', error, { component: 'page', action: 'execution' });
      loadData(); // Reload on error
    }
  }, [currentSpace, goals, loadData, setGoals]);

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
      logger.error('Failed to update goal priority:', error, { component: 'page', action: 'execution' });
      // Revert on error
      setGoals(previousGoals);
      userActionsRef.current.delete(goalId);
    }
  }, [goals, setGoals, userActionsRef]);

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
      logger.error('Failed to toggle goal pin:', error, { component: 'page', action: 'execution' });
      // Revert on error
      setGoals(previousGoals);
      userActionsRef.current.delete(goalId);
    }
  }, [goals, setGoals, userActionsRef]);

  return {
    handleCreateGoal,
    handleDeleteGoal,
    handleCreateMilestone,
    handleDeleteMilestone,
    handleCreateHabit,
    handleCreateCheckIn,
    handleConfirmDelete,
    handleToggleMilestone,
    handleGoalStatusChange,
    handleSearchChange,
    handleViewModeChange,
    handleReorderGoals,
    handlePriorityChange,
    handleTogglePin,
  };
}
