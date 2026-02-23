/**
 * Unit tests for lib/hooks/useTasksHandlers.ts
 *
 * Tests CRUD handler function existence.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTasksHandlers } from '@/lib/hooks/useTasksHandlers';
import type { TasksHandlersDeps } from '@/lib/hooks/useTasksHandlers';

vi.mock('@/lib/services/tasks-service', () => ({
  tasksService: {
    createTask: vi.fn().mockResolvedValue({ id: 'task-1' }),
    updateTask: vi.fn().mockResolvedValue(undefined),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/task-templates-service', () => ({
  taskTemplatesService: {
    saveAsTemplate: vi.fn().mockResolvedValue(undefined),
    applyTemplate: vi.fn().mockResolvedValue({ title: 'Template Task' }),
  },
}));

vi.mock('@/lib/services/chores-service', () => ({
  choresService: {
    createChore: vi.fn().mockResolvedValue({ id: 'chore-1' }),
    updateChore: vi.fn().mockResolvedValue(undefined),
    deleteChore: vi.fn().mockResolvedValue(undefined),
    updateChoreStatus: vi.fn().mockResolvedValue(undefined),
  },
  UpdateChoreInput: {},
}));

vi.mock('@/lib/services/rewards', () => ({
  pointsService: {
    awardPoints: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
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

function buildDeps(overrides: Partial<TasksHandlersDeps> = {}): TasksHandlersDeps {
  return {
    user: { id: 'user-1', email: 'test@example.com' },
    currentSpace: { id: 'space-1' },
    spaceId: 'space-1',
    tasks: [],
    setTasks: vi.fn(),
    setChores: vi.fn(),
    setChoreLoading: vi.fn(),
    refreshTasks: vi.fn(),
    refreshChores: vi.fn(),
    loadData: vi.fn().mockResolvedValue(undefined),
    editingItem: null,
    modalDefaultType: 'task',
    closeUnifiedModal: vi.fn(),
    closeTemplatePicker: vi.fn(),
    clearSelectedTaskIds: vi.fn(),
    ...overrides,
  };
}

describe('useTasksHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return all expected handler functions', () => {
    const { result } = renderHook(() => useTasksHandlers(buildDeps()));

    expect(typeof result.current.handleSaveItem).toBe('function');
    expect(typeof result.current.handleStatusChange).toBe('function');
    expect(typeof result.current.handleDeleteItem).toBe('function');
    expect(typeof result.current.handleSaveAsTemplate).toBe('function');
    expect(typeof result.current.handleBulkActionComplete).toBe('function');
    expect(typeof result.current.handleTemplateSelect).toBe('function');
  });

  it('handleBulkActionComplete should call clearSelectedTaskIds', () => {
    const clearSelectedTaskIds = vi.fn();
    const { result } = renderHook(() =>
      useTasksHandlers(buildDeps({ clearSelectedTaskIds }))
    );

    result.current.handleBulkActionComplete();

    expect(clearSelectedTaskIds).toHaveBeenCalledTimes(1);
  });
});
