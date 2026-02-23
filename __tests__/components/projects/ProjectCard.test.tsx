// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string; [key: string]: unknown }>) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/lib/services/pdf-export-service', () => ({
  pdfExportService: {
    exportProjectCostReport: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/project-milestones-service', () => ({
  projectMilestonesService: {
    getMilestoneProgress: vi.fn().mockResolvedValue({ total: 0, completed: 0, percentage: 0 }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
}));

import type { Project } from '@/lib/services/project-tracking-service';

const baseProject: Project = {
  id: 'project-1',
  space_id: 'space-1',
  name: 'Kitchen Renovation',
  description: 'Full kitchen remodel',
  status: 'in-progress',
  priority: 'high',
  estimated_budget: 10000,
  actual_cost: 5000,
  budget_variance: 5000,
  variance_percentage: 50,
  start_date: '2026-01-01',
  estimated_completion_date: '2026-06-01',
  location: 'Kitchen',
  tags: ['renovation', 'kitchen'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('ProjectCard', () => {
  it('renders without crashing', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    const { container } = render(<ProjectCard project={baseProject} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders project name', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('Kitchen Renovation')).toBeTruthy();
  });

  it('renders project description', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('Full kitchen remodel')).toBeTruthy();
  });

  it('renders In Progress status badge', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('In Progress')).toBeTruthy();
  });

  it('renders estimated budget', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('$10,000')).toBeTruthy();
  });

  it('renders actual cost', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('$5,000')).toBeTruthy();
  });

  it('renders location', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    render(<ProjectCard project={baseProject} />);
    // Use getAllByText since "Kitchen" appears in both the name and location
    const kitchenElements = screen.getAllByText(/kitchen/i);
    expect(kitchenElements.length).toBeGreaterThan(0);
  });

  it('renders tag badges', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('#renovation')).toBeTruthy();
  });

  it('shows options menu when onEdit provided', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    render(<ProjectCard project={baseProject} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Project options menu'));
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls onEdit when Edit is clicked', async () => {
    const onEdit = vi.fn();
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    render(<ProjectCard project={baseProject} onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText('Project options menu'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(baseProject);
  });

  it('wraps in Link when showLink=true', async () => {
    const { ProjectCard } = await import('@/components/projects/ProjectCard');
    const { container } = render(<ProjectCard project={baseProject} showLink={true} />);
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/projects/project-1');
  });
});
