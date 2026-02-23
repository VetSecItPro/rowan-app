// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showWarning: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/lib/services/reminders-bulk-service', () => ({
  remindersBulkService: {
    completeReminders: vi.fn().mockResolvedValue({ success: true, successCount: 1, failedCount: 0 }),
    deleteReminders: vi.fn().mockResolvedValue({ success: true, successCount: 1, failedCount: 0 }),
    changePriority: vi.fn().mockResolvedValue({ success: true, successCount: 1, failedCount: 0 }),
    changeCategory: vi.fn().mockResolvedValue({ success: true, successCount: 1, failedCount: 0 }),
    exportToJSON: vi.fn().mockReturnValue('[]'),
    exportToCSV: vi.fn().mockReturnValue(''),
    downloadFile: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, React.FC>, {
    get: (_target, tag: string) =>
      ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { BulkActionsToolbar } from '@/components/reminders/BulkActionsToolbar';
import type { Reminder } from '@/lib/services/reminders-service';

const mockReminder: Reminder = {
  id: 'reminder-1',
  space_id: 'space-1',
  title: 'Test Reminder',
  description: '',
  emoji: '🔔',
  category: 'personal',
  reminder_time: '',
  priority: 'medium',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultProps = {
  selectedCount: 2,
  selectedReminders: [mockReminder],
  onClearSelection: vi.fn(),
  onComplete: vi.fn(),
};

describe('BulkActionsToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<BulkActionsToolbar {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows selected count', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    expect(screen.getByText('2 selected')).toBeTruthy();
  });

  it('renders Complete button', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    expect(screen.getByText('Complete')).toBeTruthy();
  });

  it('renders Priority button', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    expect(screen.getByText('Priority')).toBeTruthy();
  });

  it('renders Category button', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    expect(screen.getByText('Category')).toBeTruthy();
  });

  it('renders Delete button', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('returns null when selectedCount is 0', () => {
    const { container } = render(
      <BulkActionsToolbar {...defaultProps} selectedCount={0} />
    );
    // Toolbar should not be rendered
    expect(container.firstChild).toBeNull();
  });

  it('shows complete confirm dialog when Complete is clicked', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Complete'));
    expect(screen.getByText(/Complete 2 Reminder/)).toBeTruthy();
  });

  it('shows delete confirm dialog when Delete is clicked', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByText(/Delete 2 Reminder/)).toBeTruthy();
  });

  it('calls onClearSelection when X button is clicked', () => {
    const onClearSelection = vi.fn();
    render(<BulkActionsToolbar {...defaultProps} onClearSelection={onClearSelection} />);
    // The X button
    const closeBtn = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:bg-gray-700')
    );
    // Click the close/X button (last button without text)
    const allButtons = screen.getAllByRole('button');
    const closeButton = allButtons[allButtons.length - 1];
    fireEvent.click(closeButton);
    expect(onClearSelection).toHaveBeenCalled();
  });

  it('shows priority menu when Priority button is clicked', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Priority'));
    expect(screen.getByText('low')).toBeTruthy();
    expect(screen.getByText('medium')).toBeTruthy();
    expect(screen.getByText('high')).toBeTruthy();
    expect(screen.getByText('urgent')).toBeTruthy();
  });

  it('shows category menu when Category button is clicked', () => {
    render(<BulkActionsToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Category'));
    expect(screen.getByText('bills')).toBeTruthy();
    expect(screen.getByText('health')).toBeTruthy();
    expect(screen.getByText('work')).toBeTruthy();
  });
});
