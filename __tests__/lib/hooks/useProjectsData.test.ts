/**
 * Unit tests for lib/hooks/useProjectsData.ts
 *
 * Tests initial state, tab management, and search/filter state.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectsData } from '@/lib/hooks/useProjectsData';

const mockSearchParams = { get: vi.fn().mockReturnValue(null) };
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn() }),
}));

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space' },
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

vi.mock('@/lib/services/projects-service', () => ({
  projectsOnlyService: {
    getProjects: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: {
    getExpenses: vi.fn().mockResolvedValue([]),
    getBudget: vi.fn().mockResolvedValue(0),
    getBudgetStats: vi.fn().mockResolvedValue({ monthlyBudget: 0, spentThisMonth: 0, remaining: 0, pendingBills: 0 }),
  },
  Expense: {},
}));

vi.mock('@/lib/services/bills-service', () => ({
  billsService: {
    getBills: vi.fn().mockResolvedValue([]),
  },
  Bill: {},
}));

vi.mock('@/lib/services/budget-templates-service', () => ({
  budgetTemplatesService: {
    getTemplates: vi.fn().mockResolvedValue([]),
    getTemplateCategories: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe('useProjectsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.get.mockReturnValue(null);
  });

  it('should return initial state with empty data', async () => {
    const { result } = renderHook(() => useProjectsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.projects).toEqual([]);
    expect(result.current.expenses).toEqual([]);
    expect(result.current.bills).toEqual([]);
  });

  it('should default to projects tab', () => {
    const { result } = renderHook(() => useProjectsData());

    expect(result.current.activeTab).toBe('projects');
  });

  it('handleTabChange should update active tab', async () => {
    const { result } = renderHook(() => useProjectsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.handleTabChange('budgets'));

    expect(result.current.activeTab).toBe('budgets');
  });

  it('should use tab from URL search params', () => {
    mockSearchParams.get.mockReturnValue('bills');

    const { result } = renderHook(() => useProjectsData());

    expect(result.current.activeTab).toBe('bills');
  });

  it('should expose setSearchQuery and update search state', async () => {
    const { result } = renderHook(() => useProjectsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery('office'));

    expect(result.current.searchQuery).toBe('office');
  });

  it('should expose filteredProjects, filteredExpenses, filteredBills', async () => {
    const { result } = renderHook(() => useProjectsData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.filteredProjects)).toBe(true);
    expect(Array.isArray(result.current.filteredExpenses)).toBe(true);
    expect(Array.isArray(result.current.filteredBills)).toBe(true);
  });
});
