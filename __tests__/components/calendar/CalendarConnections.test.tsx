// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test Space' },
  })),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
  }),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
    removeChannel: vi.fn(),
  })),
}));

import { CalendarConnections } from '@/components/calendar/CalendarConnections';

describe('CalendarConnections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<CalendarConnections />);
    await waitFor(() => {
      expect(screen.getByText('Calendar Integrations')).toBeTruthy();
    });
  });

  it('shows all provider names', async () => {
    render(<CalendarConnections />);
    await waitFor(() => {
      expect(screen.getByText('Google Calendar')).toBeTruthy();
      expect(screen.getByText('Apple Calendar')).toBeTruthy();
      expect(screen.getByText('Microsoft Outlook')).toBeTruthy();
      expect(screen.getByText('ICS Feed')).toBeTruthy();
      expect(screen.getByText('Cozi')).toBeTruthy();
    });
  });

  it('shows connect buttons for each provider', async () => {
    render(<CalendarConnections />);
    await waitFor(() => {
      const connectButtons = screen.getAllByText('Connect');
      expect(connectButtons.length).toBeGreaterThanOrEqual(5);
    });
  });

  it('shows how calendar sync works info box', async () => {
    render(<CalendarConnections />);
    await waitFor(() => {
      expect(screen.getByText('How Calendar Sync Works')).toBeTruthy();
    });
  });
});
