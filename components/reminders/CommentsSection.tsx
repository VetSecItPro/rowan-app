'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { MessageCircle, Send, Edit, Trash2 } from 'lucide-react';
import { reminderCommentsService, ReminderComment } from '@/lib/services/reminder-comments-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { MentionInput } from './MentionInput';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { showError } from '@/lib/utils/toast';

interface CommentsSectionProps {
  reminderId: string;
  spaceId: string;
}

/** Displays a comment section for discussing a reminder. */
export function CommentsSection({ reminderId, spaceId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ReminderComment[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reminderCommentsService.getComments(reminderId);
      setComments(data);
    } catch (error) {
      logger.error('Error fetching comments:', error, { component: 'CommentsSection', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }, [reminderId]);

  // Initial fetch
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`reminder_comments:${reminderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminder_comments',
          filter: `reminder_id=eq.${reminderId}`,
        },
        (payload: RealtimePostgresChangesPayload<{[key: string]: unknown}>) => {
          logger.info('Real-time comment update:', { component: 'CommentsSection', data: payload });
          // Refresh comments when changes occur, but debounce to avoid excessive calls
          setTimeout(() => fetchComments(), 100);
        }
      )
      .subscribe((status: string) => {
        logger.info('Comment subscription status:', { component: 'CommentsSection', data: status });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComments, reminderId, supabase]);

  // Create comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCommentContent.trim()) return;

    const tempComment: ReminderComment = {
      id: `temp-${Date.now()}`,
      reminder_id: reminderId,
      user_id: user.id,
      content: newCommentContent.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email,
        avatar_url: user.avatar_url || undefined,
      },
    };

    try {
      setSubmitting(true);

      // Optimistic update: Add comment immediately to UI
      setComments(prev => [...prev, tempComment]);
      setNewCommentContent('');

      // Create comment in database
      const newComment = await reminderCommentsService.createComment({
        reminder_id: reminderId,
        user_id: user.id,
        content: tempComment.content,
      });

      // Replace temp comment with real comment from database
      setComments(prev =>
        prev.map(c => c.id === tempComment.id ? newComment : c)
      );

      // Realtime subscription handles refresh — no backup fetch needed (PERF-022)

    } catch (error) {
      logger.error('Error creating comment:', error, { component: 'CommentsSection', action: 'component_action' });

      // Remove temp comment on error
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setNewCommentContent(tempComment.content); // Restore content for retry

      showError('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Start editing
  const handleStartEdit = (comment: ReminderComment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  // Update comment
  const handleUpdate = async (commentId: string) => {
    if (!user || !editContent.trim()) return;

    try {
      await reminderCommentsService.updateComment(commentId, user.id, {
        content: editContent.trim(),
      });
      setEditingCommentId(null);
      setEditContent('');
      // Comments will update via real-time subscription
    } catch (error) {
      logger.error('Error updating comment:', error, { component: 'CommentsSection', action: 'component_action' });
      showError('Failed to update comment. Please try again.');
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    if (!user) return;
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!user || !commentToDelete) return;

    try {
      await reminderCommentsService.deleteComment(commentToDelete, user.id);
      // Comments will update via real-time subscription
    } catch (error) {
      logger.error('Error deleting comment:', error, { component: 'CommentsSection', action: 'component_action' });
      showError('Failed to delete comment. Please try again.');
    } finally {
      setShowDeleteConfirm(false);
      setCommentToDelete(null);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-300">
        <MessageCircle className="w-5 h-5" />
        <h3 className="font-semibold">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user.id}
              spaceId={spaceId}
              isEditing={editingCommentId === comment.id}
              editContent={editContent}
              onEditContentChange={setEditContent}
              onStartEdit={() => handleStartEdit(comment)}
              onCancelEdit={handleCancelEdit}
              onUpdate={() => handleUpdate(comment.id)}
              onDelete={() => handleDelete(comment.id)}
            />
          ))}
        </div>
      )}

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-start gap-3">
          {/* User Avatar */}
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name || 'User'}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(user.name || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
          )}

          {/* Mention Input */}
          <div className="flex-1">
            <MentionInput
              value={newCommentContent}
              onChange={setNewCommentContent}
              spaceId={spaceId}
              placeholder="Write a comment... Type @ to mention someone"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
              rows={2}
              maxLength={5000}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pl-11">
          <span className="text-xs text-gray-400">
            {newCommentContent.length}/5000
          </span>
          <button
            type="submit"
            disabled={!newCommentContent.trim() || submitting}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Delete Comment Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCommentToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}

// =============================================
// COMMENT ITEM COMPONENT
// =============================================

interface CommentItemProps {
  comment: ReminderComment;
  currentUserId: string;
  spaceId: string;
  isEditing: boolean;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

function CommentItem({
  comment,
  currentUserId,
  spaceId,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const isOwner = comment.user_id === currentUserId;
  const wasEdited = reminderCommentsService.wasEdited(comment);
  const timeAgo = reminderCommentsService.formatCommentTime(comment.created_at);

  return (
    <div className="flex items-start gap-3 group">
      {/* User Avatar */}
      {comment.user?.avatar_url ? (
        <Image
          src={comment.user.avatar_url}
          alt={comment.user.name || 'User'}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {comment.user?.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '?'}
        </div>
      )}

      {/* Comment Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm">
                {comment.user?.name || 'Unknown User'}
              </span>
              <span className="text-xs text-gray-400">
                {timeAgo}
                {wasEdited && ' (edited)'}
              </span>
            </div>

            {/* Actions (for comment owner) */}
            {isOwner && !isEditing && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={onStartEdit}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  aria-label="Edit comment"
                >
                  <Edit className="w-3 h-3 text-gray-400" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                  aria-label="Delete comment"
                >
                  <Trash2 className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            )}
          </div>

          {/* Content or Edit Form */}
          {isEditing ? (
            <div className="space-y-2">
              <MentionInput
                value={editContent}
                onChange={onEditContentChange}
                spaceId={spaceId}
                placeholder="Edit comment... Type @ to mention someone"
                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white resize-none"
                rows={3}
                maxLength={5000}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1 text-sm text-gray-400 hover:bg-gray-700 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onUpdate}
                  disabled={!editContent.trim()}
                  className="px-3 py-1 text-sm bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
