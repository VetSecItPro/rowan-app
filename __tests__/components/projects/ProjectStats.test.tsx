// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/services/project-tracking-service', () => ({
  getProjectStats: vi.fn().mockResolvedValue({
    total_projects: 5,
    active_projects: 3,
    completed_projects: 2,
    total_estimated_budget: 50000,
    total_actual_cost: 40000,
    total_variance: 10000,
    projects_over_budget: 1,
    projects_under_budget: 2,
    avg_variance_percentage: 20,
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('ProjectStats', () => {
  it('renders without crashing', async () => {
    const ProjectStatsComponent = (await import('@/components/projects/ProjectStats')).default;
    const { container } = render(<ProjectStatsComponent spaceId="space-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows loading skeleton initially', async () => {
    const ProjectStatsComponent = (await import('@/components/projects/ProjectStats')).default;
    const { container } = render(<ProjectStatsComponent spaceId="space-1" />);
    expect(container.querySelector('[class*="animate-pulse"]')).toBeTruthy();
  });

  it('renders Total Projects after loading', async () => {
    const ProjectStatsComponent = (await import('@/components/projects/ProjectStats')).default;
    render(<ProjectStatsComponent spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Total Projects')).toBeTruthy();
    });
  });

  it('renders total project count', async () => {
    const ProjectStatsComponent = (await import('@/components/projects/ProjectStats')).default;
    render(<ProjectStatsComponent spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('5')).toBeTruthy();
    });
  });

  it('renders total budget after loading', async () => {
    const ProjectStatsComponent = (await import('@/components/projects/ProjectStats')).default;
    render(<ProjectStatsComponent spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('$50,000')).toBeTruthy();
    });
  });

  it('renders error state when fetch fails', async () => {
    const { getProjectStats } = await import('@/lib/services/project-tracking-service');
    vi.mocked(getProjectStats).mockRejectedValueOnce(new Error('Network error'));
    const ProjectStatsComponent = (await import('@/components/projects/ProjectStats')).default;
    render(<ProjectStatsComponent spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load project statistics/i)).toBeTruthy();
    });
  });
});
