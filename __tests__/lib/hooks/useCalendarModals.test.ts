/**
 * Unit tests for lib/hooks/useCalendarModals.ts
 *
 * Tests modal open/close state management for calendar UI.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarModals } from '@/lib/hooks/useCalendarModals';

describe('useCalendarModals', () => {
  it('should initialize all modals as closed', () => {
    const { result } = renderHook(() => useCalendarModals());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.editingEvent).toBeNull();
    expect(result.current.detailEvent).toBeNull();
    expect(result.current.isProposalModalOpen).toBe(false);
    expect(result.current.isQuickAddOpen).toBe(false);
    expect(result.current.isTemplateLibraryOpen).toBe(false);
    expect(result.current.isBulkManagerOpen).toBe(false);
    expect(result.current.confirmDialog).toEqual({ isOpen: false, eventId: '' });
    expect(result.current.isPreviewModalOpen).toBe(false);
    expect(result.current.selectedUnifiedItem).toBeNull();
  });

  it('should open and close event modal via setIsModalOpen', () => {
    const { result } = renderHook(() => useCalendarModals());

    act(() => result.current.setIsModalOpen(true));
    expect(result.current.isModalOpen).toBe(true);

    act(() => result.current.setIsModalOpen(false));
    expect(result.current.isModalOpen).toBe(false);
  });

  it('should close all modals via closeAllModals', () => {
    const { result } = renderHook(() => useCalendarModals());

    act(() => {
      result.current.setIsModalOpen(true);
      result.current.setIsQuickAddOpen(true);
      result.current.setIsProposalModalOpen(true);
    });

    expect(result.current.isModalOpen).toBe(true);

    act(() => result.current.closeAllModals());

    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.isQuickAddOpen).toBe(false);
    expect(result.current.isProposalModalOpen).toBe(false);
    expect(result.current.editingEvent).toBeNull();
    expect(result.current.confirmDialog).toEqual({ isOpen: false, eventId: '' });
  });

  it('openModalForAction should open quick-add modal', () => {
    const { result } = renderHook(() => useCalendarModals());

    act(() => result.current.openModalForAction('quick-add'));
    expect(result.current.isQuickAddOpen).toBe(true);
  });

  it('openModalForAction should open templates modal', () => {
    const { result } = renderHook(() => useCalendarModals());

    act(() => result.current.openModalForAction('templates'));
    expect(result.current.isTemplateLibraryOpen).toBe(true);
  });

  it('openModalForAction should open proposal modal', () => {
    const { result } = renderHook(() => useCalendarModals());

    act(() => result.current.openModalForAction('propose'));
    expect(result.current.isProposalModalOpen).toBe(true);
  });

  it('openModalForAction should open new event modal by default', () => {
    const { result } = renderHook(() => useCalendarModals());

    act(() => result.current.openModalForAction('new-event'));
    expect(result.current.isModalOpen).toBe(true);
  });

  it('should set and clear confirmDialog', () => {
    const { result } = renderHook(() => useCalendarModals());

    act(() => result.current.setConfirmDialog({ isOpen: true, eventId: 'event-abc' }));
    expect(result.current.confirmDialog).toEqual({ isOpen: true, eventId: 'event-abc' });

    act(() => result.current.closeAllModals());
    expect(result.current.confirmDialog).toEqual({ isOpen: false, eventId: '' });
  });
});
