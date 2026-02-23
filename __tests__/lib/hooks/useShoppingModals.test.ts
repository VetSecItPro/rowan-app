/**
 * Unit tests for lib/hooks/useShoppingModals.ts
 *
 * Tests shopping list modal, template picker, save template,
 * schedule trip, and confirm dialog state management.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShoppingModals } from '@/lib/hooks/useShoppingModals';
import type { ShoppingList } from '@/lib/services/shopping-service';

const mockList = { id: 'list-1', name: 'Groceries' } as ShoppingList;
const tempList = { id: 'temp-abc', name: 'Temp List' } as ShoppingList;

describe('useShoppingModals', () => {
  it('should initialize all modals as closed', () => {
    const { result } = renderHook(() => useShoppingModals());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingList).toBeNull();
    expect(result.current.showTemplatePicker).toBe(false);
    expect(result.current.showTemplateModal).toBe(false);
    expect(result.current.listForTemplate).toBeNull();
    expect(result.current.showScheduleTripModal).toBe(false);
    expect(result.current.listToSchedule).toBeNull();
    expect(result.current.confirmDialog).toEqual({ isOpen: false, listId: '' });
  });

  it('handleOpenNewListModal should open modal', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleOpenNewListModal());

    expect(result.current.isModalOpen).toBe(true);
  });

  it('handleCloseModal should close modal and clear editing list', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleEditList(mockList));
    act(() => result.current.handleCloseModal());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingList).toBeNull();
  });

  it('handleEditList should set editing list and open modal', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleEditList(mockList));

    expect(result.current.editingList).toEqual(mockList);
    expect(result.current.isModalOpen).toBe(true);
  });

  it('handleEditList should skip temp-id lists', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleEditList(tempList));

    expect(result.current.editingList).toBeNull();
    expect(result.current.isModalOpen).toBe(false);
  });

  it('handleOpenTemplatePicker should open template picker', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleOpenTemplatePicker());

    expect(result.current.showTemplatePicker).toBe(true);
  });

  it('handleSaveAsTemplate should set list and open template modal', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleSaveAsTemplate(mockList));

    expect(result.current.listForTemplate).toEqual(mockList);
    expect(result.current.showTemplateModal).toBe(true);
  });

  it('handleSaveAsTemplate should skip temp-id lists', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleSaveAsTemplate(tempList));

    expect(result.current.listForTemplate).toBeNull();
    expect(result.current.showTemplateModal).toBe(false);
  });

  it('handleCloseTemplateModal should close template modal and clear list', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleSaveAsTemplate(mockList));
    act(() => result.current.handleCloseTemplateModal());

    expect(result.current.showTemplateModal).toBe(false);
    expect(result.current.listForTemplate).toBeNull();
  });

  it('handleScheduleTrip should set list and open schedule modal', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleScheduleTrip(mockList));

    expect(result.current.listToSchedule).toEqual(mockList);
    expect(result.current.showScheduleTripModal).toBe(true);
  });

  it('handleScheduleTrip should skip temp-id lists', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleScheduleTrip(tempList));

    expect(result.current.listToSchedule).toBeNull();
    expect(result.current.showScheduleTripModal).toBe(false);
  });

  it('handleCloseScheduleTripModal should close and clear schedule modal', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleScheduleTrip(mockList));
    act(() => result.current.handleCloseScheduleTripModal());

    expect(result.current.showScheduleTripModal).toBe(false);
    expect(result.current.listToSchedule).toBeNull();
  });

  it('handleCloseConfirmDialog should reset confirm dialog', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.setConfirmDialog({ isOpen: true, listId: 'list-1' }));
    act(() => result.current.handleCloseConfirmDialog());

    expect(result.current.confirmDialog).toEqual({ isOpen: false, listId: '' });
  });

  it('handleStartFresh should open main modal', () => {
    const { result } = renderHook(() => useShoppingModals());

    act(() => result.current.handleStartFresh());

    expect(result.current.isModalOpen).toBe(true);
  });
});
