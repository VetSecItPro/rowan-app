/**
 * Unit tests for lib/hooks/useProjectsData.ts (PR14: projects-only).
 * Budget/expense data moved to useBudgetData; this hook now manages
 * home-renovation projects + search/filter.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectsData } from '@/lib/hooks/useProjectsData';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space' },
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

const getProjects = vi.fn().mockResolvedValue([]);
vi.mock('@/lib/services/projects-service', () => ({
  projectsOnlyService: { getProjects: (...args: unknown[]) => getProjects(...args) },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn() })),
    removeChannel: vi.fn(),
  })),
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

describe('useProjectsData (projects-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjects.mockResolvedValue([]);
  });

  it('returns initial state with empty projects', async () => {
    const { result } = renderHook(() => useProjectsData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects).toEqual([]);
    expect(Array.isArray(result.current.filteredProjects)).toBe(true);
  });

  it('defaults the project filter to "all"', () => {
    const { result } = renderHook(() => useProjectsData());
    expect(result.current.projectFilter).toBe('all');
  });

  it('updates search state via setSearchQuery', async () => {
    const { result } = renderHook(() => useProjectsData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSearchQuery('kitchen'));
    expect(result.current.searchQuery).toBe('kitchen');
  });

  it('filters projects by search query (title match)', async () => {
    getProjects.mockResolvedValue([
      { id: '1', name: 'Kitchen remodel', status: 'in_progress' },
      { id: '2', name: 'Garage cleanup', status: 'completed' },
    ]);
    const { result } = renderHook(() => useProjectsData());
    await waitFor(() => expect(result.current.projects.length).toBe(2));
    act(() => result.current.setSearchQuery('kitchen'));
    expect(result.current.filteredProjects.map((p) => p.id)).toEqual(['1']);
  });

  it('filters by status (active excludes completed)', async () => {
    getProjects.mockResolvedValue([
      { id: '1', name: 'A', status: 'in_progress' },
      { id: '2', name: 'B', status: 'completed' },
    ]);
    const { result } = renderHook(() => useProjectsData());
    await waitFor(() => expect(result.current.projects.length).toBe(2));
    act(() => result.current.setProjectFilter('active'));
    expect(result.current.filteredProjects.map((p) => p.id)).toEqual(['1']);
    act(() => result.current.setProjectFilter('completed'));
    expect(result.current.filteredProjects.map((p) => p.id)).toEqual(['2']);
  });
});
