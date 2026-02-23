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

vi.mock('@/lib/services/task-subtasks-service', () => ({
  taskSubtasksService: {
    getSubtasks: vi.fn().mockResolvedValue([]),
    createSubtask: vi.fn().mockResolvedValue({}),
    updateSubtask: vi.fn().mockResolvedValue({}),
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

import { SubtasksList } from '@/components/tasks/SubtasksList';

describe('SubtasksList', () => {
  const defaultProps = {
    taskId: 'task-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const { container } = render(<SubtasksList {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('shows loading state initially', () => {
    render(<SubtasksList {...defaultProps} />);
    expect(screen.getByText('Loading subtasks...')).toBeDefined();
  });

  it('shows Subtasks header after loading', async () => {
    render(<SubtasksList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Subtasks')).toBeDefined();
    });
  });

  it('shows add subtask input', async () => {
    render(<SubtasksList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a subtask...')).toBeDefined();
    });
  });

  it('renders with existing subtasks', async () => {
    const { taskSubtasksService } = await import('@/lib/services/task-subtasks-service');
    (taskSubtasksService.getSubtasks as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 'sub-1', title: 'Subtask One', status: 'pending', parent_task_id: 'task-1', sort_order: 0, created_by: 'user-1', created_at: '' },
    ]);
    render(<SubtasksList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Subtask One')).toBeDefined();
    });
  });
});
