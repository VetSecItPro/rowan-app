// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, subtitle, footer }: { isOpen: boolean; children: React.ReactNode; title: string; subtitle?: string; footer: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {subtitle && <p data-testid="modal-subtitle">{subtitle}</p>}
        {children}
        <div>{footer}</div>
      </div>
    );
  },
}));

vi.mock('@/lib/services/goal-dependencies-service', () => ({
  goalDependenciesService: {
    getGoalDependencies: vi.fn().mockResolvedValue([]),
    getAvailableGoalsForDependency: vi.fn().mockResolvedValue([]),
    createDependency: vi.fn().mockResolvedValue({}),
    deleteDependency: vi.fn().mockResolvedValue({}),
    bypassDependency: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { DependenciesModal } from '@/components/goals/DependenciesModal';
import type { Goal } from '@/lib/services/goals-service';

const mockGoal: Goal = {
  id: 'goal-1',
  space_id: 'space-1',
  title: 'My Goal',
  status: 'active',
  progress: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  goal: mockGoal,
  spaceId: 'space-1',
  userId: 'user-1',
};

describe('DependenciesModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(<DependenciesModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<DependenciesModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows Goal Dependencies title', () => {
    render(<DependenciesModal {...defaultProps} />);
    expect(screen.getByText('Goal Dependencies')).toBeTruthy();
  });

  it('shows goal title in subtitle', () => {
    render(<DependenciesModal {...defaultProps} />);
    expect(screen.getByTestId('modal-subtitle').textContent).toBe('My Goal');
  });

  it('shows Add Dependency button', () => {
    render(<DependenciesModal {...defaultProps} />);
    expect(screen.getByText('Add Dependency')).toBeTruthy();
  });

  it('shows Current Dependencies heading', () => {
    render(<DependenciesModal {...defaultProps} />);
    expect(screen.getByText(/Current Dependencies/)).toBeTruthy();
  });

  it('shows Close button in footer', () => {
    render(<DependenciesModal {...defaultProps} />);
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('calls onClose when Close button clicked', () => {
    const onClose = vi.fn();
    render(<DependenciesModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows add form when Add Dependency clicked', () => {
    render(<DependenciesModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Dependency'));
    expect(screen.getByText('Add New Dependency')).toBeTruthy();
  });

  it('shows dependency type options in add form', () => {
    render(<DependenciesModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Dependency'));
    expect(screen.getByText('Prerequisite')).toBeTruthy();
    expect(screen.getByText('Trigger')).toBeTruthy();
    expect(screen.getByText('Blocking')).toBeTruthy();
  });

  it('shows auto unlock checkbox in add form', () => {
    render(<DependenciesModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Dependency'));
    expect(screen.getByText(/Automatically unlock/)).toBeTruthy();
  });

  it('hides add form when Cancel clicked in form', () => {
    render(<DependenciesModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Dependency'));
    // Click cancel inside the form (last Cancel button)
    const cancelButtons = screen.getAllByText('Cancel');
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.queryByText('Add New Dependency')).toBeNull();
  });
});
