// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Mock the UI components used inside CommentForm
vi.mock('@/components/ui/EnhancedButton', () => ({
  CTAButton: ({ children, onClick, disabled, type }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
  }) => (
    <button type={type as 'submit' | 'button' | 'reset'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  SecondaryButton: ({ children, onClick, disabled, type }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
  }) => (
    <button type={type as 'submit' | 'button' | 'reset'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
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

import CommentForm from '@/components/comments/CommentForm';

describe('CommentForm', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" />);
    expect(screen.getByPlaceholderText('Write a comment...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" placeholder="Write a reply..." />);
    expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
  });

  it('renders the Post button', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" />);
    expect(screen.getByText('Post')).toBeInTheDocument();
  });

  it('renders Cancel button when onCancel is provided', () => {
    render(<CommentForm onSubmit={onSubmit} onCancel={onCancel} spaceId="space-1" />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not render Cancel button when onCancel is not provided', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" />);
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<CommentForm onSubmit={onSubmit} onCancel={onCancel} spaceId="space-1" />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders character count', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" />);
    expect(screen.getByText('0/1000')).toBeInTheDocument();
  });

  it('updates character count as user types', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" />);
    const textarea = screen.getByPlaceholderText('Write a comment...');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(screen.getByText('5/1000')).toBeInTheDocument();
  });

  it('calls onSubmit with content on form submit', async () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" />);
    const textarea = screen.getByPlaceholderText('Write a comment...');
    fireEvent.change(textarea, { target: { value: 'My comment' } });
    fireEvent.click(screen.getByText('Post'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('My comment');
    });
  });

  it('does not submit empty comment', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" />);
    fireEvent.click(screen.getByText('Post'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders with initialValue pre-filled', () => {
    render(
      <CommentForm onSubmit={onSubmit} spaceId="space-1" initialValue="Existing text" />
    );
    expect(screen.getByDisplayValue('Existing text')).toBeInTheDocument();
  });

  it('disables textarea when isSubmitting is true', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" isSubmitting={true} />);
    expect(screen.getByPlaceholderText('Write a comment...')).toBeDisabled();
  });

  it('shows Posting... text when isSubmitting', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" isSubmitting={true} />);
    expect(screen.getByText('Posting...')).toBeInTheDocument();
  });

  it('shows @ mention hint', () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" />);
    expect(screen.getByText('Use @ to mention someone')).toBeInTheDocument();
  });

  it('submits on Enter key press without shift', async () => {
    render(<CommentForm onSubmit={onSubmit} spaceId="space-1" />);
    const textarea = screen.getByPlaceholderText('Write a comment...');
    fireEvent.change(textarea, { target: { value: 'Enter to submit' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
