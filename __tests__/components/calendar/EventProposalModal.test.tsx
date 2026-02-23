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
vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@/lib/services/event-proposals-service', () => ({
  eventProposalsService: {
    createProposal: vi.fn().mockResolvedValue({}),
    getProposal: vi.fn().mockResolvedValue(null),
    getVoteSummary: vi.fn().mockResolvedValue({}),
    getVotes: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode; subtitle?: string }) =>
    isOpen ? <div><h2>{title}</h2>{children}</div> : null,
}));
vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

import { EventProposalModal } from '@/components/calendar/EventProposalModal';

describe('EventProposalModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    render(
      <EventProposalModal
        isOpen={true}
        onClose={vi.fn()}
        spaceId="space-1"
      />
    );
    // Modal title is "Propose Event Times" in create mode
    expect(screen.getByText('Propose Event Times')).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(
      <EventProposalModal
        isOpen={false}
        onClose={vi.fn()}
        spaceId="space-1"
      />
    );
    expect(screen.queryByText('Propose Event Times')).toBeNull();
  });

  it('shows title input field', () => {
    render(
      <EventProposalModal
        isOpen={true}
        onClose={vi.fn()}
        spaceId="space-1"
      />
    );
    // Placeholder is "e.g., Team Planning Session"
    expect(screen.getByPlaceholderText(/Team Planning Session/)).toBeTruthy();
  });

  it('shows Add Another Time Option button', () => {
    render(
      <EventProposalModal
        isOpen={true}
        onClose={vi.fn()}
        spaceId="space-1"
      />
    );
    expect(screen.getByText(/Add Another Time Option/)).toBeTruthy();
  });
});
