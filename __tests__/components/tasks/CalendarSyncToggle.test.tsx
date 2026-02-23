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

vi.mock('@/lib/services/task-calendar-service', () => ({
  taskCalendarService: {
    getCalendarPreferences: vi.fn().mockResolvedValue({ auto_sync_tasks: false }),
    syncTaskToCalendar: vi.fn().mockResolvedValue({ event_id: 'evt-1' }),
    unsyncFromCalendar: vi.fn().mockResolvedValue({}),
    updateCalendarPreferences: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement(tag as keyof JSX.IntrinsicElements, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { taskCalendarService } from '@/lib/services/task-calendar-service';
import { CalendarSyncToggle } from '@/components/tasks/CalendarSyncToggle';

describe('CalendarSyncToggle', () => {
  const defaultProps = {
    taskId: 'task-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default resolved value after each test
    vi.mocked(taskCalendarService.getCalendarPreferences).mockResolvedValue({ auto_sync_tasks: false });
    vi.mocked(taskCalendarService.syncTaskToCalendar).mockResolvedValue({ event_id: 'evt-1' });
    vi.mocked(taskCalendarService.unsyncFromCalendar).mockResolvedValue({});
    vi.mocked(taskCalendarService.updateCalendarPreferences).mockResolvedValue({});
  });

  it('renders without crashing', () => {
    const { container } = render(<CalendarSyncToggle {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('renders the component', () => {
    // The component renders either loading or loaded state
    const { container } = render(<CalendarSyncToggle {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows Calendar Sync toggle after loading', async () => {
    render(<CalendarSyncToggle {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Calendar Sync')).toBeDefined();
    });
  });

  it('shows Auto-sync preference after loading', async () => {
    render(<CalendarSyncToggle {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Auto-sync new tasks')).toBeDefined();
    });
  });

  it('shows info note about calendar sync', async () => {
    render(<CalendarSyncToggle {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Calendar sync uses/)).toBeDefined();
    });
  });
});
