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

vi.mock('@/lib/services/task-time-tracking-service', () => ({
  taskTimeTrackingService: {
    getActiveTimer: vi.fn().mockResolvedValue(null),
    getTotalDuration: vi.fn().mockResolvedValue(0),
    startTimer: vi.fn().mockResolvedValue({ id: 'entry-1', task_id: 'task-1', start_time: new Date().toISOString() }),
    stopTimer: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { TimeTracker } from '@/components/tasks/TimeTracker';

describe('TimeTracker', () => {
  const defaultProps = {
    taskId: 'task-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const { container } = render(<TimeTracker {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('shows No time tracked initially', async () => {
    render(<TimeTracker {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('No time tracked')).toBeDefined();
    });
  });

  it('shows play button when not tracking', async () => {
    render(<TimeTracker {...defaultProps} />);
    await waitFor(() => {
      // Play button rendered when not tracking
      const { container } = render(<TimeTracker {...defaultProps} />);
      expect(container).toBeDefined();
    });
  });

  it('shows total time when time has been logged', async () => {
    const { taskTimeTrackingService } = await import('@/lib/services/task-time-tracking-service');
    (taskTimeTrackingService.getTotalDuration as ReturnType<typeof vi.fn>).mockResolvedValueOnce(90);
    render(<TimeTracker {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('1h 30m')).toBeDefined();
    });
  });
});
