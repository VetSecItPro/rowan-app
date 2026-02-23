// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; footer: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        <div>{footer}</div>
      </div>
    );
  },
}));

vi.mock('@/components/ui/Dropdown', () => ({
  Dropdown: ({ value, onChange, options, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
  }) => (
    <select
      data-testid="dropdown"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));

import { NewMilestoneModal } from '@/components/goals/NewMilestoneModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  editMilestone: null,
  goalId: 'goal-1',
};

describe('NewMilestoneModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(<NewMilestoneModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<NewMilestoneModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows New Milestone title', () => {
    render(<NewMilestoneModal {...defaultProps} />);
    expect(screen.getByText('New Milestone')).toBeTruthy();
  });

  it('shows title input field', () => {
    render(<NewMilestoneModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Save \$5,000/)).toBeTruthy();
  });

  it('shows description textarea', () => {
    render(<NewMilestoneModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Add details about this milestone/)).toBeTruthy();
  });

  it('shows milestone type options', () => {
    render(<NewMilestoneModal {...defaultProps} />);
    expect(screen.getByText('Percentage')).toBeTruthy();
    expect(screen.getByText('Money')).toBeTruthy();
    expect(screen.getByText('Count')).toBeTruthy();
    expect(screen.getByText('Date')).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<NewMilestoneModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Create Milestone button', () => {
    render(<NewMilestoneModal {...defaultProps} />);
    expect(screen.getByText('Create Milestone')).toBeTruthy();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<NewMilestoneModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Edit Milestone title when editMilestone provided', () => {
    const editMilestone = {
      id: 'ms-1',
      goal_id: 'goal-1',
      title: 'Existing Milestone',
      type: 'percentage' as const,
      target_value: 100,
      current_value: 50,
      completed: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    render(<NewMilestoneModal {...defaultProps} editMilestone={editMilestone} />);
    expect(screen.getByText('Edit Milestone')).toBeTruthy();
  });

  it('shows Update Milestone button when editMilestone provided', () => {
    const editMilestone = {
      id: 'ms-1',
      goal_id: 'goal-1',
      title: 'Existing Milestone',
      type: 'percentage' as const,
      target_value: 100,
      current_value: 50,
      completed: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    render(<NewMilestoneModal {...defaultProps} editMilestone={editMilestone} />);
    expect(screen.getByText('Update Milestone')).toBeTruthy();
  });

  it('shows emoji picker button', () => {
    render(<NewMilestoneModal {...defaultProps} />);
    expect(screen.getByTitle('Add emoji')).toBeTruthy();
  });

  it('shows emoji picker when emoji button clicked', () => {
    render(<NewMilestoneModal {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Add emoji'));
    expect(screen.getByText('Select an emoji')).toBeTruthy();
  });

  it('shows date input when Date type selected', () => {
    render(<NewMilestoneModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Date'));
    expect(screen.getByText(/Target Date/)).toBeTruthy();
  });

  it('shows dependency dropdown when availableGoals provided', () => {
    const availableGoals = [
      {
        id: 'other-goal',
        title: 'Other Goal',
        space_id: 'space-1',
        status: 'active' as const,
        progress: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];
    render(<NewMilestoneModal {...defaultProps} availableGoals={availableGoals} />);
    expect(screen.getByText(/Depends on Goal/)).toBeTruthy();
  });
});
