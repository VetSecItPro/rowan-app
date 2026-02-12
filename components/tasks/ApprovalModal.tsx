'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { taskApprovalsService } from '@/lib/services/task-approvals-service';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { showError, showWarning } from '@/lib/utils/toast';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  currentUserId: string;
  spaceId: string;
}

interface SpaceMember {
  user_id: string;
  users: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

interface TaskApproval {
  id: string;
  task_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  note?: string | null;
  requested_by: string;
  requested_by_user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
  requested_at?: string;
  approver_user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
  review_note?: string | null;
  changes_requested?: string | null;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
  approver?: Record<string, unknown>;
  task?: Record<string, unknown>;
}

export function ApprovalModal({ isOpen, onClose, taskId, currentUserId, spaceId }: ApprovalModalProps) {
  const [approvals, setApprovals] = useState<TaskApproval[]>([]);
  const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const loadApprovals = useCallback(async () => {
    try {
      const data = await taskApprovalsService.getApprovals(taskId);
      setApprovals(data);
    } catch (error) {
      logger.error('Error loading approvals:', error, { component: 'ApprovalModal', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const loadSpaceMembers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('space_members')
      .select(`
        user_id,
        users!user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('space_id', spaceId)
      .neq('user_id', currentUserId);

    setSpaceMembers((data ?? []) as SpaceMember[]);
  }, [spaceId, currentUserId]);

  useEffect(() => {
    if (isOpen) {
      loadApprovals();
      loadSpaceMembers();
    }
  }, [isOpen, loadApprovals, loadSpaceMembers]);

  async function requestApproval() {
    if (!selectedApprover) return;

    setRequesting(true);
    try {
      await taskApprovalsService.requestApproval(taskId, selectedApprover, currentUserId);
      setSelectedApprover('');
      loadApprovals();
    } catch (error) {
      logger.error('Error requesting approval:', error, { component: 'ApprovalModal', action: 'component_action' });
      showError('Failed to request approval');
    } finally {
      setRequesting(false);
    }
  }

  async function handleApprove(approvalId: string) {
    if (!reviewNote.trim()) {
      showWarning('Please provide a review note');
      return;
    }

    try {
      await taskApprovalsService.updateApprovalStatus(approvalId, 'approved', reviewNote);
      setReviewNote('');
      loadApprovals();
    } catch (error) {
      logger.error('Error approving:', error, { component: 'ApprovalModal', action: 'component_action' });
      showError('Failed to approve');
    }
  }

  async function handleReject(approvalId: string) {
    if (!reviewNote.trim()) {
      showWarning('Please provide a review note');
      return;
    }

    try {
      await taskApprovalsService.updateApprovalStatus(approvalId, 'rejected', reviewNote);
      setReviewNote('');
      loadApprovals();
    } catch (error) {
      logger.error('Error rejecting:', error, { component: 'ApprovalModal', action: 'component_action' });
      showError('Failed to reject');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-900/20 text-amber-300 rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-900/20 text-green-300 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-900/20 text-red-300 rounded-full">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const completedApprovals = approvals.filter(a => a.status !== 'pending');
  const myPendingApprovals = pendingApprovals.filter(a => a.approver_id === currentUserId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Approval Workflow"
      maxWidth="3xl"
      headerGradient="bg-gradient-to-r from-blue-500 to-blue-600"
    >
      <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading approvals...</div>
          ) : (
            <>
              {/* Request Approval Section */}
              <div className="mb-6 p-4 bg-gray-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Request Approval
                </h3>
                <div className="flex gap-2">
                  <select
                    value={selectedApprover}
                    onChange={(e) => setSelectedApprover(e.target.value)}
                    className="flex-1 pl-3 pr-10 py-2 border border-gray-600 rounded-lg bg-gray-800"
                  >
                    <option value="">Select approver...</option>
                    {spaceMembers.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.users.full_name || member.users.email}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={requestApproval}
                    disabled={!selectedApprover || requesting}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {requesting ? 'Requesting...' : 'Request'}
                  </button>
                </div>
              </div>

              {/* My Pending Approvals */}
              {myPendingApprovals.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">
                    Awaiting Your Approval ({myPendingApprovals.length})
                  </h3>
                  <div className="space-y-3">
                    {myPendingApprovals.map((approval) => (
                      <div
                        key={approval.id}
                        className="p-4 bg-amber-900/10 border border-amber-800 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-gray-300">
                              Requested by: <span className="font-medium">{approval.requested_by_user?.email}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {approval.requested_at ? new Date(approval.requested_at).toLocaleString() : 'Unknown'}
                            </p>
                          </div>
                          {getStatusBadge(approval.status)}
                        </div>

                        <div className="mb-3">
                          <label htmlFor="field-1" className="block text-xs text-gray-400 mb-1 cursor-pointer">
                            Review Note
                          </label>
                          <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Add your review comments..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-800"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(approval.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Approvals */}
              {pendingApprovals.filter(a => a.approver_id !== currentUserId).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">
                    Pending Approvals
                  </h3>
                  <div className="space-y-2">
                    {pendingApprovals
                      .filter(a => a.approver_id !== currentUserId)
                      .map((approval) => (
                        <div
                          key={approval.id}
                          className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {approval.approver_user?.full_name || approval.approver_user?.email}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Requested {approval.requested_at ? new Date(approval.requested_at).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                          {getStatusBadge(approval.status)}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Completed Approvals */}
              {completedApprovals.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">
                    Approval History
                  </h3>
                  <div className="space-y-2">
                    {completedApprovals.map((approval) => (
                      <div
                        key={approval.id}
                        className="p-3 bg-gray-900 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-white">
                            {approval.approver_user?.full_name || approval.approver_user?.email}
                          </p>
                          {getStatusBadge(approval.status)}
                        </div>
                        {approval.review_note && (
                          <div className="flex items-start gap-2 mt-2 p-2 bg-gray-800 rounded">
                            <MessageSquare className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-400">
                              {approval.review_note}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {approval.reviewed_at && new Date(approval.reviewed_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {approvals.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No approvals yet. Request approval from team members to proceed with this task.
                </div>
              )}
            </>
          )}
      </div>
    </Modal>
  );
}
