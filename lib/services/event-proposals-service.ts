import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface TimeSlot {
  start_time: string;
  end_time?: string;
  label?: string;
}

export interface EventProposal {
  id: string;
  event_id?: string;
  space_id: string;
  proposed_by: string;
  title: string;
  description?: string;
  time_slots: TimeSlot[];
  status: 'pending' | 'approved' | 'rejected' | 'countered';
  counter_proposal_id?: string;
  approved_slot_index?: number;
  created_at: string;
  updated_at: string;
  // Relations
  proposer?: {
    id: string;
    email: string;
    raw_user_meta_data?: Record<string, unknown>;
  };
  votes?: ProposalVote[];
}

export interface ProposalVote {
  id: string;
  proposal_id: string;
  time_slot_index: number;
  user_id: string;
  vote: 'available' | 'unavailable' | 'preferred';
  comment?: string;
  created_at: string;
  updated_at: string;
  // Relations
  user?: {
    id: string;
    email: string;
    raw_user_meta_data?: Record<string, unknown>;
  };
}

export interface CreateProposalInput {
  space_id: string;
  title: string;
  description?: string;
  time_slots: TimeSlot[];
}

export interface VoteOnProposalInput {
  proposal_id: string;
  time_slot_index: number;
  vote: 'available' | 'unavailable' | 'preferred';
  comment?: string;
}

