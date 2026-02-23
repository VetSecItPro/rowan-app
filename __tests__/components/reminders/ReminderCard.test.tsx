// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, React.FC>, {
    get: (_target, tag: string) =>
      ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatTimestamp: vi.fn(() => 'Jan 1, 12:00 PM'),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/services/reminder-attachments-service', () => ({
  reminderAttachmentsService: {
    getAttachments: vi.fn().mockResolvedValue([]),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
    getFileUrl: vi.fn((path: string) => `https://example.com/${path}`),
    isImage: vi.fn().mockReturnValue(false),
    getAttachmentIcon: vi.fn().mockReturnValue('📄'),
    formatFileSize: vi.fn().mockReturnValue('1 KB'),
  },
}));

vi.mock('@/lib/services/reminder-activity-service', () => ({
  reminderActivityService: {
    getActivityLog: vi.fn().mockResolvedValue([]),
    getActivityIcon: vi.fn().mockReturnValue('Activity'),
    getActivityColor: vi.fn().mockReturnValue('text-blue-400'),
    formatActivityMessage: vi.fn().mockReturnValue('Test activity'),
  },
}));

vi.mock('@/lib/services/reminder-comments-service', () => ({
  reminderCommentsService: {
    getComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn().mockResolvedValue({}),
    updateComment: vi.fn().mockResolvedValue({}),
    deleteComment: vi.fn().mockResolvedValue({}),
    wasEdited: vi.fn().mockReturnValue(false),
    formatCommentTime: vi.fn().mockReturnValue('2 hours ago'),
  },
}));

vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, onClose, onConfirm, title }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
  }) => isOpen ? (
    <div data-testid="confirm-dialog">
      <span>{title}</span>
      <button onClick={onConfirm} data-testid="confirm-btn">Confirm</button>
      <button onClick={onClose} data-testid="cancel-btn">Cancel</button>
    </div>
  ) : null,
}));

vi.mock('./ActivityTimeline', () => ({
  ActivityTimeline: () => <div data-testid="activity-timeline" />,
}));

vi.mock('./CommentsSection', () => ({
  CommentsSection: () => <div data-testid="comments-section" />,
}));

vi.mock('./AttachmentList', () => ({
  AttachmentList: () => <div data-testid="attachment-list" />,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  })),
}));

import { ReminderCard } from '@/components/reminders/ReminderCard';
import type { Reminder } from '@/lib/services/reminders-service';

const mockReminder: Reminder = {
  id: 'reminder-1',
  space_id: 'space-1',
  title: 'Test Reminder',
  description: 'Test description',
  emoji: '🔔',
  category: 'personal',
  reminder_time: new Date(Date.now() + 86400000).toISOString(),
  priority: 'medium',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultProps = {
  reminder: mockReminder,
  onStatusChange: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onSnooze: vi.fn(),
};

describe('ReminderCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ReminderCard {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders the reminder title', () => {
    render(<ReminderCard {...defaultProps} />);
    expect(screen.getByText('Test Reminder')).toBeTruthy();
  });

  it('renders the description', () => {
    render(<ReminderCard {...defaultProps} />);
    expect(screen.getByText('Test description')).toBeTruthy();
  });

  it('renders the emoji', () => {
    render(<ReminderCard {...defaultProps} />);
    expect(screen.getByText('🔔')).toBeTruthy();
  });

  it('renders the priority', () => {
    render(<ReminderCard {...defaultProps} />);
    expect(screen.getByText('medium')).toBeTruthy();
  });

  it('renders options menu button', () => {
    render(<ReminderCard {...defaultProps} />);
    const menuBtn = screen.getByLabelText('Reminder options menu');
    expect(menuBtn).toBeTruthy();
  });

  it('opens menu on options button click', () => {
    render(<ReminderCard {...defaultProps} />);
    const menuBtn = screen.getByLabelText('Reminder options menu');
    fireEvent.click(menuBtn);
    expect(screen.getByText('Edit Reminder')).toBeTruthy();
    expect(screen.getByText('Delete Reminder')).toBeTruthy();
  });

  it('calls onEdit when edit menu item is clicked', () => {
    const onEdit = vi.fn();
    render(<ReminderCard {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText('Reminder options menu'));
    fireEvent.click(screen.getByText('Edit Reminder'));
    expect(onEdit).toHaveBeenCalledWith(mockReminder);
  });

  it('shows delete confirm dialog when delete is clicked', () => {
    render(<ReminderCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Reminder options menu'));
    fireEvent.click(screen.getByText('Delete Reminder'));
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
  });

  it('calls onDelete when delete is confirmed', () => {
    const onDelete = vi.fn();
    render(<ReminderCard {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Reminder options menu'));
    fireEvent.click(screen.getByText('Delete Reminder'));
    fireEvent.click(screen.getByTestId('confirm-btn'));
    expect(onDelete).toHaveBeenCalledWith('reminder-1');
  });

  it('renders status checkbox', () => {
    render(<ReminderCard {...defaultProps} />);
    const statusBtn = screen.getByLabelText(/Current status: active/);
    expect(statusBtn).toBeTruthy();
  });

  it('calls onStatusChange when status checkbox is clicked', () => {
    const onStatusChange = vi.fn();
    render(<ReminderCard {...defaultProps} onStatusChange={onStatusChange} />);
    const statusBtn = screen.getByLabelText(/Current status: active/);
    fireEvent.click(statusBtn);
    expect(onStatusChange).toHaveBeenCalled();
  });

  it('renders in selection mode with checkbox', () => {
    render(
      <ReminderCard
        {...defaultProps}
        selectionMode={true}
        selected={false}
        onSelectionChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Select reminder: Test Reminder')).toBeTruthy();
  });

  it('renders completed status styling', () => {
    const completedReminder = { ...mockReminder, status: 'completed' as const };
    const { container } = render(
      <ReminderCard {...defaultProps} reminder={completedReminder} />
    );
    expect(container).toBeTruthy();
  });

  it('renders overdue state for past reminder', () => {
    const overdueReminder = {
      ...mockReminder,
      reminder_time: new Date(Date.now() - 86400000).toISOString(),
    };
    render(<ReminderCard {...defaultProps} reminder={overdueReminder} />);
    expect(screen.getByText('Overdue')).toBeTruthy();
  });
});
