// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const mockGetComments = vi.fn().mockResolvedValue([]);
const mockCreateComment = vi.fn().mockResolvedValue({ id: 'new-comment' });
const mockDeleteComment = vi.fn().mockResolvedValue(undefined);
const mockTogglePinComment = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/services/comments-service', () => ({
  getComments: (...args: unknown[]) => mockGetComments(...args),
  createComment: (...args: unknown[]) => mockCreateComment(...args),
  deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
  togglePinComment: (...args: unknown[]) => mockTogglePinComment(...args),
}));

vi.mock('@/lib/hooks/useUser', () => ({
  useUser: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/comments/CommentItem', () => ({
  default: ({ comment }: { comment: { content: string } }) => (
    <div data-testid="comment-item">{comment.content}</div>
  ),
}));

vi.mock('@/components/comments/CommentForm', () => ({
  default: ({ onSubmit, placeholder }: {
    onSubmit: (c: string) => void;
    placeholder?: string;
  }) => (
    <div data-testid="comment-form">
      <input placeholder={placeholder} />
      <button onClick={() => onSubmit('new comment')}>Post</button>
    </div>
  ),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, props as Record<string, unknown>, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import CommentThread from '@/components/comments/CommentThread';

const defaultProps = {
  commentableType: 'task' as const,
  commentableId: 'task-1',
  spaceId: 'space-1',
};

describe('CommentThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetComments.mockResolvedValue([]);
  });

  it('renders without crashing', async () => {
    render(<CommentThread {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Add a comment')).toBeInTheDocument();
    });
  });

  it('renders loading spinner initially', () => {
    let resolve: (val: unknown) => void;
    mockGetComments.mockReturnValueOnce(new Promise(res => { resolve = res; }));

    render(<CommentThread {...defaultProps} />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    resolve!([]);
  });

  it('renders the comment form after loading', async () => {
    render(<CommentThread {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('comment-form')).toBeInTheDocument();
    });
  });

  it('renders empty state when no comments', async () => {
    render(<CommentThread {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument();
    });
  });

  it('renders comments when data is loaded', async () => {
    mockGetComments.mockResolvedValueOnce([
      {
        id: 'comment-1',
        content: 'First comment',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        is_pinned: false,
        is_edited: false,
        thread_depth: 0,
        replies: [],
        user_email: 'test@example.com',
      },
    ]);

    render(<CommentThread {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('First comment')).toBeInTheDocument();
    });
  });

  it('separates pinned and regular comments', async () => {
    mockGetComments.mockResolvedValueOnce([
      {
        id: 'comment-1',
        content: 'Pinned comment',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        is_pinned: true,
        is_edited: false,
        thread_depth: 0,
        replies: [],
        user_email: 'test@example.com',
      },
      {
        id: 'comment-2',
        content: 'Regular comment',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        is_pinned: false,
        is_edited: false,
        thread_depth: 0,
        replies: [],
        user_email: 'test@example.com',
      },
    ]);

    render(<CommentThread {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Pinned Comments')).toBeInTheDocument();
      expect(screen.getByText('Pinned comment')).toBeInTheDocument();
      expect(screen.getByText('Regular comment')).toBeInTheDocument();
    });
  });

  it('renders error state when loading fails', async () => {
    mockGetComments.mockRejectedValueOnce(new Error('Network error'));

    render(<CommentThread {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
    });
  });
});
