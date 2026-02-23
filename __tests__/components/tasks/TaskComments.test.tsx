// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/task-comments-service', () => ({
  taskCommentsService: {
    getComments: vi.fn().mockResolvedValue([]),
    addComment: vi.fn().mockResolvedValue({}),
    addCommentReaction: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/components/ui/EnhancedButton', () => ({
  CTAButton: ({ children, type, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { feature?: string }) => (
    <button type={type} {...props}>{children}</button>
  ),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { TaskComments } from '@/components/tasks/TaskComments';

describe('TaskComments', () => {
  const defaultProps = {
    taskId: 'task-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const { container } = render(<TaskComments {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('shows loading state initially', () => {
    render(<TaskComments {...defaultProps} />);
    expect(screen.getByText('Loading comments...')).toBeDefined();
  });

  it('shows Comments header after loading', async () => {
    render(<TaskComments {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Comments/)).toBeDefined();
    });
  });

  it('shows comment input field', async () => {
    render(<TaskComments {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a comment...')).toBeDefined();
    });
  });

  it('renders with existing comments', async () => {
    const { taskCommentsService } = await import('@/lib/services/task-comments-service');
    (taskCommentsService.getComments as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 'c-1', content: 'Great work!', task_id: 'task-1', user_id: 'user-1', created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]);
    render(<TaskComments {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Great work!')).toBeDefined();
    });
  });
});
