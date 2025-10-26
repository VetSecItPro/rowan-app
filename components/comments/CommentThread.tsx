'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getComments,
  createComment,
  deleteComment,
  togglePinComment,
  type CommentWithDetails,
  type CommentableType,
} from '@/lib/services/comments-service';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import { useUser } from '@/lib/hooks/useUser';

interface CommentThreadProps {
  commentableType: CommentableType;
  commentableId: string;
  spaceId: string;
  maxDepth?: number;
  showActivityLog?: boolean;
}

export default function CommentThread({
  commentableType,
  commentableId,
  spaceId,
  maxDepth = 5,
  showActivityLog = false,
}: CommentThreadProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<CommentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments
  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getComments(commentableType, commentableId);
      setComments(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [commentableType, commentableId]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`comments:${commentableType}:${commentableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `commentable_id=eq.${commentableId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commentableType, commentableId]);

  // Handle new comment submission
  const handleSubmit = async (content: string) => {
    if (!user) return;

    try {
      setIsSubmitting(true);
      await createComment({
        space_id: spaceId,
        commentable_type: commentableType,
        commentable_id: commentableId,
        content,
        created_by: user.id,
      });
      await loadComments();
    } catch (err) {
      console.error('Failed to create comment:', err);
      setError('Failed to create comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (commentId: string) => {
    if (!user?.id) return;

    try {
      await deleteComment(commentId, user.id);
      await loadComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError('Failed to delete comment');
    }
  };

  // Handle pin toggle
  const handlePin = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      await togglePinComment(commentId, !comment.is_pinned);
      await loadComments();
    } catch (err) {
      console.error('Failed to pin comment:', err);
      setError('Failed to pin comment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Separate pinned and regular comments
  const pinnedComments = comments.filter((c) => c.is_pinned);
  const regularComments = comments.filter((c) => !c.is_pinned);

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
          Add a comment
        </h3>
        <CommentForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          spaceId={spaceId}
          placeholder="Write a comment... Use @username to mention someone"
        />
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {/* Pinned Comments */}
        {pinnedComments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-amber-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pinned Comments
              </h4>
            </div>
            {pinnedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={handleDelete}
                onPin={handlePin}
                onReply={loadComments}
                spaceId={spaceId}
                commentableType={commentableType}
                commentableId={commentableId}
                maxDepth={maxDepth}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}

        {/* Regular Comments */}
        {regularComments.length > 0 ? (
          <div className="space-y-3">
            {pinnedComments.length > 0 && (
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                All Comments ({regularComments.length})
              </h4>
            )}
            {regularComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={handleDelete}
                onPin={handlePin}
                onReply={loadComments}
                spaceId={spaceId}
                commentableType={commentableType}
                commentableId={commentableId}
                maxDepth={maxDepth}
                currentUserId={user?.id}
              />
            ))}
          </div>
        ) : (
          !pinnedComments.length && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No comments yet. Be the first to comment!
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
