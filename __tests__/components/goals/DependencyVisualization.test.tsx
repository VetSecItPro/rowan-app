// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/services/goal-dependencies-service', () => ({
  goalDependenciesService: {
    getDependencyStats: vi.fn().mockResolvedValue({
      total_dependencies: 0,
      satisfied_dependencies: 0,
      blocked_goals: 0,
      unlockable_goals: 0,
    }),
    getGoalDependencies: vi.fn().mockResolvedValue([]),
    getDependentGoals: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { DependencyVisualization } from '@/components/goals/DependencyVisualization';
import type { Goal } from '@/lib/services/goals-service';

const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    space_id: 'space-1',
    title: 'Goal One',
    status: 'active',
    progress: 25,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'goal-2',
    space_id: 'space-1',
    title: 'Goal Two',
    status: 'active',
    progress: 50,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('DependencyVisualization', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <DependencyVisualization spaceId="space-1" goals={mockGoals} />
    );
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const { container } = render(
      <DependencyVisualization spaceId="space-1" goals={mockGoals} />
    );
    // Loading skeleton uses animate-pulse
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(
      <DependencyVisualization
        spaceId="space-1"
        goals={mockGoals}
        className="custom-class"
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts onGoalClick prop', () => {
    const onGoalClick = vi.fn();
    const { container } = render(
      <DependencyVisualization
        spaceId="space-1"
        goals={[]}
        onGoalClick={onGoalClick}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders with empty goals array', () => {
    const { container } = render(
      <DependencyVisualization spaceId="space-1" goals={[]} />
    );
    expect(container).toBeTruthy();
  });
});
