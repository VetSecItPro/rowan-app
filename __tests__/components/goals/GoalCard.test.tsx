// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalCard } from '@/components/goals/GoalCard';
import type { Goal } from '@/lib/services/goals-service';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatDate: vi.fn((date: string) => date),
  formatTimestamp: vi.fn((ts: string) => ts),
  getCurrentDateString: vi.fn(() => '2026-02-22'),
}));

const mockGoal: Goal = {
  id: 'goal-1',
  space_id: 'space-1',
  title: 'Test Goal',
  description: 'A test goal description',
  category: '💰 Financial',
  status: 'active',
  progress: 50,
  target_date: '2026-12-31',
  is_pinned: false,
  priority: 'p2',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const defaultProps = {
  goal: mockGoal,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('GoalCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<GoalCard {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('displays goal title', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText('Test Goal')).toBeTruthy();
  });

  it('displays goal description', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText('A test goal description')).toBeTruthy();
  });

  it('displays progress percentage', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('renders progress bar', () => {
    const { container } = render(<GoalCard {...defaultProps} />);
    const progressbar = container.querySelector('[role="progressbar"]');
    expect(progressbar).toBeTruthy();
  });

  it('renders options menu button', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByLabelText('Goal options menu')).toBeTruthy();
  });

  it('opens menu on options click', () => {
    render(<GoalCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Goal options menu'));
    expect(screen.getByText('Edit Goal')).toBeTruthy();
    expect(screen.getByText('Delete Goal')).toBeTruthy();
  });

  it('calls onEdit when Edit Goal is clicked', () => {
    const onEdit = vi.fn();
    render(<GoalCard {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText('Goal options menu'));
    fireEvent.click(screen.getByText('Edit Goal'));
    expect(onEdit).toHaveBeenCalledWith(mockGoal);
  });

  it('calls onDelete when Delete Goal is clicked', () => {
    const onDelete = vi.fn();
    render(<GoalCard {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Goal options menu'));
    fireEvent.click(screen.getByText('Delete Goal'));
    expect(onDelete).toHaveBeenCalledWith('goal-1');
  });

  it('displays status badge', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText('active')).toBeTruthy();
  });

  it('renders pin button when onTogglePin provided', () => {
    const onTogglePin = vi.fn();
    render(<GoalCard {...defaultProps} onTogglePin={onTogglePin} />);
    expect(screen.getByLabelText(/Pin Test Goal/)).toBeTruthy();
  });

  it('shows priority button when onPriorityChange provided', () => {
    const onPriorityChange = vi.fn();
    render(<GoalCard {...defaultProps} onPriorityChange={onPriorityChange} />);
    expect(screen.getByText('P2')).toBeTruthy();
  });

  it('renders status checkbox button', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByLabelText(/Toggle goal status/)).toBeTruthy();
  });

  it('cycles status on checkbox click', () => {
    const onStatusChange = vi.fn();
    render(<GoalCard {...defaultProps} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText(/Toggle goal status/));
    expect(onStatusChange).toHaveBeenCalled();
  });

  it('shows Check In option when onCheckIn provided and goal is active', () => {
    const onCheckIn = vi.fn();
    render(<GoalCard {...defaultProps} onCheckIn={onCheckIn} />);
    fireEvent.click(screen.getByLabelText('Goal options menu'));
    expect(screen.getByText('Check In')).toBeTruthy();
  });

  it('shows Check-In History when onShowHistory provided', () => {
    const onShowHistory = vi.fn();
    render(<GoalCard {...defaultProps} onShowHistory={onShowHistory} />);
    fireEvent.click(screen.getByLabelText('Goal options menu'));
    expect(screen.getByText('Check-In History')).toBeTruthy();
  });

  it('renders target date when provided', () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText('2026-12-31')).toBeTruthy();
  });

  it('renders completed goal with checkmark style', () => {
    const completedGoal = { ...mockGoal, status: 'completed' as const, progress: 100 };
    const { container } = render(<GoalCard {...defaultProps} goal={completedGoal} />);
    expect(container).toBeTruthy();
  });

  it('renders assignee when provided', () => {
    const goalWithAssignee = {
      ...mockGoal,
      assignee: { id: 'user-1', name: 'John Doe', avatar_url: null },
    };
    render(<GoalCard {...defaultProps} goal={goalWithAssignee} />);
    expect(screen.getByText('John Doe')).toBeTruthy();
  });
});
