'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { taskCommentsService, TaskComment } from '@/lib/services/task-comments-service';
import { CTAButton } from '@/components/ui/EnhancedButton';

interface TaskCommentsProps {
  taskId: string;
  userId: string;
}

export function TaskComments({ taskId, userId }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [taskId]);

  async function loadComments() {
    try {
      const data = await taskCommentsService.getComments(taskId);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await taskCommentsService.addComment({
        task_id: taskId,
        user_id: userId,
        content: newComment,
      });
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }

  async function addReaction(commentId: string, emoji: string) {
    try {
      await taskCommentsService.addCommentReaction(commentId, userId, emoji);
      loadComments();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading comments...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Comments ({comments.length})
        </h4>
        <div className="group relative">
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Comments help"
          >
            ⓘ
          </button>
          <div className="absolute left-0 top-6 hidden group-hover:block z-50 w-64 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg">
            Add comments to collaborate with your team. React with emojis to show support or acknowledgment.
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => addReaction(comment.id, '👍')}
                className="text-xs text-gray-500 hover:text-gray-700"
                title="React with thumbs up"
                aria-label="React with thumbs up"
              >
                👍
              </button>
              <button
                onClick={() => addReaction(comment.id, '❤️')}
                className="text-xs text-gray-500 hover:text-gray-700"
                title="React with heart"
                aria-label="React with heart"
              >
                ❤️
              </button>
              <span className="text-xs text-gray-400">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          title="Type your comment here and press Send"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
        />
        <CTAButton
          type="submit"
          feature="tasks"
          size="sm"
          icon={<Send className="w-4 h-4" />}
          breathing
          ripple
        >
        </CTAButton>
      </form>
    </div>
  );
}
