'use client';

import { useState, useEffect } from 'react';
import { Calendar, Sparkles, MessageSquarePlus } from 'lucide-react';
import { EventProposal, eventProposalsService } from '@/lib/services/event-proposals-service';
import { ProposalCard } from './ProposalCard';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface ProposalsListProps {
  spaceId: string;
  onApproveProposal?: (proposalId: string, slotIndex: number) => void;
  onRejectProposal?: (proposalId: string) => void;
  onCreateProposal?: () => void;
}

export function ProposalsList({ spaceId, onApproveProposal, onRejectProposal, onCreateProposal }: ProposalsListProps) {
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadProposals();
  }, [spaceId, selectedStatus]);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const statusFilter = selectedStatus === 'all' ? undefined : selectedStatus;
      const data = await eventProposalsService.getProposals(spaceId, statusFilter);
      setProposals(data);
    } catch (error) {
      logger.error('Failed to load proposals:', error, { component: 'ProposalsList', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscriptions for multi-user collaboration
  useEffect(() => {
    if (!spaceId) return;

    const supabase = createClient();

    // Subscribe to proposal changes using service method
    const proposalsChannel = eventProposalsService.subscribeToProposals(spaceId, () => {
      loadProposals(); // Reload when proposals change
    });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(proposalsChannel);
    };
  }, [spaceId]);

  const handleApprove = async (proposalId: string) => {
    // Find the proposal
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    // Find the time slot with the most "preferred" and "available" votes
    const voteSummaries = proposal.time_slots.map((_, index) => {
      const votes = proposal.votes?.filter(v => v.time_slot_index === index) || [];
      return {
        index,
        preferred: votes.filter(v => v.vote === 'preferred').length,
        available: votes.filter(v => v.vote === 'available').length,
        unavailable: votes.filter(v => v.vote === 'unavailable').length
      };
    });

    // Sort by preferred first, then available
    voteSummaries.sort((a, b) => {
      if (b.preferred !== a.preferred) return b.preferred - a.preferred;
      return b.available - a.available;
    });

    const bestSlotIndex = voteSummaries[0].index;

    try {
      await eventProposalsService.approveProposal(proposalId, bestSlotIndex);
      if (onApproveProposal) {
        onApproveProposal(proposalId, bestSlotIndex);
      }
      await loadProposals();
    } catch (error) {
      logger.error('Failed to approve proposal:', error, { component: 'ProposalsList', action: 'component_action' });
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      await eventProposalsService.rejectProposal(proposalId);
      if (onRejectProposal) {
        onRejectProposal(proposalId);
      }
      await loadProposals();
    } catch (error) {
      logger.error('Failed to reject proposal:', error, { component: 'ProposalsList', action: 'component_action' });
    }
  };

  const filteredProposals = proposals.filter(p => {
    if (selectedStatus === 'all') return true;
    return p.status === selectedStatus;
  });

  const statusCounts = {
    all: proposals.length,
    pending: proposals.filter(p => p.status === 'pending').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Event Proposals
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Collaborate on finding the perfect time for events
          </p>
        </div>
        {onCreateProposal && (
          <button
            onClick={onCreateProposal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-calendar text-white rounded-lg hover:opacity-90 transition-all font-medium text-sm group relative"
            title="Propose new times"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Propose Times</span>
            <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Propose new times
            </span>
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'pending', label: 'Pending', count: statusCounts.pending },
          { key: 'approved', label: 'Approved', count: statusCounts.approved },
          { key: 'rejected', label: 'Rejected', count: statusCounts.rejected },
          { key: 'all', label: 'All', count: statusCounts.all }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
              selectedStatus === tab.key
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading proposals...</p>
        </div>
      )}

      {/* Proposals List */}
      {!loading && filteredProposals.length > 0 && (
        <div className="space-y-4">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onVote={loadProposals}
              onApprove={() => handleApprove(proposal.id)}
              onReject={() => handleReject(proposal.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProposals.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
            {selectedStatus === 'pending' && 'No pending proposals'}
            {selectedStatus === 'approved' && 'No approved proposals'}
            {selectedStatus === 'rejected' && 'No rejected proposals'}
            {selectedStatus === 'all' && 'No proposals yet'}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
            {selectedStatus === 'pending' && 'Create a new proposal to suggest event times to your space members'}
            {selectedStatus === 'approved' && 'Approved proposals will appear here once created'}
            {selectedStatus === 'rejected' && 'Rejected proposals will appear here'}
            {selectedStatus === 'all' && 'Get started by proposing times for an event'}
          </p>
          {onCreateProposal && selectedStatus === 'pending' && (
            <button
              onClick={onCreateProposal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-calendar text-white rounded-lg hover:opacity-90 transition-all font-medium"
            >
              <MessageSquarePlus className="w-5 h-5" />
              <span>Propose Your First Event</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
