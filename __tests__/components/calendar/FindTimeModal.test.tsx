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
vi.mock('@/lib/services/smart-scheduling-service', () => ({
  smartSchedulingService: {
    findOptimalTimeSlots: vi.fn().mockResolvedValue([]),
  },
  DURATION_PRESETS: [
    { label: '30 min', value: 30, icon: '⚡' },
    { label: '1 hour', value: 60, icon: '🕐' },
    { label: '2 hours', value: 120, icon: '🕑' },
  ],
}));
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode }) =>
    isOpen ? <div><h2>{title}</h2>{children}</div> : null,
}));

import { FindTimeModal } from '@/components/calendar/FindTimeModal';

describe('FindTimeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', async () => {
    render(
      <FindTimeModal
        isOpen={true}
        onClose={vi.fn()}
        spaceId="space-1"
        participants={['user-1', 'user-2']}
        onSelectTimeSlot={vi.fn()}
      />
    );
    await waitFor(() => {
      // Modal title is "Find Optimal Time"
      expect(screen.getByText('Find Optimal Time')).toBeTruthy();
    });
  });

  it('renders nothing when closed', () => {
    render(
      <FindTimeModal
        isOpen={false}
        onClose={vi.fn()}
        spaceId="space-1"
        participants={[]}
        onSelectTimeSlot={vi.fn()}
      />
    );
    expect(screen.queryByText('Find Optimal Time')).toBeNull();
  });

  it('shows duration selection', async () => {
    render(
      <FindTimeModal
        isOpen={true}
        onClose={vi.fn()}
        spaceId="space-1"
        participants={['user-1']}
        onSelectTimeSlot={vi.fn()}
      />
    );
    await waitFor(() => {
      // Duration label is "Event Duration"
      expect(screen.getByText(/Event Duration/)).toBeTruthy();
    });
  });

  it('shows no available slots when empty', async () => {
    render(
      <FindTimeModal
        isOpen={true}
        onClose={vi.fn()}
        spaceId="space-1"
        participants={['user-1']}
        onSelectTimeSlot={vi.fn()}
      />
    );
    await waitFor(() => {
      // Empty message is "No available time slots found"
      expect(screen.getByText('No available time slots found')).toBeTruthy();
    });
  });
});
