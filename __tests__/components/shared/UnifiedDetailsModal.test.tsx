// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/ui/Dropdown', () => ({
  Dropdown: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder}>
      <option value="">{placeholder}</option>
      <option value="pending">Pending</option>
      <option value="completed">Completed</option>
    </select>
  ),
}));

vi.mock('@/lib/constants/item-categories', () => ({
  TASK_CATEGORIES: {
    work: { emoji: '💼', label: 'Work' },
    personal: { emoji: '👤', label: 'Personal' },
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
    completed: { emoji: '✅', label: 'Completed', description: 'Done' },
  },
}));

import { UnifiedDetailsModal } from '@/components/shared/UnifiedDetailsModal';

const mockTask = {
  id: 'task-1',
  title: 'Buy groceries',
  description: 'Get milk and eggs',
  status: 'pending',
  priority: 'medium',
  due_date: '2026-03-01T00:00:00Z',
  assigned_to: null,
  created_at: '2026-01-01T00:00:00Z',
  space_id: 'space-1',
  type: 'task' as const,
};

describe('UnifiedDetailsModal', () => {
  const defaultProps = {
    item: mockTask,
    isOpen: true,
    onClose: vi.fn(),
    spaceId: 'space-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<UnifiedDetailsModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when item is null', () => {
    const { container } = render(<UnifiedDetailsModal {...defaultProps} item={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders without crashing when open with item', () => {
    const { container } = render(<UnifiedDetailsModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays the item title in the header', () => {
    render(<UnifiedDetailsModal {...defaultProps} />);
    expect(screen.getByText('Buy groceries')).toBeTruthy();
  });

  it('shows Overview tab by default', () => {
    render(<UnifiedDetailsModal {...defaultProps} />);
    expect(screen.getByText('Overview')).toBeTruthy();
  });

  it('shows Comments tab', () => {
    render(<UnifiedDetailsModal {...defaultProps} />);
    expect(screen.getByText('Comments')).toBeTruthy();
  });

  it('shows Files tab', () => {
    render(<UnifiedDetailsModal {...defaultProps} />);
    expect(screen.getByText('Files')).toBeTruthy();
  });

  it('displays item description', () => {
    render(<UnifiedDetailsModal {...defaultProps} />);
    expect(screen.getByText('Get milk and eggs')).toBeTruthy();
  });

  it('displays Description heading', () => {
    render(<UnifiedDetailsModal {...defaultProps} />);
    expect(screen.getByText('Description')).toBeTruthy();
  });

  it('shows Close button in footer', () => {
    render(<UnifiedDetailsModal {...defaultProps} />);
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(<UnifiedDetailsModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Edit button in footer', () => {
    render(<UnifiedDetailsModal {...defaultProps} />);
    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('switches to Comments tab when clicked', () => {
    render(<UnifiedDetailsModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Comments'));
    // "Add a comment..." is a placeholder on a textarea, use getByPlaceholderText
    expect(screen.getByPlaceholderText('Add a comment...')).toBeTruthy();
  });

  it('shows "No description" placeholder when description is empty', () => {
    const itemWithNoDesc = { ...mockTask, description: '' };
    render(<UnifiedDetailsModal {...defaultProps} item={itemWithNoDesc} />);
    expect(screen.getByText('No description provided.')).toBeTruthy();
  });

  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<UnifiedDetailsModal {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockTask);
  });
});
