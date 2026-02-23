// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/services/comments-service', () => ({
  createComment: vi.fn().mockResolvedValue({ id: 'new-comment' }),
  updateComment: vi.fn().mockResolvedValue({ id: 'comment-1' }),
  toggleReaction: vi.fn().mockResolvedValue(undefined),
  getCommentReactions: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/comments/CommentForm', () => ({
  default: ({ onSubmit, onCancel, placeholder }: {
    onSubmit: (c: string) => void;
    onCancel?: () => void;
    placeholder?: string;
  }) => (
    <div data-testid="comment-form">
      <input data-testid="comment-input" placeholder={placeholder} />
      <button onClick={() => onSubmit('test reply')}>Submit</button>
      {onCancel && <button onClick={onCancel}>Cancel</button>}
    </div>
  ),
}));

vi.mock('@/components/comments/ReactionPicker', () => ({
  default: ({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) => (
    <div data-testid="reaction-picker">
      <button onClick={() => onSelect('👍')}>👍</button>
      <button onClick={onClose}>Close</button>
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

import CommentItem from '@/components/comments/CommentItem';

const sampleComment = {
  id: 'comment-1',
  content: 'This is a test comment',
  created_by: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  space_id: 'space-1',
  commentable_type: 'task' as const,
  commentable_id: 'task-1',
  parent_comment_id: null,
  thread_depth: 0,
  is_edited: false,
  is_pinned: false,
  user_email: 'test@example.com',
  replies: [],
};

const defaultProps = {
  comment: sampleComment,
  onDelete: vi.fn(),
  onPin: vi.fn(),
  onReply: vi.fn(),
  spaceId: 'space-1',
  commentableType: 'task' as const,
  commentableId: 'task-1',
  maxDepth: 5,
  currentUserId: 'user-1',
};

describe('CommentItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });

  it('renders the comment content', () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });

  it('renders user email username', () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders user avatar with initial', () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders edit button for comment owner', () => {
    render(<CommentItem {...defaultProps} />);
    const editButton = screen.getByTitle('Edit');
    expect(editButton).toBeInTheDocument();
  });

  it('renders delete button for comment owner', () => {
    render(<CommentItem {...defaultProps} />);
    const deleteButton = screen.getByTitle('Delete');
    expect(deleteButton).toBeInTheDocument();
  });

  it('does not render edit/delete buttons for non-owner', () => {
    render(<CommentItem {...defaultProps} currentUserId="other-user" />);
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<CommentItem {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('Delete'));
    expect(onDelete).toHaveBeenCalledWith('comment-1');
  });

  it('calls onPin when pin button is clicked', () => {
    const onPin = vi.fn();
    render(<CommentItem {...defaultProps} onPin={onPin} />);
    fireEvent.click(screen.getByTitle('Pin'));
    expect(onPin).toHaveBeenCalledWith('comment-1');
  });

  it('renders Reply button when thread depth allows', () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.getByText('Reply')).toBeInTheDocument();
  });

  it('does not render Reply button at max depth', () => {
    render(
      <CommentItem
        {...defaultProps}
        comment={{ ...sampleComment, thread_depth: 5 }}
        maxDepth={5}
      />
    );
    expect(screen.queryByText('Reply')).not.toBeInTheDocument();
  });

  it('renders React button', () => {
    render(<CommentItem {...defaultProps} />);
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('shows editing form when edit button is clicked', () => {
    render(<CommentItem {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Edit'));
    expect(screen.getByTestId('comment-form')).toBeInTheDocument();
  });

  it('shows reply form when Reply is clicked', () => {
    render(<CommentItem {...defaultProps} />);
    fireEvent.click(screen.getByText('Reply'));
    expect(screen.getByTestId('comment-form')).toBeInTheDocument();
  });

  it('shows reaction picker when React is clicked', () => {
    render(<CommentItem {...defaultProps} />);
    fireEvent.click(screen.getByText('React'));
    expect(screen.getByTestId('reaction-picker')).toBeInTheDocument();
  });

  it('renders nested replies', () => {
    const commentWithReplies = {
      ...sampleComment,
      replies: [
        {
          ...sampleComment,
          id: 'reply-1',
          content: 'This is a reply',
          thread_depth: 1,
        },
      ],
    };
    render(<CommentItem {...defaultProps} comment={commentWithReplies} />);
    expect(screen.getByText('This is a reply')).toBeInTheDocument();
  });

  it('shows edited badge when comment is edited', () => {
    render(
      <CommentItem
        {...defaultProps}
        comment={{ ...sampleComment, is_edited: true }}
      />
    );
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('renders with no currentUserId without crashing', () => {
    render(<CommentItem {...defaultProps} currentUserId={undefined} />);
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });
});
