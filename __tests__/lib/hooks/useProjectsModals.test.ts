/**
 * Unit tests for lib/hooks/useProjectsModals.ts (PR14: project-only).
 * Budget/expense/bill modal state moved to the /budget hub; this manages the
 * project create/edit modal + the delete-confirm dialog.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectsModals } from '@/lib/hooks/useProjectsModals';
import type { Project } from '@/lib/services/project-tracking-service';

const fakeProject = { id: 'p1', name: 'Kitchen' } as Project;

describe('useProjectsModals (project-only)', () => {
  it('starts closed with no editing project and a closed confirm dialog', () => {
    const { result } = renderHook(() => useProjectsModals());
    expect(result.current.isProjectModalOpen).toBe(false);
    expect(result.current.editingProject).toBeNull();
    expect(result.current.confirmDialog).toEqual({ isOpen: false, action: 'delete-project', id: '' });
  });

  it('handleEditProject opens the modal with the project set', () => {
    const { result } = renderHook(() => useProjectsModals());
    act(() => result.current.handleEditProject(fakeProject));
    expect(result.current.isProjectModalOpen).toBe(true);
    expect(result.current.editingProject).toEqual(fakeProject);
  });

  it('handleCloseProjectModal closes the modal and clears editing', () => {
    const { result } = renderHook(() => useProjectsModals());
    act(() => result.current.handleEditProject(fakeProject));
    act(() => result.current.handleCloseProjectModal());
    expect(result.current.isProjectModalOpen).toBe(false);
    expect(result.current.editingProject).toBeNull();
  });

  it('setConfirmDialog opens the delete-confirm with an id', () => {
    const { result } = renderHook(() => useProjectsModals());
    act(() => result.current.setConfirmDialog({ isOpen: true, action: 'delete-project', id: 'p1' }));
    expect(result.current.confirmDialog).toEqual({ isOpen: true, action: 'delete-project', id: 'p1' });
  });
});
