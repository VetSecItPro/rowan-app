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
vi.mock('@/lib/utils/toast', () => ({
  showWarning: vi.fn(),
  showError: vi.fn(),
}));
vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ event: { title: 'Meeting', startTime: null }, rateLimitRemaining: 10 }),
  }),
}));
vi.mock('@/lib/services/natural-language-parser', () => ({
  parseEventText: vi.fn().mockReturnValue({
    title: 'Test Event',
    startTime: new Date(),
    endTime: null,
    location: null,
    category: 'personal',
    isRecurring: false,
    recurrencePattern: null,
  }),
  getEventSuggestions: vi.fn().mockReturnValue([
    'Doctor appointment next Tuesday at 2pm',
    'Team meeting every Monday at 10am',
  ]),
  isValidParsedEvent: vi.fn().mockReturnValue(true),
}));

import { QuickAddEvent } from '@/components/calendar/QuickAddEvent';

describe('QuickAddEvent', () => {
  const defaultProps = {
    onCreateEvent: vi.fn(),
    isOpen: true,
    onClose: vi.fn(),
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<QuickAddEvent {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Quick Add Event')).toBeNull();
  });

  it('renders when open', () => {
    render(<QuickAddEvent {...defaultProps} />);
    expect(screen.getByText('Quick Add Event')).toBeTruthy();
  });

  it('shows Quick Parse and AI Parse mode buttons', () => {
    render(<QuickAddEvent {...defaultProps} />);
    expect(screen.getByText('Quick Parse')).toBeTruthy();
    expect(screen.getByText(/AI Parse/)).toBeTruthy();
  });

  it('shows text input in quick mode', () => {
    render(<QuickAddEvent {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Doctor appointment/);
    expect(input).toBeTruthy();
  });

  it('shows Create Event button', () => {
    render(<QuickAddEvent {...defaultProps} />);
    expect(screen.getByText('Create Event')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<QuickAddEvent {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows example phrases button when no input and quick mode', () => {
    render(<QuickAddEvent {...defaultProps} />);
    expect(screen.getByText('Show example phrases')).toBeTruthy();
  });
});
