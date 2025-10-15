'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Send, Reply, Edit2, Trash2, User } from 'lucide-react';
import { eventCommentsService, EventComment } from '@/lib/services/event-comments-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDistance } from 'date-fns';

interface EventCommentThreadProps {
  eventId: string;
  spaceId: string;
  onClose?: () => void;
}

export function EventCommentThread({ eventId, spaceId, onClose }: EventCommentThreadProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<EventComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [eventId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await eventCommentsService.getComments(eventId);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await eventCommentsService.createComment({
        event_id: eventId,
        space_id: spaceId,
        content: newComment,
        parent_comment_id: replyTo || undefined
      });

      setNewComment('');
      setReplyTo(null);
      await loadComments();
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await eventCommentsService.updateComment(commentId, {
        content: editContent
      });

      setEditingId(null);
      setEditContent('');
      await loadComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!commentToDelete) return;

    try {
      await eventCommentsService.deleteComment(commentToDelete);
      await loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setShowDeleteConfirm(false);
      setCommentToDelete(null);
    }
  };

  const renderComment = (comment: EventComment, depth = 0) => {
    const isOwn = comment.user_id === user?.id;
    const isEditing = editingId === comment.id;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-calendar rounded-full flex items-center justify-center">
                {comment.user?.avatar_url ? (
                  <img
                    src={comment.user.avatar_url}
                    alt={comment.user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {comment.user?.name || 'Unknown User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistance(new Date(comment.created_at), new Date(), { addSuffix: true })}
                </p>
              </div>
            </div>

            {isOwn && !isEditing && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded transition-colors"
                  aria-label="Edit comment"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                  aria-label="Delete comment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(comment.id)}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditContent('');
                  }}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {comment.content}
              </p>

              {/* Reply button */}
              <button
                onClick={() => setReplyTo(comment.id)}
                className="mt-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 font-medium"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            </>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div>
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-h-[600px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-gray-900 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Discussion ({comments.length})
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Close
          </button>
        )}
      </div>

      {/* Comments */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No comments yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map(comment => renderComment(comment))}
        </div>
      )}

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="mt-6 sticky bottom-0 bg-white dark:bg-gray-900 pt-4 border-t border-gray-200 dark:border-gray-700">
        {replyTo && (
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Reply className="w-4 h-4" />
            Replying to comment...
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            rows={2}
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="px-4 py-2 bg-gradient-calendar text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2 h-fit"
          >
            <Send className="w-4 h-4" />
            Post
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
