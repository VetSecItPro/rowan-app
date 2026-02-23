/**
 * Tests for event-proposals-service.ts
 * Covers CRUD operations, vote summary calculation, and proposal lifecycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventProposalsService, type TimeSlot } from '@/lib/services/event-proposals-service';

// ---------------------------------------------------------------------------
// Chain mock helper
// ---------------------------------------------------------------------------

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  [
    'select', 'eq', 'order', 'insert', 'update', 'delete', 'single',
    'limit', 'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not',
    'upsert', 'match', 'or', 'filter', 'ilike', 'rpc', 'range',
  ].forEach((m) => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

const mockFrom = vi.fn();
const mockSupabaseClient = {
  from: mockFrom,
  channel: vi.fn(() => mockChannel),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabaseClient.channel.mockReturnValue(mockChannel);
});

// ---------------------------------------------------------------------------
// getVoteSummary (uses getVotes internally)
// ---------------------------------------------------------------------------

describe('eventProposalsService.getVoteSummary', () => {
  it('counts vote types correctly per time slot', async () => {
    const votes = [
      { id: 'v1', proposal_id: 'p1', time_slot_index: 0, user_id: 'u1', vote: 'available', created_at: '', updated_at: '' },
      { id: 'v2', proposal_id: 'p1', time_slot_index: 0, user_id: 'u2', vote: 'preferred', created_at: '', updated_at: '' },
      { id: 'v3', proposal_id: 'p1', time_slot_index: 0, user_id: 'u3', vote: 'unavailable', created_at: '', updated_at: '' },
      { id: 'v4', proposal_id: 'p1', time_slot_index: 1, user_id: 'u1', vote: 'preferred', created_at: '', updated_at: '' },
    ];

    mockFrom.mockReturnValue(createChainMock({ data: votes, error: null }));

    const summary = await eventProposalsService.getVoteSummary('p1');

    expect(summary[0].available).toBe(1);
    expect(summary[0].preferred).toBe(1);
    expect(summary[0].unavailable).toBe(1);
    expect(summary[0].total).toBe(3);
    expect(summary[1].preferred).toBe(1);
    expect(summary[1].total).toBe(1);
  });

  it('returns empty summary when no votes exist', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: [], error: null }));
    const summary = await eventProposalsService.getVoteSummary('p1');
    expect(Object.keys(summary)).toHaveLength(0);
  });

  it('throws when vote query fails', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'DB error' } }));
    await expect(eventProposalsService.getVoteSummary('p1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getVotes
// ---------------------------------------------------------------------------

describe('eventProposalsService.getVotes', () => {
  it('returns votes for a proposal', async () => {
    const mockVotes = [
      { id: 'v1', proposal_id: 'p1', time_slot_index: 0, user_id: 'u1', vote: 'available', created_at: '', updated_at: '' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: mockVotes, error: null }));

    const votes = await eventProposalsService.getVotes('p1');
    expect(votes).toHaveLength(1);
    expect(votes[0].vote).toBe('available');
  });

  it('returns empty array when no votes exist', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    const votes = await eventProposalsService.getVotes('p1');
    expect(votes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// rejectProposal
// ---------------------------------------------------------------------------

describe('eventProposalsService.rejectProposal', () => {
  it('returns the updated proposal with rejected status', async () => {
    const rejected = {
      id: 'p1',
      space_id: 'space-1',
      title: 'Team dinner',
      status: 'rejected',
      time_slots: [],
      proposed_by: 'user-1',
      created_at: '',
      updated_at: '',
    };
    mockFrom.mockReturnValue(createChainMock({ data: rejected, error: null }));

    const result = await eventProposalsService.rejectProposal('p1');
    expect(result.status).toBe('rejected');
  });

  it('throws when DB returns an error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(eventProposalsService.rejectProposal('p1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// deleteProposal
// ---------------------------------------------------------------------------

describe('eventProposalsService.deleteProposal', () => {
  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    await expect(eventProposalsService.deleteProposal('p1')).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(eventProposalsService.deleteProposal('p1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// voteOnProposal
// ---------------------------------------------------------------------------

describe('eventProposalsService.voteOnProposal', () => {
  it('returns the created/updated vote record', async () => {
    const mockVote = {
      id: 'v1',
      proposal_id: 'p1',
      time_slot_index: 0,
      user_id: 'user-1',
      vote: 'preferred',
      comment: null,
      created_at: '',
      updated_at: '',
    };
    mockFrom.mockReturnValue(createChainMock({ data: mockVote, error: null }));

    const result = await eventProposalsService.voteOnProposal({
      proposal_id: 'p1',
      time_slot_index: 0,
      vote: 'preferred',
    });

    expect(result.vote).toBe('preferred');
    expect(result.proposal_id).toBe('p1');
  });

  it('throws when the upsert fails', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'conflict' } }));

    await expect(
      eventProposalsService.voteOnProposal({
        proposal_id: 'p1',
        time_slot_index: 0,
        vote: 'available',
      })
    ).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// subscribeToProposals / subscribeToVotes
// ---------------------------------------------------------------------------

describe('eventProposalsService.subscribeToProposals', () => {
  it('creates and subscribes to a channel filtered by spaceId', () => {
    const callback = vi.fn();
    const channel = eventProposalsService.subscribeToProposals('space-1', callback);

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith('event_proposals:space-1');
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(channel).toBe(mockChannel);
  });
});

describe('eventProposalsService.subscribeToVotes', () => {
  it('creates and subscribes to a channel filtered by proposalId', () => {
    const callback = vi.fn();
    const channel = eventProposalsService.subscribeToVotes('p1', callback);

    expect(mockSupabaseClient.channel).toHaveBeenCalledWith('event_proposal_votes:p1');
    expect(mockChannel.subscribe).toHaveBeenCalled();
    expect(channel).toBe(mockChannel);
  });
});

// ---------------------------------------------------------------------------
// approveProposal — slot validation
// ---------------------------------------------------------------------------

describe('eventProposalsService.approveProposal', () => {
  const timeSlots: TimeSlot[] = [
    { start_time: '2026-03-01T10:00:00Z', end_time: '2026-03-01T11:00:00Z', label: 'Morning' },
    { start_time: '2026-03-01T14:00:00Z', end_time: '2026-03-01T15:00:00Z', label: 'Afternoon' },
  ];

  it('throws when slot index is out of bounds', async () => {
    // getProposal returns a pending proposal with 2 slots; votes query returns []
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChainMock({
          data: { id: 'p1', space_id: 's1', title: 'Test', status: 'pending', time_slots: timeSlots, proposed_by: 'u1', created_at: '', updated_at: '' },
          error: null,
        });
      }
      return createChainMock({ data: [], error: null });
    });

    await expect(
      eventProposalsService.approveProposal('p1', 99)
    ).rejects.toThrow('Invalid time slot index');
  });

  it('throws when proposal is already processed', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChainMock({
          data: { id: 'p1', space_id: 's1', title: 'Test', status: 'approved', time_slots: timeSlots, proposed_by: 'u1', created_at: '', updated_at: '' },
          error: null,
        });
      }
      return createChainMock({ data: [], error: null });
    });

    await expect(
      eventProposalsService.approveProposal('p1', 0)
    ).rejects.toThrow('Proposal has already been processed');
  });
});
