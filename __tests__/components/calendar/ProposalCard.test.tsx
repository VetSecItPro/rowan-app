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
vi.mock('@/lib/services/event-proposals-service', () => ({
  eventProposalsService: {
    voteOnProposal: vi.fn().mockResolvedValue({}),
  },
}));

import { ProposalCard } from '@/components/calendar/ProposalCard';
import type { EventProposal } from '@/lib/services/event-proposals-service';

const mockProposal: EventProposal = {
  id: 'proposal-1',
  space_id: 'space-1',
  title: 'Team Lunch',
  description: 'Monthly team lunch',
  location: 'Restaurant',
  proposed_by: 'user-2',
  status: 'pending',
  time_slots: [
    {
      start_time: '2024-01-20T12:00:00Z',
      end_time: '2024-01-20T13:00:00Z',
      label: 'Saturday Noon',
    },
  ],
  votes: [],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  proposer: { id: 'user-2', email: 'user2@example.com', raw_user_meta_data: { name: 'User Two' } },
};

describe('ProposalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProposalCard proposal={mockProposal} onVote={vi.fn()} />);
    expect(screen.getByText('Team Lunch')).toBeTruthy();
  });

  it('shows proposal description', () => {
    render(<ProposalCard proposal={mockProposal} onVote={vi.fn()} />);
    expect(screen.getByText('Monthly team lunch')).toBeTruthy();
  });

  it('shows pending status badge', () => {
    render(<ProposalCard proposal={mockProposal} onVote={vi.fn()} />);
    expect(screen.getByText('Pending Votes')).toBeTruthy();
  });

  it('shows time slots', () => {
    render(<ProposalCard proposal={mockProposal} onVote={vi.fn()} />);
    expect(screen.getByText('Saturday Noon')).toBeTruthy();
  });

  it('shows voting buttons for pending proposals', () => {
    render(<ProposalCard proposal={mockProposal} onVote={vi.fn()} />);
    expect(screen.getByText('Preferred')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('Unavailable')).toBeTruthy();
  });

  it('shows proposer info', () => {
    render(<ProposalCard proposal={mockProposal} onVote={vi.fn()} />);
    expect(screen.getByText(/Proposed by/)).toBeTruthy();
  });
});
