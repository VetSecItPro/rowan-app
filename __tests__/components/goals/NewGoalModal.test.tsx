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
        <div data-testid="modal-footer">{footer}</div>
      </div>
    );
  },
}));

vi.mock('@/components/ui/Dropdown', () => ({
  Dropdown: ({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: Array<{ value: string; label: string }> }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid="dropdown">
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}));

import { NewGoalModal } from '@/components/goals/NewGoalModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  spaceId: 'space-1',
};

describe('NewGoalModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(<NewGoalModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders Create New Goal title when creating', () => {
    render(<NewGoalModal {...defaultProps} />);
    expect(screen.getByText('Create New Goal')).toBeTruthy();
  });

  it('renders Edit Goal title when editing', () => {
    const editGoal = {
      id: 'goal-1', space_id: 'space-1', title: 'Existing Goal', status: 'active' as const,
      progress: 0, created_at: '', updated_at: '',
    };
    render(<NewGoalModal {...defaultProps} editGoal={editGoal} />);
    expect(screen.getByText('Edit Goal')).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<NewGoalModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('renders title input', () => {
    render(<NewGoalModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('e.g., Save for dream vacation')).toBeTruthy();
  });

  it('renders description textarea', () => {
    render(<NewGoalModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('Add details about this goal...')).toBeTruthy();
  });

  it('renders progress input', () => {
    render(<NewGoalModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('0')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<NewGoalModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders Create Goal button', () => {
    render(<NewGoalModal {...defaultProps} />);
    expect(screen.getByText('Create Goal')).toBeTruthy();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<NewGoalModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('updates title on input', () => {
    render(<NewGoalModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('e.g., Save for dream vacation') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My new goal' } });
    expect(input.value).toBe('My new goal');
  });

  it('renders emoji picker button', () => {
    render(<NewGoalModal {...defaultProps} />);
    expect(screen.getByLabelText('Add emoji to title')).toBeTruthy();
  });

  it('shows emoji picker on click', () => {
    render(<NewGoalModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Add emoji to title'));
    expect(screen.getByText('Select an emoji')).toBeTruthy();
  });

  it('renders dependency dropdown when availableGoals provided', () => {
    const availableGoals = [
      { id: 'goal-2', space_id: 'space-1', title: 'Other Goal', status: 'active' as const, progress: 0, created_at: '', updated_at: '' },
    ];
    render(<NewGoalModal {...defaultProps} availableGoals={availableGoals} />);
    expect(screen.getByText('Depends on (optional)')).toBeTruthy();
  });

  it('shows assigned to dropdown when spaceMembers provided', () => {
    const spaceMembers = [{ id: 'user-1', name: 'John', email: 'john@example.com' }];
    render(<NewGoalModal {...defaultProps} spaceMembers={spaceMembers} />);
    expect(screen.getByText('Assigned To')).toBeTruthy();
  });

  it('renders Update Goal button when editing', () => {
    const editGoal = {
      id: 'goal-1', space_id: 'space-1', title: 'Existing', status: 'active' as const,
      progress: 50, created_at: '', updated_at: '',
    };
    render(<NewGoalModal {...defaultProps} editGoal={editGoal} />);
    expect(screen.getByText('Update Goal')).toBeTruthy();
  });
});
