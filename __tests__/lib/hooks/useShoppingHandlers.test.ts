/**
 * Unit tests for lib/hooks/useShoppingHandlers.ts
 *
 * Tests CRUD handler function existence and basic behavior.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useShoppingHandlers } from '@/lib/hooks/useShoppingHandlers';
import type { UseShoppingHandlersDeps } from '@/lib/hooks/useShoppingHandlers';

vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    createList: vi.fn().mockResolvedValue({ id: 'new-list' }),
    deleteList: vi.fn().mockResolvedValue(undefined),
    completeList: vi.fn().mockResolvedValue(undefined),
    toggleItem: vi.fn().mockResolvedValue(undefined),
    updateItemQuantity: vi.fn().mockResolvedValue(undefined),
    createFromTemplate: vi.fn().mockResolvedValue({ id: 'tpl-list' }),
    saveAsTemplate: vi.fn().mockResolvedValue(undefined),
    scheduleTrip: vi.fn().mockResolvedValue(undefined),
    addItemsToList: vi.fn().mockResolvedValue(undefined),
  },
  ShoppingList: {},
  CreateListInput: {},
}));

vi.mock('@/lib/services/shopping-integration-service', () => ({
  shoppingIntegrationService: {
    addMealIngredientsToList: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    createEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
  },
}));

vi.mock('@/lib/services/reminders-service', () => ({
  remindersService: {
    createReminder: vi.fn().mockResolvedValue({ id: 'reminder-1' }),
  },
}));

vi.mock('@/lib/react-query/query-client', () => ({
  QUERY_KEYS: {
    shopping: { lists: () => ['shopping', 'lists'] },
  },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showInfo: vi.fn(),
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function buildDeps(overrides: Partial<UseShoppingHandlersDeps> = {}): UseShoppingHandlersDeps {
  return {
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1' },
    spaceId: 'space-1',
    lists: [],
    invalidateShopping: vi.fn(),
    editingList: null,
    setEditingList: vi.fn(),
    confirmDialog: { isOpen: false, listId: '' },
    setConfirmDialog: vi.fn(),
    listForTemplate: null,
    setShowTemplateModal: vi.fn(),
    setListForTemplate: vi.fn(),
    listToSchedule: null,
    setShowScheduleTripModal: vi.fn(),
    setListToSchedule: vi.fn(),
    setSearchQuery: vi.fn(),
    setIsSearchTyping: vi.fn(),
    setStatusFilter: vi.fn(),
    setTimeFilter: vi.fn(),
    ...overrides,
  };
}

describe('useShoppingHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return all expected handler functions', () => {
    const { result } = renderHook(() => useShoppingHandlers(buildDeps()), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.handleCreateList).toBe('function');
    expect(typeof result.current.handleDeleteList).toBe('function');
    expect(typeof result.current.handleConfirmDelete).toBe('function');
    expect(typeof result.current.handleCompleteList).toBe('function');
    expect(typeof result.current.handleToggleItem).toBe('function');
    expect(typeof result.current.handleUpdateQuantity).toBe('function');
    expect(typeof result.current.handleSelectTemplate).toBe('function');
    expect(typeof result.current.handleSaveTemplate).toBe('function');
  });

  it('handleDeleteList should open confirm dialog', () => {
    const setConfirmDialog = vi.fn();
    const { result } = renderHook(() =>
      useShoppingHandlers(buildDeps({ setConfirmDialog })), {
        wrapper: createWrapper(),
      }
    );

    act(() => result.current.handleDeleteList('list-abc'));

    expect(setConfirmDialog).toHaveBeenCalledWith({ isOpen: true, listId: 'list-abc' });
  });
});
