// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockUseAuth } = vi.hoisted(() => {
  const mockUseAuth = vi.fn(() => ({
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: null,
    },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }));
  return { mockUseAuth };
});

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('@/lib/services/reminder-comments-service', () => ({
  reminderCommentsService: {
    getComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn().mockResolvedValue({ id: 'c-1', content: 'Test' }),
    updateComment: vi.fn().mockResolvedValue({}),
    deleteComment: vi.fn().mockResolvedValue({}),
    wasEdited: vi.fn().mockReturnValue(false),
    formatCommentTime: vi.fn().mockReturnValue('2 hours ago'),
  },
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

vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, onClose, onConfirm, title }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
  }) => isOpen ? (
    <div data-testid="confirm-dialog">
      <span>{title}</span>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ) : null,
}));

vi.mock('@/components/reminders/MentionInput', () => ({
  MentionInput: ({ value, onChange, placeholder, rows, maxLength, disabled, className }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
    maxLength?: number;
    disabled?: boolean;
    className?: string;
  }) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid="mention-input"
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      className={className}
    />
  ),
}));

import { CommentsSection } from '@/components/reminders/CommentsSection';

describe('CommentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: null,
      },
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
  });

  it('renders without crashing', () => {
    const { container } = render(
      <CommentsSection reminderId="reminder-1" spaceId="space-1" />
    );
    expect(container).toBeTruthy();
  });

  it('renders the Comments header', () => {
    render(<CommentsSection reminderId="reminder-1" spaceId="space-1" />);
    expect(screen.getByText('Comments')).toBeTruthy();
  });

  it('renders loading state initially', () => {
    render(<CommentsSection reminderId="reminder-1" spaceId="space-1" />);
    expect(screen.getByText('Loading comments...')).toBeTruthy();
  });

  it('renders the mention input for new comment', () => {
    render(<CommentsSection reminderId="reminder-1" spaceId="space-1" />);
    expect(screen.getByTestId('mention-input')).toBeTruthy();
  });

  it('renders the Post button', () => {
    render(<CommentsSection reminderId="reminder-1" spaceId="space-1" />);
    expect(screen.getByText('Post')).toBeTruthy();
  });

  it('renders nothing when user is null', () => {
    mockUseAuth.mockReturnValueOnce({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
    const { container } = render(
      <CommentsSection reminderId="reminder-1" spaceId="space-1" />
    );
    expect(container.firstChild).toBeNull();
  });
});
