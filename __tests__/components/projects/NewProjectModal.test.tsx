// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/project-milestones-service', () => ({
  projectMilestonesService: {
    getMilestones: vi.fn().mockResolvedValue([]),
    createManyMilestones: vi.fn().mockResolvedValue([]),
    deleteMilestone: vi.fn().mockResolvedValue(undefined),
    toggleMilestone: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({
    children,
    title,
    isOpen,
    footer,
  }: React.PropsWithChildren<{ title?: string; isOpen?: boolean; footer?: React.ReactNode }>) =>
    isOpen
      ? React.createElement('div', { 'data-testid': 'modal' }, [
          React.createElement('h2', { key: 'title' }, title),
          children,
          footer,
        ])
      : null,
}));

describe('NewProjectModal', () => {
  it('renders without crashing when closed', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    const { container } = render(
      <NewProjectModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders modal when open', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('renders Create New Project title', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByText(/create new project/i)).toBeTruthy();
  });

  it('renders Project Name label', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByText(/project name \*/i)).toBeTruthy();
  });

  it('renders Description label', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByText(/^description$/i)).toBeTruthy();
  });

  it('renders Status label', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByText(/^status$/i)).toBeTruthy();
  });

  it('renders Budget Amount label', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByText(/budget amount/i)).toBeTruthy();
  });

  it('renders Steps section', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByText(/^steps$/i)).toBeTruthy();
  });

  it('renders Create Project button', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByRole('button', { name: /create project/i })).toBeTruthy();
  });

  it('renders Cancel button', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
  });

  it('renders Add a step placeholder input', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
      />
    );
    expect(screen.getByPlaceholderText(/add a step/i)).toBeTruthy();
  });

  it('shows Edit Project title and Save Project button when editProject provided', async () => {
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    const editProject = {
      id: 'proj-1',
      space_id: 'space-1',
      name: 'Kitchen Renovation',
      description: 'Full remodel',
      status: 'in-progress' as const,
      start_date: null,
      estimated_completion_date: null,
      estimated_budget: 15000,
      actual_cost: 0,
      location: null,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      milestones: [],
      expenses: [],
      milestone_count: 0,
      completed_milestone_count: 0,
    };
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(null)}
        spaceId="space-1"
        editProject={editProject}
      />
    );
    expect(screen.getByText(/edit project/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /save project/i })).toBeTruthy();
  });

  it('calls onSave when form is submitted with project name', async () => {
    const onSave = vi.fn().mockResolvedValue({ id: 'new-proj' });
    const { NewProjectModal } = await import('@/components/projects/NewProjectModal');
    render(
      <NewProjectModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
        spaceId="space-1"
      />
    );
    // Project Name input is the first text input (no htmlFor on the label)
    const nameInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(nameInput, { target: { value: 'Garage Cleanup' } });
    fireEvent.click(screen.getByRole('button', { name: /create project/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Garage Cleanup', space_id: 'space-1' })
    );
  });
});
