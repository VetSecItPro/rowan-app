/**
 * Unit tests for lib/hooks/useGoalsHandlers.ts
 *
 * Tests CRUD handler function existence and basic behavior.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoalsHandlers } from '@/lib/hooks/useGoalsHandlers';
import type { UseGoalsHandlersDeps } from '@/lib/hooks/useGoalsHandlers';
import { useRef } from 'react';

vi.mock('@/lib/services/goals-service', () => ({
  goalsService: {
    createGoal: vi.fn().mockResolvedValue({ id: 'new-goal', title: 'Test' }),
    updateGoal: vi.fn().mockResolvedValue(undefined),
    deleteGoal: vi.fn().mockResolvedValue(undefined),
    createMilestone: vi.fn().mockResolvedValue({ id: 'new-ms' }),
    updateMilestone: vi.fn().mockResolvedValue(undefined),
    deleteMilestone: vi.fn().mockResolvedValue(undefined),
    createHabit: vi.fn().mockResolvedValue({ id: 'new-habit' }),
    createCheckIn: vi.fn().mockResolvedValue({ id: 'new-checkin' }),
    reorderGoals: vi.fn().mockResolvedValue(undefined),
    updateGoalPriority: vi.fn().mockResolvedValue(undefined),
    toggleGoalPin: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function buildDeps(overrides: Partial<UseGoalsHandlersDeps> = {}): UseGoalsHandlersDeps {
  return {
    goals: [],
    setGoals: vi.fn(),
    milestones: [],
    setMilestones: vi.fn(),
    userActionsRef: { current: new Set() },
    user: { id: 'user-1', email: 'test@example.com' },
    currentSpace: { id: 'space-1' },
    editingGoal: null,
    setEditingGoal: vi.fn(),
    editingMilestone: null,
    setEditingMilestone: vi.fn(),
    editingHabit: null,
    setEditingHabit: vi.fn(),
    confirmDialog: { isOpen: false, action: 'delete-goal', id: '' },
    setConfirmDialog: vi.fn(),
    setSearchQuery: vi.fn(),
    setIsSearchTyping: vi.fn(),
    setViewMode: vi.fn(),
    loadData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('useGoalsHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return all expected handler functions', () => {
    const { result } = renderHook(() => useGoalsHandlers(buildDeps()));

    expect(typeof result.current.handleCreateGoal).toBe('function');
    expect(typeof result.current.handleDeleteGoal).toBe('function');
    expect(typeof result.current.handleCreateMilestone).toBe('function');
    expect(typeof result.current.handleDeleteMilestone).toBe('function');
    expect(typeof result.current.handleCreateHabit).toBe('function');
    expect(typeof result.current.handleCreateCheckIn).toBe('function');
    expect(typeof result.current.handleConfirmDelete).toBe('function');
    expect(typeof result.current.handleToggleMilestone).toBe('function');
    expect(typeof result.current.handleGoalStatusChange).toBe('function');
    expect(typeof result.current.handleSearchChange).toBe('function');
    expect(typeof result.current.handleViewModeChange).toBe('function');
    expect(typeof result.current.handleReorderGoals).toBe('function');
    expect(typeof result.current.handlePriorityChange).toBe('function');
    expect(typeof result.current.handleTogglePin).toBe('function');
  });

  it('handleViewModeChange should call setViewMode with new mode', () => {
    const setViewMode = vi.fn();
    const { result } = renderHook(() => useGoalsHandlers(buildDeps({ setViewMode })));

    act(() => result.current.handleViewModeChange('milestones'));

    expect(setViewMode).toHaveBeenCalledWith('milestones');
  });

  it('handleSearchChange should call setSearchQuery and setIsSearchTyping', () => {
    const setSearchQuery = vi.fn();
    const setIsSearchTyping = vi.fn();
    const { result } = renderHook(() =>
      useGoalsHandlers(buildDeps({ setSearchQuery, setIsSearchTyping }))
    );

    const mockEvent = { target: { value: 'fitness' } } as React.ChangeEvent<HTMLInputElement>;
    act(() => result.current.handleSearchChange(mockEvent));

    expect(setSearchQuery).toHaveBeenCalledWith('fitness');
    expect(setIsSearchTyping).toHaveBeenCalledWith(true);
  });

  it('handleConfirmDelete should not throw when confirmDialog is closed', async () => {
    const deps = buildDeps({
      confirmDialog: { isOpen: false, action: 'delete-goal', id: '' },
    });
    const { result } = renderHook(() => useGoalsHandlers(deps));

    await expect(
      act(async () => result.current.handleConfirmDelete())
    ).resolves.not.toThrow();
  });
});
