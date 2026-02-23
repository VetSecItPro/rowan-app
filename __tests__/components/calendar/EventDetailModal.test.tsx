// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, session: null, loading: false, signOut: vi.fn() })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen ? <div><h2>{title}</h2>{children}</div> : null,
}));
vi.mock('@/components/calendar/EventCommentThread', () => ({
  EventCommentThread: () => <div data-testid="comment-thread">CommentThread</div>,
}));
vi.mock('@/components/calendar/AttachmentGallery', () => ({
  AttachmentGallery: () => <div data-testid="attachment-gallery">AttachmentGallery</div>,
}));
vi.mock('@/components/calendar/WeatherBadge', () => ({
  WeatherBadge: () => <div data-testid="weather-badge">Weather</div>,
}));
vi.mock('@/lib/services/event-comments-service', () => ({
  eventCommentsService: {
    getComments: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/lib/services/event-attachments-service', () => ({
  eventAttachmentsService: {
    getAttachments: vi.fn().mockResolvedValue([]),
    getAttachmentUrl: vi.fn().mockResolvedValue(''),
  },
}));

import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import type { CalendarEvent } from '@/lib/services/calendar-service';

const mockEvent: CalendarEvent = {
  id: 'ev-1',
  title: 'Board Meeting',
  description: 'Quarterly review',
  start_time: '2024-01-15T10:00:00Z',
  end_time: '2024-01-15T11:00:00Z',
  location: 'HQ',
  space_id: 'space-1',
  category: 'work',
  status: 'not-started',
  is_recurring: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('EventDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    render(<EventDetailModal isOpen={true} onClose={vi.fn()} event={mockEvent} />);
    expect(screen.getByText('Board Meeting')).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(<EventDetailModal isOpen={false} onClose={vi.fn()} event={mockEvent} />);
    expect(screen.queryByText('Board Meeting')).toBeNull();
  });

  it('shows event description', () => {
    render(<EventDetailModal isOpen={true} onClose={vi.fn()} event={mockEvent} />);
    expect(screen.getByText('Quarterly review')).toBeTruthy();
  });

  it('shows event location', () => {
    render(<EventDetailModal isOpen={true} onClose={vi.fn()} event={mockEvent} />);
    expect(screen.getByText('HQ')).toBeTruthy();
  });

  it('shows Comments tab', () => {
    render(<EventDetailModal isOpen={true} onClose={vi.fn()} event={mockEvent} />);
    // There may be multiple elements containing "Comments" - use getAllByText
    const commentEls = screen.getAllByText(/Comments/);
    expect(commentEls.length).toBeGreaterThan(0);
  });

  it('shows status badge', () => {
    render(<EventDetailModal isOpen={true} onClose={vi.fn()} event={mockEvent} />);
    expect(screen.getByText('Not Started')).toBeTruthy();
  });
});
