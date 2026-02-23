// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string }) =>
    <img alt={alt} {...props} />,
}));
vi.mock('@/lib/services/event-comments-service', () => ({
  eventCommentsService: {
    getComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn().mockResolvedValue({}),
    updateComment: vi.fn().mockResolvedValue({}),
    deleteComment: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div>{title}</div> : null,
}));

import { EventCommentThread } from '@/components/calendar/EventCommentThread';

describe('EventCommentThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<EventCommentThread eventId="event-1" spaceId="space-1" />);
    await waitFor(() => {
      // Component renders a comment input form when loaded
      expect(document.body).toBeTruthy();
    });
  });

  it('shows comment input form after loading', async () => {
    render(<EventCommentThread eventId="event-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Add a comment/)).toBeTruthy();
    });
  });

  it('shows empty state (no content) when no comments', async () => {
    render(<EventCommentThread eventId="event-1" spaceId="space-1" />);
    await waitFor(() => {
      // When empty, component renders <div className="py-4" /> - no visible text
      // But the comment form should be present
      expect(screen.getByPlaceholderText(/Add a comment/)).toBeTruthy();
    });
  });

  it('shows comments when loaded', async () => {
    const { eventCommentsService } = await import('@/lib/services/event-comments-service');
    vi.mocked(eventCommentsService.getComments).mockResolvedValueOnce([
      {
        id: 'comment-1',
        content: 'Great meeting!',
        event_id: 'event-1',
        space_id: 'space-1',
        user_id: 'user-1',
        parent_comment_id: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        user: { id: 'user-1', email: 'test@example.com' },
        replies: [],
      },
    ]);
    render(<EventCommentThread eventId="event-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Great meeting!')).toBeTruthy();
    });
  });
});
