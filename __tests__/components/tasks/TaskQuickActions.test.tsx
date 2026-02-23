// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/quick-actions-service', () => ({
  quickActionsService: {
    trackAction: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { TaskQuickActions } from '@/components/tasks/TaskQuickActions';

describe('TaskQuickActions', () => {
  const defaultProps = {
    taskId: 'task-1',
    spaceId: 'space-1',
    userId: 'user-1',
    onAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TaskQuickActions {...defaultProps} />);
    expect(screen.getByText('Complete')).toBeDefined();
  });

  it('renders all action buttons', () => {
    render(<TaskQuickActions {...defaultProps} />);
    expect(screen.getByText('Complete')).toBeDefined();
    expect(screen.getByText('Snooze')).toBeDefined();
    expect(screen.getByText('Assign')).toBeDefined();
    expect(screen.getByText('Repeat')).toBeDefined();
    expect(screen.getByText('Comment')).toBeDefined();
    expect(screen.getByText('Attach')).toBeDefined();
  });

  it('calls onAction when an action button is clicked', async () => {
    render(<TaskQuickActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Complete'));
    await vi.waitFor(() => {
      expect(defaultProps.onAction).toHaveBeenCalledWith('complete');
    });
  });
});
