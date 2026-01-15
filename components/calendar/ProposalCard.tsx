'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Star, CheckCircle2, XCircle, MessageSquare, Clock, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { EventProposal, ProposalVote, eventProposalsService } from '@/lib/services/event-proposals-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { logger } from '@/lib/logger';

interface ProposalCardProps {
  proposal: EventProposal;
  onVote: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export function ProposalCard({ proposal, onVote, onApprove, onReject }: ProposalCardProps) {
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);

  const isProposer = user?.id === proposal.proposed_by;

  const handleVote = async (slotIndex: number, vote: 'available' | 'unavailable' | 'preferred') => {
    if (!user) return;

    setVoting(true);
    try {
      await eventProposalsService.voteOnProposal({
        proposal_id: proposal.id,
        time_slot_index: slotIndex,
        vote
      });
      onVote();
    } catch (error) {
      logger.error('Failed to vote:', error, { component: 'ProposalCard', action: 'component_action' });
    } finally {
      setVoting(false);
    }
  };

  const getVoteSummary = (slotIndex: number) => {
    const votes = proposal.votes?.filter(v => v.time_slot_index === slotIndex) || [];
    const summary = {
      available: votes.filter(v => v.vote === 'available').length,
      unavailable: votes.filter(v => v.vote === 'unavailable').length,
      preferred: votes.filter(v => v.vote === 'preferred').length,
      total: votes.length
    };
    return summary;
  };

  const getUserVote = (slotIndex: number): ProposalVote | undefined => {
    return proposal.votes?.find(v => v.time_slot_index === slotIndex && v.user_id === user?.id);
  };

  const getStatusBadge = () => {
    const colors = {
      pending: 'bg-yellow-100 bg-yellow-900/30 text-yellow-400',
      approved: 'bg-green-100 bg-green-900/30 text-green-400',
      rejected: 'bg-red-100 bg-red-900/30 text-red-400',
      countered: 'bg-blue-100 bg-blue-900/30 text-blue-400'
    };

    const labels = {
      pending: 'Pending Votes',
      approved: 'Approved',
      rejected: 'Rejected',
      countered: 'Counter-Proposed'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[proposal.status]}`}>
        {labels[proposal.status]}
      </span>
    );
  };

  return (
    <div className="bg-gray-800 rounded-xl border-2 border-gray-700 p-6 shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            {proposal.title}
          </h3>
          {proposal.description && (
            <p className="text-sm text-gray-400 mb-3">
              {proposal.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Proposed by {proposal.proposer?.raw_user_meta_data?.name || proposal.proposer?.email || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{format(parseISO(proposal.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Time Slots */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">
          Proposed Times ({proposal.time_slots.length})
        </h4>

        {proposal.time_slots.map((slot, index) => {
          const startTime = parseISO(slot.start_time);
          const endTime = slot.end_time ? parseISO(slot.end_time) : null;
          const summary = getVoteSummary(index);
          const userVote = getUserVote(index);
          const isExpanded = expandedSlot === index;

          return (
            <div
              key={index}
              className="border border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Slot Header */}
              <div className="p-4 bg-gray-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white mb-1">
                      {slot.label || format(startTime, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(startTime, 'h:mm a')}
                      {endTime && ` - ${format(endTime, 'h:mm a')}`}
                    </div>
                  </div>

                  {/* Vote Summary */}
                  <div className="flex items-center gap-2 text-xs">
                    {summary.preferred > 0 && (
                      <div className="flex items-center gap-1 text-purple-400" title="Preferred">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{summary.preferred}</span>
                      </div>
                    )}
                    {summary.available > 0 && (
                      <div className="flex items-center gap-1 text-green-400" title="Available">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{summary.available}</span>
                      </div>
                    )}
                    {summary.unavailable > 0 && (
                      <div className="flex items-center gap-1 text-red-400" title="Unavailable">
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>{summary.unavailable}</span>
                      </div>
                    )}
                    <div className="text-gray-400" title="Total votes">
                      ({summary.total} {summary.total === 1 ? 'vote' : 'votes'})
                    </div>
                  </div>
                </div>

                {/* Voting Buttons */}
                {proposal.status === 'pending' && (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleVote(index, 'preferred')}
                      disabled={voting}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                        userVote?.vote === 'preferred'
                          ? 'bg-purple-900/30 text-purple-300 border-2 border-purple-500'
                          : 'bg-gray-700 text-gray-300 border border-gray-600 hover:border-purple-500'
                      }`}
                      title="Mark as preferred time"
                    >
                      <Star className={`w-3.5 h-3.5 ${userVote?.vote === 'preferred' ? 'fill-current' : ''}`} />
                      <span>Preferred</span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Mark as preferred time
                      </span>
                    </button>

                    <button
                      onClick={() => handleVote(index, 'available')}
                      disabled={voting}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                        userVote?.vote === 'available'
                          ? 'bg-green-900/30 text-green-300 border-2 border-green-500'
                          : 'bg-gray-700 text-gray-300 border border-gray-600 hover:border-green-500'
                      }`}
                      title="Mark as available"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Available</span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Mark as available
                      </span>
                    </button>

                    <button
                      onClick={() => handleVote(index, 'unavailable')}
                      disabled={voting}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                        userVote?.vote === 'unavailable'
                          ? 'bg-red-900/30 text-red-300 border-2 border-red-500'
                          : 'bg-gray-700 text-gray-300 border border-gray-600 hover:border-red-500'
                      }`}
                      title="Mark as unavailable"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>Unavailable</span>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Mark as unavailable
                      </span>
                    </button>

                    <button
                      onClick={() => setExpandedSlot(isExpanded ? null : index)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors group relative"
                      title="View votes"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        View votes
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded Vote Details */}
              {isExpanded && (
                <div className="p-4 bg-gray-800 border-t border-gray-700">
                  <h5 className="text-xs font-semibold text-gray-300 mb-3">
                    Vote Details
                  </h5>
                  <div className="space-y-2">
                    {proposal.votes
                      ?.filter(v => v.time_slot_index === index)
                      .map((vote) => (
                        <div
                          key={vote.id}
                          className="flex items-start justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {vote.user?.raw_user_meta_data?.name || vote.user?.email || 'Unknown User'}
                            </span>
                            <span className={`flex items-center gap-1 ${
                              vote.vote === 'preferred' ? 'text-purple-400' :
                              vote.vote === 'available' ? 'text-green-400' :
                              'text-red-400'
                            }`}>
                              {vote.vote === 'preferred' && <Star className="w-3 h-3 fill-current" />}
                              {vote.vote === 'available' && <ThumbsUp className="w-3 h-3" />}
                              {vote.vote === 'unavailable' && <ThumbsDown className="w-3 h-3" />}
                              {vote.vote}
                            </span>
                          </div>
                          {vote.comment && (
                            <span className="text-gray-400 ml-2">
                              {vote.comment}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions for Proposer */}
      {isProposer && proposal.status === 'pending' && onApprove && onReject && (
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-calendar text-white rounded-lg hover:opacity-90 transition-all font-medium text-sm group relative"
            title="Approve and create event"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve & Create Event</span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Approve and create event
            </span>
          </button>
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-red-700 text-red-400 rounded-lg hover:bg-red-900/20 transition-all font-medium text-sm group relative"
            title="Reject proposal"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject</span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Reject proposal
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
