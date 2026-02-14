'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Users, CheckCircle2, XCircle, Star, Send, AlertCircle, X } from 'lucide-react';
import { eventProposalsService, EventProposal, ProposalVote, CreateProposalInput } from '@/lib/services/event-proposals-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { formatDistance, format } from 'date-fns';
import { logger } from '@/lib/logger';
import { showError, showSuccess } from '@/lib/utils/toast';

interface EventProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  existingProposal?: EventProposal | null;
  onProposalCreated?: () => void;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
}

type VoteSummary = Record<number, {
  available: number;
  unavailable: number;
  preferred: number;
  total: number;
}>;

/** Displays a modal for proposing a new event time to space members. */
export function EventProposalModal({
  isOpen,
  onClose,
  spaceId,
  existingProposal,
  onProposalCreated
}: EventProposalModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'create' | 'vote'>('create');
  const [loading, setLoading] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [slotToApprove, setSlotToApprove] = useState<number | null>(null);

  // Create mode state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { start_time: '', end_time: '' }
  ]);

  // Vote mode state
  const [proposal, setProposal] = useState<EventProposal | null>(null);
  const [votes, setVotes] = useState<Record<number, 'available' | 'unavailable' | 'preferred'>>({});
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);

  const loadVoteSummary = useCallback(async (proposalId: string) => {
    try {
      const summary = await eventProposalsService.getVoteSummary(proposalId);
      setVoteSummary(summary);
    } catch (error) {
      logger.error('Failed to load vote summary:', error, { component: 'EventProposalModal', action: 'component_action' });
    }
  }, []);

  const loadUserVotes = useCallback(async (proposalId: string) => {
    try {
      const userVotes = await eventProposalsService.getVotes(proposalId);
      const voteMap: Record<number, 'available' | 'unavailable' | 'preferred'> = {};
      userVotes.forEach((vote: ProposalVote) => {
        if (vote.user_id === user?.id) {
          voteMap[vote.time_slot_index] = vote.vote;
        }
      });
      setVotes(voteMap);
    } catch (error) {
      logger.error('Failed to load user votes:', error, { component: 'EventProposalModal', action: 'component_action' });
    }
  }, [user?.id]);

  useEffect(() => {
    if (existingProposal) {
      setMode('vote');
      setProposal(existingProposal);
      loadVoteSummary(existingProposal.id);
      loadUserVotes(existingProposal.id);
    } else {
      setMode('create');
    }
  }, [existingProposal, loadUserVotes, loadVoteSummary]);

  const addTimeSlot = () => {
    if (timeSlots.length < 5) {
      setTimeSlots([...timeSlots, { start_time: '', end_time: '' }]);
    }
  };

  const removeTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index));
    }
  };

  const updateTimeSlot = (index: number, field: 'start_time' | 'end_time', value: string) => {
    const updated = [...timeSlots];
    updated[index][field] = new Date(value).toISOString();
    setTimeSlots(updated);
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const input: CreateProposalInput = {
        space_id: spaceId,
        title,
        description,
        time_slots: timeSlots
      };

      await eventProposalsService.createProposal(input);
      onProposalCreated?.();
      onClose();
    } catch (error) {
      logger.error('Failed to create proposal:', error, { component: 'EventProposalModal', action: 'component_action' });
      showError('Failed to create proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (slotIndex: number, availability: 'available' | 'unavailable' | 'preferred') => {
    if (!proposal) return;

    try {
      // Toggle off if clicking same vote
      const newVote = votes[slotIndex] === availability ? 'unavailable' : availability;

      await eventProposalsService.voteOnProposal({
        proposal_id: proposal.id,
        time_slot_index: slotIndex,
        vote: newVote
      });

      setVotes({ ...votes, [slotIndex]: newVote });
      await loadVoteSummary(proposal.id);
    } catch (error) {
      logger.error('Failed to vote:', error, { component: 'EventProposalModal', action: 'component_action' });
    }
  };

  const handleApproveProposal = async (slotIndex: number) => {
    if (!proposal) return;
    setSlotToApprove(slotIndex);
    setShowApproveConfirm(true);
  };

  const confirmApproveProposal = async () => {
    if (!proposal || slotToApprove === null) return;

    setLoading(true);
    try {
      await eventProposalsService.approveProposal(proposal.id, slotToApprove);
      showSuccess('Event created successfully!');
      onProposalCreated?.();
      onClose();
    } catch (error) {
      logger.error('Failed to approve proposal:', error, { component: 'EventProposalModal', action: 'component_action' });
      showError('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
      setShowApproveConfirm(false);
      setSlotToApprove(null);
    }
  };

  const createModeFooter = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 sm:px-6 py-2.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="event-proposal-form"
        disabled={loading}
        className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
      >
        <Send className="w-4 h-4" />
        {loading ? 'Creating...' : 'Send Proposal'}
      </button>
    </div>
  );

  const voteModeFooter = (
    <div className="flex items-center gap-3">
      <button
        onClick={onClose}
        className="flex-1 px-4 sm:px-6 py-2.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium text-sm sm:text-base"
      >
        Close
      </button>
    </div>
  );

  const subtitle = mode === 'vote' && proposal
    ? `Created by ${proposal.proposer?.raw_user_meta_data?.name || proposal.proposer?.email} • ${formatDistance(new Date(proposal.created_at), new Date(), { addSuffix: true })}`
    : undefined;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Propose Event Times' : 'Vote on Proposal'}
      maxWidth="3xl"
      headerGradient="bg-gradient-to-r from-purple-500 to-purple-600"
      footer={mode === 'create' ? createModeFooter : voteModeFooter}
      subtitle={subtitle}
    >
      <div className="space-y-6">
        {mode === 'create' ? (
          /* CREATE MODE */
          <form id="event-proposal-form" onSubmit={handleCreateProposal} className="space-y-6">
            {/* Info Box */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">Propose multiple time options</p>
                <p className="text-blue-300">
                  Suggest up to 5 different time slots. Everyone can vote on their availability, making it easy to find the perfect time.
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team Planning Session"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="field-2" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this event about?"
                rows={3}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="field-3" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where will this take place?"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white"
              />
            </div>

            {/* Time Slots */}
            <div>
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-300 mb-3 cursor-pointer">
                Proposed Time Slots *
              </label>
              <div className="space-y-3">
                {timeSlots.map((slot, index) => (
                  <div key={index} className="bg-purple-900/20 rounded-xl p-4 border border-purple-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-gray-300">
                        Option {index + 1}
                      </span>
                      {timeSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          className="ml-auto text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="field-5" className="block text-xs text-gray-400 mb-1 cursor-pointer">
                          Start Time
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={slot.start_time ? new Date(slot.start_time).toISOString().slice(0, 16) : ''}
                          onChange={(e) => updateTimeSlot(index, 'start_time', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="field-6" className="block text-xs text-gray-400 mb-1 cursor-pointer">
                          End Time
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={slot.end_time ? new Date(slot.end_time).toISOString().slice(0, 16) : ''}
                          onChange={(e) => updateTimeSlot(index, 'end_time', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {timeSlots.length < 5 && (
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className="mt-3 w-full px-4 py-2 border-2 border-dashed border-gray-600 text-gray-400 rounded-xl hover:border-purple-500 hover:text-purple-400 transition-colors"
                >
                  + Add Another Time Option
                </button>
              )}
            </div>
          </form>
        ) : (
          /* VOTE MODE */
          proposal && (
            <>
              {/* Event Details */}
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-2">
                  {proposal.title}
                </h3>
                {proposal.description && (
                  <p className="text-gray-400 mb-3">
                    {proposal.description}
                  </p>
                )}
              </div>

              {/* Voting Instructions */}
              <div className="bg-purple-900/20 border border-purple-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-white">Vote on your availability</span>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span><strong>Available</strong> - This time works for you</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span><strong>Preferred</strong> - This is your best time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span><strong>Unavailable</strong> - You can&apos;t make this time</span>
                  </div>
                </div>
              </div>

              {/* Time Slot Voting */}
              <div className="space-y-3">
                {proposal.time_slots.map((slot, index) => {
                  const slotSummary = voteSummary?.[index];
                  const userVote = votes[index];
                  const isCreator = proposal.proposed_by === user?.id;

                  return (
                    <div key={index} className="bg-gray-900 rounded-xl p-5 border-2 border-gray-700 hover:border-purple-600 transition-colors">
                      {/* Time Info */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-lg font-semibold text-white">
                            Option {index + 1}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {format(new Date(slot.start_time), 'EEEE, MMMM d')}
                          </div>
                          <div className="text-sm text-gray-400">
                            {format(new Date(slot.start_time), 'h:mm a')} {slot.end_time && `- ${format(new Date(slot.end_time), 'h:mm a')}`}
                          </div>
                        </div>

                        {/* Vote Summary */}
                        {slotSummary && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-400">
                              {slotSummary.available + slotSummary.preferred}
                            </div>
                            <div className="text-xs text-gray-400">
                              available
                            </div>
                            {slotSummary.preferred > 0 && (
                              <div className="text-xs text-yellow-400 flex items-center justify-end gap-1">
                                <Star className="w-3 h-3" />
                                {slotSummary.preferred} preferred
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Vote Buttons */}
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => handleVote(index, 'available')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            userVote === 'available'
                              ? 'bg-green-500 text-white shadow-md'
                              : 'bg-gray-800 text-gray-300 hover:bg-green-900/30 border border-gray-600'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleVote(index, 'preferred')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            userVote === 'preferred'
                              ? 'bg-yellow-500 text-white shadow-md'
                              : 'bg-gray-800 text-gray-300 hover:bg-yellow-900/30 border border-gray-600'
                          }`}
                        >
                          <Star className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleVote(index, 'unavailable')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            userVote === 'unavailable'
                              ? 'bg-red-500 text-white shadow-md'
                              : 'bg-gray-800 text-gray-300 hover:bg-red-900/30 border border-gray-600'
                          }`}
                        >
                          <XCircle className="w-4 h-4 mx-auto" />
                        </button>
                      </div>

                      {/* Approve Button (Creator Only) */}
                      {isCreator && proposal.status === 'pending' && (
                        <button
                          onClick={() => handleApproveProposal(index)}
                          disabled={loading}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✓ Finalize & Create Event
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>
    </Modal>

    {/* Approve Proposal Confirm Dialog */}
    <ConfirmDialog
      isOpen={showApproveConfirm}
      onClose={() => {
        setShowApproveConfirm(false);
        setSlotToApprove(null);
      }}
      onConfirm={confirmApproveProposal}
      title="Create Event"
      message="Create this event? This will finalize the time and notify all participants."
      confirmLabel="Create Event"
      cancelLabel="Cancel"
      variant="warning"
      confirmLoading={loading}
    />
    </>
  );
}
