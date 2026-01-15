'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, UserCheck, MessageSquare } from 'lucide-react';
import { taskApprovalsService } from '@/lib/services/task-approvals-service';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

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
  note?: string;
  requested_by: string;
  requested_by_user?: any;
  requested_at?: string;
  approver_user?: any;
  review_note?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export function ApprovalModal({ isOpen, onClose, taskId, currentUserId, spaceId }: ApprovalModalProps) {
  const [approvals, setApprovals] = useState<TaskApproval[]>([]);
  const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadApprovals();
      loadSpaceMembers();
    }
  }, [isOpen, taskId]);

  async function loadApprovals() {
    try {
      const data = await taskApprovalsService.getApprovals(taskId);
      setApprovals(data);
    } catch (error) {
      logger.error('Error loading approvals:', error, { component: 'ApprovalModal', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }

  async function loadSpaceMembers() {
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

    setSpaceMembers((data || []) as any);
  }

  async function requestApproval() {
    if (!selectedApprover) return;

    setRequesting(true);
    try {
      await taskApprovalsService.requestApproval(taskId, selectedApprover, currentUserId);
      setSelectedApprover('');
      loadApprovals();
    } catch (error) {
      logger.error('Error requesting approval:', error, { component: 'ApprovalModal', action: 'component_action' });
      alert('Failed to request approval');
    } finally {
      setRequesting(false);
    }
  }

  async function handleApprove(approvalId: string) {
    if (!reviewNote.trim()) {
      alert('Please provide a review note');
      return;
    }

    try {
      await taskApprovalsService.updateApprovalStatus(approvalId, 'approved', reviewNote);
      setReviewNote('');
      loadApprovals();
    } catch (error) {
      logger.error('Error approving:', error, { component: 'ApprovalModal', action: 'component_action' });
      alert('Failed to approve');
    }
  }

  async function handleReject(approvalId: string) {
    if (!reviewNote.trim()) {
      alert('Please provide a review note');
      return;
    }

    try {
      await taskApprovalsService.updateApprovalStatus(approvalId, 'rejected', reviewNote);
      setReviewNote('');
      loadApprovals();
    } catch (error) {
      logger.error('Error rejecting:', error, { component: 'ApprovalModal', action: 'component_action' });
      alert('Failed to reject');
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

  if (!isOpen) return null;

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const completedApprovals = approvals.filter(a => a.status !== 'pending');
  const myPendingApprovals = pendingApprovals.filter(a => a.approver_id === currentUserId);

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-800 sm:rounded-xl sm:max-w-3xl sm:max-h-[90vh] overflow-hidden overscroll-contain shadow-2xl flex flex-col">
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 sm:rounded-t-xl">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-white" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Approval Workflow</h2>
          </div>
          <button onClick={onClose} className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-95">
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
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
      </div>
    </div>
  );
}
