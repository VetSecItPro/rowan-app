// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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
vi.mock('@/lib/services/event-proposals-service', () => ({
  eventProposalsService: {
    getProposals: vi.fn().mockResolvedValue([]),
    approveProposal: vi.fn().mockResolvedValue({}),
    rejectProposal: vi.fn().mockResolvedValue({}),
    subscribeToProposals: vi.fn().mockReturnValue({ id: 'channel-1' }),
  },
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    removeChannel: vi.fn(),
  })),
}));
vi.mock('@/components/calendar/ProposalCard', () => ({
  ProposalCard: ({ proposal }: { proposal: { title: string } }) => (
    <div data-testid="proposal-card">{proposal.title}</div>
  ),
}));

import { ProposalsList } from '@/components/calendar/ProposalsList';
import { eventProposalsService } from '@/lib/services/event-proposals-service';

describe('ProposalsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<ProposalsList spaceId="space-1" />);
    await waitFor(() => {
      // Default selectedStatus is 'pending', so empty shows "No pending proposals"
      expect(screen.getByText('No pending proposals')).toBeTruthy();
    });
  });

  it('shows empty state when no proposals', async () => {
    render(<ProposalsList spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('No pending proposals')).toBeTruthy();
    });
  });

  it('shows status filter buttons', async () => {
    render(<ProposalsList spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeTruthy();
      expect(screen.getByText('Pending')).toBeTruthy();
      expect(screen.getByText('Approved')).toBeTruthy();
      expect(screen.getByText('Rejected')).toBeTruthy();
    });
  });

  it('shows proposals when loaded', async () => {
    vi.mocked(eventProposalsService.getProposals).mockResolvedValueOnce([
      {
        id: 'p-1',
        space_id: 'space-1',
        title: 'Friday Game Night',
        proposed_by: 'user-2',
        status: 'pending',
        time_slots: [],
        votes: [],
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      },
    ] as never);
    render(<ProposalsList spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Friday Game Night')).toBeTruthy();
    });
  });

  it('shows propose button when onCreateProposal provided', async () => {
    render(<ProposalsList spaceId="space-1" onCreateProposal={vi.fn()} />);
    await waitFor(() => {
      // Button has tooltip/label - check for any element with "Propose" text
      const proposeEls = screen.queryAllByText(/Propose/);
      expect(proposeEls.length).toBeGreaterThan(0);
    });
  });
});
