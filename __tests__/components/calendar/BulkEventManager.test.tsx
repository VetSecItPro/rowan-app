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
vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    getDeletedEvents: vi.fn().mockResolvedValue([]),
    deleteEventsBySource: vi.fn().mockResolvedValue({ deleted: 0, errors: [] }),
    deleteEvents: vi.fn().mockResolvedValue({ deleted: 0, errors: [] }),
    restoreEvent: vi.fn().mockResolvedValue({}),
    deleteEvent: vi.fn().mockResolvedValue({}),
    purgeDeletedEvents: vi.fn().mockResolvedValue({ deleted: 0, errors: [] }),
  },
}));

import { BulkEventManager } from '@/components/calendar/BulkEventManager';
import type { CalendarEvent } from '@/lib/services/calendar-service';

const mockEvents: CalendarEvent[] = [
  {
    id: 'ev-1',
    title: 'Google Event',
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T11:00:00Z',
    event_type: 'google',
    space_id: 'space-1',
    category: 'personal',
    status: 'not-started',
    is_recurring: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

describe('BulkEventManager', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    spaceId: 'space-1',
    events: mockEvents,
    onEventsDeleted: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <BulkEventManager {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    render(<BulkEventManager {...defaultProps} />);
    expect(screen.getByText('Manage Events')).toBeTruthy();
  });

  it('shows bulk delete and trash tabs', () => {
    render(<BulkEventManager {...defaultProps} />);
    expect(screen.getByText('Bulk Delete')).toBeTruthy();
    expect(screen.getByText('Trash')).toBeTruthy();
  });

  it('shows event sources in manage tab', () => {
    render(<BulkEventManager {...defaultProps} />);
    expect(screen.getByText('Google Calendar')).toBeTruthy();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<BulkEventManager {...defaultProps} onClose={onClose} />);
    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find(btn => btn.textContent === 'Close');
    if (closeBtn) fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('switches to trash tab when clicked', async () => {
    render(<BulkEventManager {...defaultProps} />);
    fireEvent.click(screen.getByText('Trash'));
    // After clicking trash tab, trash empty state should appear
    await screen.findByText('Trash is empty');
  });
});
