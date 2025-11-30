'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Heart, ThumbsUp, Smile, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { GoalComment, CreateCommentInput, goalsService } from '@/lib/services/goals-service';
import { createClient } from '@/lib/supabase/client';
import { hapticLight, hapticSuccess } from '@/lib/utils/haptics';
import { cn } from '@/lib/utils';

interface GoalCommentsProps {
  goalId: string;
  className?: string;
}

const emojiReactions = ['👍', '❤️', '🎉', '🔥', '💪', '👏', '🚀', '✨'];

export function GoalComments({ goalId, className }: GoalCommentsProps) {
  const [comments, setComments] = useState<GoalComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});

  const supabase = createClient();

  useEffect(() => {
    loadUser();
    loadComments();
  }, [goalId]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await goalsService.getGoalComments(goalId);
      setComments(commentsData || []);

      // Load reaction counts for each comment
      if (commentsData) {
        const counts: Record<string, Record<string, number>> = {};
        for (const comment of commentsData) {
          if (comment.reaction_counts && typeof comment.reaction_counts === 'object') {
            counts[comment.id] = comment.reaction_counts as Record<string, number>;
          }
        }
        setReactionCounts(counts);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content || isSubmitting || !user) return;

    try {
      setIsSubmitting(true);

      const comment = await goalsService.createComment({
        goal_id: goalId,
        content,
        content_type: 'text'
      });

      hapticSuccess();
      setNewComment('');
      await loadComments(); // Reload to get updated reaction counts
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    const content = editContent.trim();
    if (!content || !user) return;

    try {
      await goalsService.updateComment(commentId, content);

      hapticSuccess();
      setEditingComment(null);
      setEditContent('');
      await loadComments();
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      await goalsService.deleteComment(commentId);

      hapticLight();
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    hapticLight();

    if (!user) return;

    try {
      await goalsService.toggleCommentReaction(commentId, emoji);

      // Reload comments to get updated reaction counts
      await loadComments();
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const startEditing = (comment: GoalComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent('');
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        <div className="flex items-start space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>
              {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('') ||
               user?.email?.[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleAddComment();
                }
              }}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tip: Use @username to mention someone
              </p>
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </div>

        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm">Be the first to share your thoughts!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <div key={comment.id}>
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user?.avatar_url} />
                      <AvatarFallback>
                        {comment.user?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {comment.user?.full_name}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(comment.created_at))} ago
                              {comment.is_edited && ' (edited)'}
                            </span>
                          </div>

                          {user?.id === comment.user_id && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-32">
                                <div className="space-y-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditing(comment)}
                                    className="w-full justify-start"
                                  >
                                    <Edit className="h-3 w-3 mr-2" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="w-full justify-start text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>

                        {editingComment === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
                              className="min-h-[60px] resize-none"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditComment(comment.id)}
                                disabled={!editContent.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        )}
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1">
                          {emojiReactions.map((emoji) => {
                            const count = reactionCounts[comment.id]?.[emoji] || 0;
                            return (
                              <Button
                                key={emoji}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReaction(comment.id, emoji)}
                                className={cn(
                                  "h-7 px-2 text-xs gap-1",
                                  count > 0 && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                )}
                              >
                                {emoji}
                                {count > 0 && <span>{count}</span>}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {index < comments.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}