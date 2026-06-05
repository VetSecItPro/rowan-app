/**
 * Unit tests for lib/hooks/useProjectsHandlers.ts (PR14: project-only).
 * Expense/bill/budget handlers moved to useBudgetData; this covers project
 * create/update + the delete-confirm flow.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectsHandlers, type UseProjectsHandlersDeps } from '@/lib/hooks/useProjectsHandlers';
import type { Project } from '@/lib/services/project-tracking-service';

const createProject = vi.fn().mockResolvedValue({ id: 'proj-1', name: 'New Project' });
const updateProject = vi.fn().mockResolvedValue({ id: 'proj-1', name: 'Updated' });
const deleteProject = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/services/projects-service', () => ({
  projectsOnlyService: {
    createProject: (...a: unknown[]) => createProject(...a),
    updateProject: (...a: unknown[]) => updateProject(...a),
    deleteProject: (...a: unknown[]) => deleteProject(...a),
  },
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

function buildDeps(overrides: Partial<UseProjectsHandlersDeps> = {}): UseProjectsHandlersDeps {
  return {
    editingProject: null,
    setEditingProject: vi.fn(),
    confirmDialog: { isOpen: false, action: 'delete-project', id: '' },
    setConfirmDialog: vi.fn(),
    loadData: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('useProjectsHandlers (project-only)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes only the project handlers', () => {
    const { result } = renderHook(() => useProjectsHandlers(buildDeps()));
    expect(typeof result.current.handleCreateProject).toBe('function');
    expect(typeof result.current.handleDeleteProject).toBe('function');
    expect(typeof result.current.handleConfirmDelete).toBe('function');
  });

  it('handleCreateProject creates when not editing', async () => {
    const deps = buildDeps();
    const { result } = renderHook(() => useProjectsHandlers(deps));
    await act(async () => {
      await result.current.handleCreateProject({ space_id: 's1', name: 'Deck' } as never);
    });
    expect(createProject).toHaveBeenCalled();
    expect(updateProject).not.toHaveBeenCalled();
    expect(deps.loadData).toHaveBeenCalled();
  });

  it('handleCreateProject updates when editing', async () => {
    const deps = buildDeps({ editingProject: { id: 'proj-9' } as Project });
    const { result } = renderHook(() => useProjectsHandlers(deps));
    await act(async () => {
      await result.current.handleCreateProject({ space_id: 's1', name: 'Deck v2' } as never);
    });
    expect(updateProject).toHaveBeenCalledWith('proj-9', expect.anything());
    expect(createProject).not.toHaveBeenCalled();
  });

  it('handleDeleteProject opens the confirm dialog (does not delete yet)', async () => {
    const deps = buildDeps();
    const { result } = renderHook(() => useProjectsHandlers(deps));
    await act(async () => {
      await result.current.handleDeleteProject('proj-1');
    });
    expect(deps.setConfirmDialog).toHaveBeenCalledWith({ isOpen: true, action: 'delete-project', id: 'proj-1' });
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it('handleConfirmDelete deletes the confirmed project', async () => {
    const deps = buildDeps({ confirmDialog: { isOpen: true, action: 'delete-project', id: 'proj-7' } });
    const { result } = renderHook(() => useProjectsHandlers(deps));
    await act(async () => {
      await result.current.handleConfirmDelete();
    });
    expect(deleteProject).toHaveBeenCalledWith('proj-7');
    expect(deps.loadData).toHaveBeenCalled();
  });
});
