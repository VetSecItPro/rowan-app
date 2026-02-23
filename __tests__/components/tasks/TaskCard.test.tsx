// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatTimestamp: vi.fn((date: string) => date),
}));

vi.mock('@/lib/constants/item-categories', () => ({
  TASK_CATEGORIES: {
    work: { emoji: '💼', label: 'Work' },
    home: { emoji: '🏠', label: 'Home' },
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { TaskCard } from '@/components/tasks/TaskCard';
import type { Task } from '@/lib/types';

const mockTask: Task & { type?: 'task' | 'chore' } = {
  id: 'task-1',
  title: 'Test Task',
  status: 'pending',
  priority: 'medium',
  space_id: 'space-1',
  created_by: 'user-1',
  sort_order: 0,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  type: 'task',
};

describe('TaskCard', () => {
  const defaultProps = {
    task: mockTask,
    onStatusChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('Test Task')).toBeDefined();
  });

  it('renders task title', () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('Test Task')).toBeDefined();
  });

  it('renders status badge', () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('renders type badge as Task', () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText('Task')).toBeDefined();
  });

  it('renders type badge as Chore', () => {
    render(<TaskCard {...defaultProps} task={{ ...mockTask, type: 'chore' }} />);
    expect(screen.getByText('Chore')).toBeDefined();
  });

  it('calls onStatusChange when checkbox is clicked', () => {
    render(<TaskCard {...defaultProps} />);
    const checkbox = screen.getByTitle('Click to start');
    fireEvent.click(checkbox);
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('task-1', 'in-progress', 'task');
  });

  it('opens menu when options button is clicked', () => {
    render(<TaskCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Task options'));
    expect(screen.getByText('Edit')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('calls onEdit when Edit menu item is clicked', () => {
    render(<TaskCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Task options'));
    fireEvent.click(screen.getByText('Edit'));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockTask);
  });

  it('calls onDelete when Delete menu item is clicked', () => {
    render(<TaskCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Task options'));
    fireEvent.click(screen.getByText('Delete'));
    expect(defaultProps.onDelete).toHaveBeenCalledWith('task-1', 'task');
  });

  it('shows completed status badge for completed task', () => {
    render(<TaskCard {...defaultProps} task={{ ...mockTask, status: 'completed' }} />);
    expect(screen.getByText('Done')).toBeDefined();
  });

  it('shows in-progress status badge for active task', () => {
    render(<TaskCard {...defaultProps} task={{ ...mockTask, status: 'in-progress' }} />);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('shows View Details option when onViewDetails is provided and task is a task type', () => {
    render(<TaskCard {...defaultProps} onViewDetails={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Task options'));
    expect(screen.getByText('View Details')).toBeDefined();
  });
});
