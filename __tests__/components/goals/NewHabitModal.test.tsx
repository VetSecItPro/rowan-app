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

import { NewHabitModal } from '@/components/goals/NewHabitModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  spaceId: 'space-1',
};

describe('NewHabitModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(<NewHabitModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<NewHabitModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows Create New Habit title', () => {
    render(<NewHabitModal {...defaultProps} />);
    expect(screen.getByText('Create New Habit')).toBeTruthy();
  });

  it('shows subtitle', () => {
    render(<NewHabitModal {...defaultProps} />);
    expect(screen.getByTestId('modal-subtitle').textContent).toBe('Build consistent healthy habits');
  });

  it('shows Habit Name input', () => {
    render(<NewHabitModal {...defaultProps} />);
    expect(screen.getByLabelText(/Habit Name/)).toBeTruthy();
  });

  it('shows Description textarea', () => {
    render(<NewHabitModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Add notes or details/)).toBeTruthy();
  });

  it('shows Category dropdown', () => {
    render(<NewHabitModal {...defaultProps} />);
    expect(screen.getByText('Category')).toBeTruthy();
  });

  it('shows Frequency dropdown', () => {
    render(<NewHabitModal {...defaultProps} />);
    expect(screen.getByText(/Frequency/)).toBeTruthy();
  });

  it('shows Daily Target input', () => {
    render(<NewHabitModal {...defaultProps} />);
    expect(screen.getByText('Daily Target')).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<NewHabitModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Create Habit button', () => {
    render(<NewHabitModal {...defaultProps} />);
    expect(screen.getByText('Create Habit')).toBeTruthy();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<NewHabitModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Edit Habit title when editHabit provided', () => {
    const editHabit = {
      id: 'habit-1',
      title: 'My Habit',
      frequency_type: 'daily' as const,
      space_id: 'space-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    render(<NewHabitModal {...defaultProps} editHabit={editHabit} />);
    expect(screen.getByText('Edit Habit')).toBeTruthy();
  });

  it('shows Update Habit button when editHabit provided', () => {
    const editHabit = {
      id: 'habit-1',
      title: 'My Habit',
      frequency_type: 'daily' as const,
      space_id: 'space-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    render(<NewHabitModal {...defaultProps} editHabit={editHabit} />);
    expect(screen.getByText('Update Habit')).toBeTruthy();
  });

  it('accepts title input', () => {
    render(<NewHabitModal {...defaultProps} />);
    const input = screen.getByLabelText(/Habit Name/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Daily Exercise' } });
    expect(input.value).toBe('Daily Exercise');
  });
});
