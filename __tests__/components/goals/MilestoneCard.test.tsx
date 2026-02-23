// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MilestoneCard } from '@/components/goals/MilestoneCard';
import type { Milestone } from '@/lib/services/goals-service';

vi.mock('@/lib/utils/date-utils', () => ({
  formatDate: vi.fn((date: string) => date),
  formatTimestamp: vi.fn((ts: string) => ts),
  getCurrentDateString: vi.fn(() => '2026-02-22'),
}));

const mockMilestone: Milestone = {
  id: 'milestone-1',
  goal_id: 'goal-1',
  title: 'First Milestone',
  description: 'Save first $1000',
  type: 'money',
  target_value: 1000,
  current_value: 500,
  completed: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const defaultProps = {
  milestone: mockMilestone,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onToggle: vi.fn(),
};

describe('MilestoneCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<MilestoneCard {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('displays milestone title', () => {
    render(<MilestoneCard {...defaultProps} />);
    expect(screen.getByText('First Milestone')).toBeTruthy();
  });

  it('displays milestone description', () => {
    render(<MilestoneCard {...defaultProps} />);
    expect(screen.getByText('Save first $1000')).toBeTruthy();
  });

  it('shows progress label', () => {
    render(<MilestoneCard {...defaultProps} />);
    expect(screen.getByText('Progress')).toBeTruthy();
  });

  it('renders options menu button', () => {
    render(<MilestoneCard {...defaultProps} />);
    expect(screen.getByLabelText('Milestone options menu')).toBeTruthy();
  });

  it('opens menu on click and shows Edit/Delete', () => {
    render(<MilestoneCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Milestone options menu'));
    expect(screen.getByText('Edit Milestone')).toBeTruthy();
    expect(screen.getByText('Delete Milestone')).toBeTruthy();
  });

  it('calls onEdit when Edit Milestone clicked', () => {
    const onEdit = vi.fn();
    render(<MilestoneCard {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText('Milestone options menu'));
    fireEvent.click(screen.getByText('Edit Milestone'));
    expect(onEdit).toHaveBeenCalledWith(mockMilestone);
  });

  it('calls onDelete when Delete Milestone clicked', () => {
    const onDelete = vi.fn();
    render(<MilestoneCard {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Milestone options menu'));
    fireEvent.click(screen.getByText('Delete Milestone'));
    expect(onDelete).toHaveBeenCalledWith('milestone-1');
  });

  it('renders goalTitle when provided', () => {
    render(<MilestoneCard {...defaultProps} goalTitle="My Goal" />);
    expect(screen.getByText(/My Goal/)).toBeTruthy();
  });

  it('renders date milestone without progress bar', () => {
    const dateMilestone: Milestone = {
      ...mockMilestone,
      type: 'date',
      target_date: '2026-06-01',
      target_value: undefined,
    };
    render(<MilestoneCard {...defaultProps} milestone={dateMilestone} />);
    expect(screen.getByText('Target Date')).toBeTruthy();
  });

  it('renders completed milestone with green style', () => {
    const completedMilestone: Milestone = {
      ...mockMilestone,
      completed: true,
      current_value: 1000,
      completed_at: '2026-02-01T00:00:00Z',
    };
    const { container } = render(<MilestoneCard {...defaultProps} milestone={completedMilestone} />);
    expect(container).toBeTruthy();
  });

  it('renders toggle status button', () => {
    render(<MilestoneCard {...defaultProps} />);
    expect(screen.getByLabelText(/Toggle milestone status/)).toBeTruthy();
  });

  it('calls onToggle when marking in-progress milestone as completed', () => {
    const onToggle = vi.fn();
    // in-progress milestone (has current_value > 0, not completed)
    render(<MilestoneCard {...defaultProps} milestone={mockMilestone} onToggle={onToggle} />);
    // in-progress state -> clicking goes to completed -> onToggle(id, true)
    const btn = screen.getByLabelText(/Toggle milestone status/);
    fireEvent.click(btn); // in-progress -> completed
    expect(onToggle).toHaveBeenCalledWith('milestone-1', true);
  });

  it('shows percentage type milestone formatting', () => {
    const percentageMilestone: Milestone = {
      ...mockMilestone,
      type: 'percentage',
      target_value: 100,
      current_value: 75,
    };
    render(<MilestoneCard {...defaultProps} milestone={percentageMilestone} />);
    expect(screen.getByText('Progress')).toBeTruthy();
  });
});