export const eventProposalsService = {
  /**
   * Create a new event proposal
   */
  async createProposal(input: CreateProposalInput): Promise<EventProposal> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('event_proposals')
      .insert([{
        space_id: input.space_id,
        title: input.title,
        description: input.description,
        time_slots: input.time_slots,
        status: 'pending'
      }])
      .select('id, event_id, space_id, proposed_by, title, description, time_slots, status, counter_proposal_id, approved_slot_index, created_at, updated_at')
      .single();

    if (error) throw error;

    // TODO: Notify space members about new proposal
    await this.notifySpaceMembers(input.space_id, 'new_proposal', data.id);

    return data;
  },

  /**
   * Get all proposals for a space
   */
  async getProposals(spaceId: string, status?: string): Promise<EventProposal[]> {
    const supabase = createClient();

    let query = supabase
      .from('event_proposals')
      .select('id, event_id, space_id, proposed_by, title, description, time_slots, status, counter_proposal_id, approved_slot_index, created_at, updated_at')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get votes for each proposal
    const proposalsWithVotes = await Promise.all(
      (data || []).map(async (proposal: { id: string; [key: string]: unknown }) => ({
        ...proposal,
        votes: await this.getVotes(proposal.id)
      }))
    );

    return proposalsWithVotes;
  },

  /**
   * Get a single proposal by ID
   */
  async getProposal(proposalId: string): Promise<EventProposal> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('event_proposals')
      .select('id, event_id, space_id, proposed_by, title, description, time_slots, status, counter_proposal_id, approved_slot_index, created_at, updated_at')
      .eq('id', proposalId)
      .single();

    if (error) throw error;

    // Get votes
    const votes = await this.getVotes(proposalId);

    return {
      ...data,
      votes
    };
  },

  /**
   * Vote on a proposal time slot
   */
  async voteOnProposal(input: VoteOnProposalInput): Promise<ProposalVote> {
    const supabase = createClient();

    // Upsert vote (update if exists, insert if not)
    const { data, error } = await supabase
      .from('event_proposal_votes')
      .upsert([{
        proposal_id: input.proposal_id,
        time_slot_index: input.time_slot_index,
        vote: input.vote,
        comment: input.comment
      }], {
        onConflict: 'proposal_id,time_slot_index,user_id'
      })
      .select('id, proposal_id, time_slot_index, user_id, vote, comment, created_at, updated_at')
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Get all votes for a proposal
   */
  async getVotes(proposalId: string): Promise<ProposalVote[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('event_proposal_votes')
      .select('id, proposal_id, time_slot_index, user_id, vote, comment, created_at, updated_at')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get vote summary for each time slot
   */
  async getVoteSummary(proposalId: string): Promise<Record<number, {
    available: number;
    unavailable: number;
    preferred: number;
    total: number;
  }>> {
    const votes = await this.getVotes(proposalId);

    const summary: Record<number, {
      available: number;
      unavailable: number;
      preferred: number;
      total: number;
    }> = {};

    votes.forEach(vote => {
      if (!summary[vote.time_slot_index]) {
        summary[vote.time_slot_index] = {
          available: 0,
          unavailable: 0,
          preferred: 0,
          total: 0
        };
      }

      summary[vote.time_slot_index][vote.vote]++;
      summary[vote.time_slot_index].total++;
    });

    return summary;
  },

  /**
   * Approve a proposal and create the event
   */
  async approveProposal(
    proposalId: string,
    selectedSlotIndex: number
  ): Promise<{ proposal: EventProposal; eventId: string }> {
    const supabase = createClient();

    // Get proposal details
    const proposal = await this.getProposal(proposalId);

    if (proposal.status !== 'pending') {
      throw new Error('Proposal has already been processed');
    }

    if (selectedSlotIndex >= proposal.time_slots.length) {
      throw new Error('Invalid time slot index');
    }

    const selectedSlot = proposal.time_slots[selectedSlotIndex];

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert([{
        space_id: proposal.space_id,
        title: proposal.title,
        description: proposal.description,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        is_recurring: false,
        category: 'personal', // Default category for approved proposals
        status: 'not-started' // Default status for new events
      }])
      .select()
      .single();

    if (eventError) throw eventError;

    // Update proposal status
    const { data: updatedProposal, error: updateError } = await supabase
      .from('event_proposals')
      .update({
        status: 'approved',
        event_id: event.id,
        approved_slot_index: selectedSlotIndex
      })
      .eq('id', proposalId)
      .select('id, event_id, space_id, proposed_by, title, description, time_slots, status, counter_proposal_id, approved_slot_index, created_at, updated_at')
      .single();

    if (updateError) throw updateError;

    // TODO: Notify participants
    await this.notifySpaceMembers(
      proposal.space_id,
      'proposal_approved',
      proposalId,
      event.id
    );

    return {
      proposal: updatedProposal,
      eventId: event.id
    };
  },

  /**
   * Reject a proposal
   */
  async rejectProposal(proposalId: string): Promise<EventProposal> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('event_proposals')
      .update({ status: 'rejected' })
      .eq('id', proposalId)
      .select('id, event_id, space_id, proposed_by, title, description, time_slots, status, counter_proposal_id, approved_slot_index, created_at, updated_at')
      .single();

    if (error) throw error;

    return data;
  },

  /**
   * Create a counter-proposal
   */
  async createCounterProposal(
    originalProposalId: string,
    newTimeSlots: TimeSlot[]
  ): Promise<EventProposal> {
    const supabase = createClient();

    // Get original proposal
    const original = await this.getProposal(originalProposalId);

    // Create counter-proposal
    const { data, error } = await supabase
      .from('event_proposals')
      .insert([{
        space_id: original.space_id,
        title: original.title,
        description: original.description,
        time_slots: newTimeSlots,
        status: 'pending',
        counter_proposal_id: originalProposalId
      }])
      .select('id, event_id, space_id, proposed_by, title, description, time_slots, status, counter_proposal_id, approved_slot_index, created_at, updated_at')
      .single();

    if (error) throw error;

    // Update original proposal
    await supabase
      .from('event_proposals')
      .update({ status: 'countered' })
      .eq('id', originalProposalId);

    return data;
  },

  /**
   * Delete a proposal
   */
  async deleteProposal(proposalId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('event_proposals')
      .delete()
      .eq('id', proposalId);

    if (error) throw error;
  },

  /**
   * Notify space members about proposal updates
   * TODO: Integrate with notification system
   */
  async notifySpaceMembers(
    spaceId: string,
    type: string,
    proposalId: string,
    _eventId?: string
  ): Promise<void> {
    // Placeholder for notification logic
    logger.info(`Notify space ${spaceId} about ${type} for proposal ${proposalId}`, { component: 'lib-event-proposals-service' });
  },

  /**
   * Subscribe to real-time changes for event proposals in a space
   */
  subscribeToProposals(
    spaceId: string,
    callback: (payload: RealtimePostgresChangesPayload<{[key: string]: unknown}>) => void
  ): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`event_proposals:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_proposals',
          filter: `space_id=eq.${spaceId}`,
        },
        callback
      )
      .subscribe();

    return channel;
  },

  /**
   * Subscribe to real-time changes for proposal votes
   */
  subscribeToVotes(
    proposalId: string,
    callback: (payload: RealtimePostgresChangesPayload<{[key: string]: unknown}>) => void
  ): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`event_proposal_votes:${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_proposal_votes',
          filter: `proposal_id=eq.${proposalId}`,
        },
        callback
      )
      .subscribe();

    return channel;
  }
};
