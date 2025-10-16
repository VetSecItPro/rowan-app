'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  createComment,
  updateComment,
  toggleReaction,
  getCommentReactions,
  type CommentWithDetails,
  type CommentableType,
  type ReactionSummary,
} from '@/lib/services/comments-service';
import CommentForm from './CommentForm';
import ReactionPicker from './ReactionPicker';

interface CommentItemProps {
  comment: CommentWithDetails;
  onDelete: (commentId: string) => void;
  onPin: (commentId: string) => void;
  onReply: () => void;
  spaceId: string;
  commentableType: CommentableType;
  commentableId: string;
  maxDepth: number;
  currentUserId?: string;
}

export default function CommentItem({
  comment,
  onDelete,
  onPin,
  onReply,
  spaceId,
  commentableType,
  commentableId,
  maxDepth,
  currentUserId,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);
  const [loadingReactions, setLoadingReactions] = useState(false);

  const canReply = comment.thread_depth < maxDepth;
  const isOwner = currentUserId === comment.created_by;

  // Load reactions
  const loadReactions = async () => {
    try {
      setLoadingReactions(true);
      const data = await getCommentReactions(comment.id);
      setReactions(data);
    } catch (err) {
      console.error('Failed to load reactions:', err);
    } finally {
      setLoadingReactions(false);
    }
  };

  // Handle reply submission
  const handleReplySubmit = async (content: string) => {
    if (!currentUserId) return;

    try {
      await createComment({
        space_id: spaceId,
        commentable_type: commentableType,
        commentable_id: commentableId,
        content,
        created_by: currentUserId,
        parent_comment_id: comment.id,
      });
      setIsReplying(false);
      onReply();
    } catch (err) {
      console.error('Failed to create reply:', err);
    }
  };

  // Handle edit submission
  const handleEditSubmit = async (content: string) => {
    try {
      await updateComment(comment.id, { content });
      setIsEditing(false);
      onReply();
    } catch (err) {
      console.error('Failed to update comment:', err);
    }
  };

  // Handle reaction
  const handleReaction = async (emoji: string) => {
    if (!currentUserId) return;

    try {
      await toggleReaction(comment.id, currentUserId, emoji);
      await loadReactions();
      setShowReactionPicker(false);
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  // Show reactions on mount
  useState(() => {
    loadReactions();
  });

  return (
    <div className="group relative">
      <div className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              {comment.user_email?.charAt(0).toUpperCase() || '?'}
            </div>
            {/* User Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {comment.user_email?.split('@')[0] || 'Unknown'}
                </span>
                {comment.is_edited && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">(edited)</span>
                )}
                {comment.is_pinned && (
                  <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Actions Menu */}
          {isOwner && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                title="Edit"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={() => onPin(comment.id)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                title={comment.is_pinned ? 'Unpin' : 'Pin'}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                title="Delete"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mb-3">
            <CommentForm
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditing(false)}
              initialValue={comment.content}
              spaceId={spaceId}
              placeholder="Edit your comment..."
            />
          </div>
        ) : (
          <p className="mb-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
            {comment.content}
          </p>
        )}

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {reactions.map((reaction) => {
              const hasReacted = currentUserId && reaction.user_ids.includes(currentUserId);
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                    hasReacted
                      ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {reaction.emoji} {reaction.count}
                </button>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 text-xs">
          {canReply && (
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              Reply
            </button>
          )}
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            React
          </button>
        </div>

        {/* Reaction Picker */}
        {showReactionPicker && (
          <div className="mt-3">
            <ReactionPicker onSelect={handleReaction} onClose={() => setShowReactionPicker(false)} />
          </div>
        )}

        {/* Reply Form */}
        {isReplying && (
          <div className="mt-3 rounded-lg border-l-2 border-blue-500 bg-gray-50 p-3 dark:border-blue-400 dark:bg-gray-700/50">
            <CommentForm
              onSubmit={handleReplySubmit}
              onCancel={() => setIsReplying(false)}
              spaceId={spaceId}
              placeholder="Write a reply..."
            />
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 mt-3 space-y-3 border-l-2 border-gray-200 pl-4 dark:border-gray-700">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onDelete={onDelete}
              onPin={onPin}
              onReply={onReply}
              spaceId={spaceId}
              commentableType={commentableType}
              commentableId={commentableId}
              maxDepth={maxDepth}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
