// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space' },
    hasZeroSpaces: false,
    user: { id: 'user-1', email: 'test@example.com' },
    spaces: [{ id: 'space-1', name: 'Test Space', role: 'admin' }],
  })),
}));

vi.mock('@/lib/services/task-recurrence-service', () => ({
  taskRecurrenceService: {
    createRecurringTask: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/chore-calendar-service', () => ({
  choreCalendarService: {
    syncChoreToCalendar: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/components/ui/Dropdown', () => ({
  Dropdown: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid="dropdown">
      <option value="">{placeholder}</option>
      <option value="work">Work</option>
      <option value="medium">Medium</option>
    </select>
  ),
}));

vi.mock('@/components/ui/DateTimePicker', () => ({
  DateTimePicker: ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <label>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  ),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/constants/item-categories', () => ({
  TASK_CATEGORIES: {
    work: { emoji: '💼', label: 'Work' },
  },
  CHORE_CATEGORIES: {
    cleaning: { emoji: '🧹', label: 'Cleaning' },
  },
  PRIORITY_LEVELS: {
    medium: { emoji: '🟡', label: 'Medium', description: 'Normal priority' },
    high: { emoji: '🔴', label: 'High', description: 'High priority' },
  },
  STATUS_TYPES: {
    pending: { emoji: '⏳', label: 'Pending', description: 'Not started' },
  },
  FAMILY_ROLES: {
    parent: { emoji: '👨', label: 'Parent', description: 'Head of household' },
  },
  RECURRING_PATTERNS: {
    daily: { label: 'Daily' },
    weekly: { label: 'Weekly' },
  },
}));

import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { UnifiedItemModal } from '@/components/shared/UnifiedItemModal';

describe('UnifiedItemModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    spaceId: 'space-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthWithSpaces).mockReturnValue({
      currentSpace: { id: 'space-1', name: 'Test Space' },
      hasZeroSpaces: false,
      user: { id: 'user-1', email: 'test@example.com' },
      spaces: [{ id: 'space-1', name: 'Test Space', role: 'admin' }],
    } as ReturnType<typeof useAuthWithSpaces>);
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<UnifiedItemModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<UnifiedItemModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows Task/Chore toggle buttons', () => {
    render(<UnifiedItemModal {...defaultProps} />);
    expect(screen.getByText('Task')).toBeTruthy();
    expect(screen.getByText('Chore')).toBeTruthy();
  });

  it('shows New Task heading by default', () => {
    render(<UnifiedItemModal {...defaultProps} />);
    expect(screen.getByText(/New Task/)).toBeTruthy();
  });

  it('shows New Chore heading when defaultType is chore', () => {
    render(<UnifiedItemModal {...defaultProps} defaultType="chore" />);
    expect(screen.getByText(/New Chore/)).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<UnifiedItemModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<UnifiedItemModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Create Task submit button', () => {
    render(<UnifiedItemModal {...defaultProps} />);
    expect(screen.getByTestId('task-submit-button')).toBeTruthy();
  });

  it('submit button is disabled when title is empty', () => {
    render(<UnifiedItemModal {...defaultProps} />);
    const submitBtn = screen.getByTestId('task-submit-button');
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });

  it('shows task title input', () => {
    render(<UnifiedItemModal {...defaultProps} />);
    expect(screen.getByTestId('task-title-input')).toBeTruthy();
  });

  it('enables submit button when title has value', () => {
    render(<UnifiedItemModal {...defaultProps} />);
    const titleInput = screen.getByTestId('task-title-input');
    fireEvent.change(titleInput, { target: { value: 'Buy groceries' } });
    const submitBtn = screen.getByTestId('task-submit-button');
    expect(submitBtn.hasAttribute('disabled')).toBe(false);
  });

  it('shows section navigation tabs', () => {
    render(<UnifiedItemModal {...defaultProps} />);
    expect(screen.getByText('Basics')).toBeTruthy();
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('Schedule')).toBeTruthy();
  });

  it('shows Edit mode when mode is quickEdit', () => {
    const editItem = {
      id: 'task-1',
      title: 'Existing task',
      type: 'task' as const,
      space_id: 'space-1',
      status: 'pending',
      created_at: '2026-01-01',
    };
    render(<UnifiedItemModal {...defaultProps} mode="quickEdit" editItem={editItem} />);
    expect(screen.getByText(/Edit Task/)).toBeTruthy();
  });

  it('shows space error when hasZeroSpaces is true and no spaceId provided', () => {
    vi.mocked(useAuthWithSpaces).mockReturnValue({
      currentSpace: null,
      hasZeroSpaces: true,
      user: { id: 'user-1', email: 'test@example.com' },
      spaces: [],
    } as ReturnType<typeof useAuthWithSpaces>);

    render(<UnifiedItemModal {...defaultProps} spaceId={undefined} />);
    // Should show space creation required message or the error overlay
    expect(screen.getByText(/Please create a workspace/)).toBeTruthy();
  });
});
