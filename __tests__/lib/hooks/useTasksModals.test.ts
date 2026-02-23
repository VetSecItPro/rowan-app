/**
 * Unit tests for lib/hooks/useTasksModals.ts
 *
 * Tests task/chore create, edit, detail, template picker,
 * and bulk selection modal state management.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasksModals } from '@/lib/hooks/useTasksModals';

describe('useTasksModals', () => {
  it('should initialize with all modals closed and default state', () => {
    const { result } = renderHook(() => useTasksModals());

    expect(result.current.isUnifiedModalOpen).toBe(false);
    expect(result.current.modalDefaultType).toBe('task');
    expect(result.current.editingItem).toBeNull();
    expect(result.current.isDetailsModalOpen).toBe(false);
    expect(result.current.selectedItem).toBeNull();
    expect(result.current.isTemplatePickerOpen).toBe(false);
    expect(result.current.selectedTaskIds).toEqual([]);
  });

  it('openCreateModal task should open unified modal with task type', () => {
    const { result } = renderHook(() => useTasksModals());

    act(() => result.current.openCreateModal('task'));

    expect(result.current.isUnifiedModalOpen).toBe(true);
    expect(result.current.modalDefaultType).toBe('task');
  });

  it('openCreateModal chore should open unified modal with chore type', () => {
    const { result } = renderHook(() => useTasksModals());

    act(() => result.current.openCreateModal('chore'));

    expect(result.current.isUnifiedModalOpen).toBe(true);
    expect(result.current.modalDefaultType).toBe('chore');
  });

  it('openEditModal should set editing item and open unified modal', () => {
    const { result } = renderHook(() => useTasksModals());
    const item = { id: 'task-1', title: 'My Task', type: 'task' as const };

    act(() => result.current.openEditModal(item));

    expect(result.current.editingItem).toMatchObject({ id: 'task-1', title: 'My Task', type: 'task' });
    expect(result.current.isUnifiedModalOpen).toBe(true);
  });

  it('openEditModal should default to task type when type not provided', () => {
    const { result } = renderHook(() => useTasksModals());
    const item = { id: 'task-1', title: 'My Task' };

    act(() => result.current.openEditModal(item));

    expect(result.current.editingItem?.type).toBe('task');
  });

  it('closeUnifiedModal should close modal and clear editing item', () => {
    const { result } = renderHook(() => useTasksModals());
    const item = { id: 'task-1', title: 'My Task', type: 'task' as const };

    act(() => result.current.openEditModal(item));
    act(() => result.current.closeUnifiedModal());

    expect(result.current.isUnifiedModalOpen).toBe(false);
    expect(result.current.editingItem).toBeNull();
  });

  it('openDetailsModal should set selected item and open details modal', () => {
    const { result } = renderHook(() => useTasksModals());
    const item = { id: 'task-2', title: 'Detail Task', type: 'chore' as const };

    act(() => result.current.openDetailsModal(item));

    expect(result.current.selectedItem).toMatchObject({ id: 'task-2', title: 'Detail Task', type: 'chore' });
    expect(result.current.isDetailsModalOpen).toBe(true);
  });

  it('closeDetailsModal should close details modal and clear selected item', () => {
    const { result } = renderHook(() => useTasksModals());
    const item = { id: 'task-2', title: 'Detail Task' };

    act(() => result.current.openDetailsModal(item));
    act(() => result.current.closeDetailsModal());

    expect(result.current.isDetailsModalOpen).toBe(false);
    expect(result.current.selectedItem).toBeNull();
  });

  it('openTemplatePicker should open template picker', () => {
    const { result } = renderHook(() => useTasksModals());

    act(() => result.current.openTemplatePicker());

    expect(result.current.isTemplatePickerOpen).toBe(true);
  });

  it('closeTemplatePicker should close template picker', () => {
    const { result } = renderHook(() => useTasksModals());

    act(() => result.current.openTemplatePicker());
    act(() => result.current.closeTemplatePicker());

    expect(result.current.isTemplatePickerOpen).toBe(false);
  });

  it('setSelectedTaskIds should update selected task IDs', () => {
    const { result } = renderHook(() => useTasksModals());

    act(() => result.current.setSelectedTaskIds(['id-1', 'id-2']));

    expect(result.current.selectedTaskIds).toEqual(['id-1', 'id-2']);
  });

  it('clearSelectedTaskIds should empty the selected task IDs', () => {
    const { result } = renderHook(() => useTasksModals());

    act(() => result.current.setSelectedTaskIds(['id-1', 'id-2']));
    act(() => result.current.clearSelectedTaskIds());

    expect(result.current.selectedTaskIds).toEqual([]);
  });
});
