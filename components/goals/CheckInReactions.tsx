'use client';

import { useState, useEffect } from 'react';
import { Smile, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { hapticLight, hapticSuccess } from '@/lib/utils/haptics';

interface CheckInReaction {
  id: string;
  check_in_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  users?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface CheckInReactionsProps {
  checkInId: string;
  className?: string;
}

// Popular emoji reactions for check-ins
const popularEmojis = ['👍', '❤️', '🎉', '🔥', '💪', '👏', '🚀', '✨', '🎯', '💯', '👌', '🙌'];

// Additional emojis organized by category
const emojiCategories = {
  celebration: ['🎉', '🥳', '🍾', '🎊', '🎈', '🏆', '🥇', '🌟'],
  motivation: ['💪', '🔥', '🚀', '⚡', '💯', '🎯', '🌈', '⭐'],
  support: ['👍', '👏', '🙌', '👌', '✨', '💫', '🌸', '🌺'],
  love: ['❤️', '💕', '💖', '😍', '🥰', '💝', '💘', '💗'],
  progress: ['📈', '📊', '⬆️', '🔺', '📋', '✅', '☑️', '🎖️'],
  fun: ['😄', '😊', '🤩', '😎', '🤗', '😋', '🙂', '😉']
};

export function CheckInReactions({ checkInId, className = '' }: CheckInReactionsProps) {
  const [reactions, setReactions] = useState<CheckInReaction[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    loadUser();
    loadReactions();
  }, [checkInId]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadReactions = async () => {
    try {
      setLoading(true);

      // First check if the table exists
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('goal_check_ins')
        .select('id')
        .eq('id', checkInId)
        .limit(1);

      if (checkInsError) {
        console.error('Error checking check-in existence:', checkInsError);
        return;
      }

      if (!checkInsData || checkInsData.length === 0) {
        console.warn('Check-in not found:', checkInId);
        return;
      }

      // Try to load reactions - this table might not exist yet
      const { data: reactionsData, error } = await supabase
        .from('goal_check_in_reactions')
        .select(`
          *,
          users!goal_check_in_reactions_user_id_fkey(id, email, full_name, avatar_url)
        `)
        .eq('check_in_id', checkInId);

      if (error) {
        // Table might not exist yet, that's okay
        console.log('Reactions table not available yet:', error.message);
        setReactions([]);
        setReactionCounts({});
        setUserReactions(new Set());
        return;
      }

      setReactions(reactionsData || []);

      // Calculate reaction counts
      const counts: Record<string, number> = {};
      const userReactionSet = new Set<string>();

      (reactionsData || []).forEach((reaction: { emoji: string; user_id: string }) => {
        counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
        if (user && reaction.user_id === user.id) {
          userReactionSet.add(reaction.emoji);
        }
      });

      setReactionCounts(counts);
      setUserReactions(userReactionSet);
    } catch (error) {
      console.error('Error loading reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user) return;

    hapticLight();

    try {
      const hasReacted = userReactions.has(emoji);

      if (hasReacted) {
        // Remove reaction
        const { error } = await supabase
          .from('goal_check_in_reactions')
          .delete()
          .eq('check_in_id', checkInId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) throw error;

        // Update local state
        setReactionCounts(prev => ({
          ...prev,
          [emoji]: Math.max(0, (prev[emoji] || 0) - 1)
        }));
        setUserReactions(prev => {
          const newSet = new Set(prev);
          newSet.delete(emoji);
          return newSet;
        });
      } else {
        // Add reaction
        const { error } = await supabase
          .from('goal_check_in_reactions')
          .insert([{
            check_in_id: checkInId,
            user_id: user.id,
            emoji
          }]);

        if (error) throw error;

        hapticSuccess();

        // Update local state
        setReactionCounts(prev => ({
          ...prev,
          [emoji]: (prev[emoji] || 0) + 1
        }));
        setUserReactions(prev => new Set([...prev, emoji]));
      }

      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const getReactionUsers = (emoji: string) => {
    return reactions
      .filter(r => r.emoji === emoji)
      .map(r => r.users?.full_name || r.users?.email || 'Someone')
      .slice(0, 3); // Show first 3 users
  };

  const getReactionTooltip = (emoji: string) => {
    const users = getReactionUsers(emoji);
    const count = reactionCounts[emoji] || 0;

    if (count === 0) return '';
    if (count === 1) return users[0];
    if (count === 2) return `${users[0]} and ${users[1]}`;
    if (count === 3) return `${users[0]}, ${users[1]} and ${users[2]}`;
    return `${users[0]}, ${users[1]} and ${count - 2} others`;
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Get emojis that have reactions
  const reactedEmojis = Object.keys(reactionCounts).filter(emoji => reactionCounts[emoji] > 0);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Existing reactions */}
      {reactedEmojis.map(emoji => (
        <button
          key={emoji}
          onClick={() => handleReaction(emoji)}
          title={getReactionTooltip(emoji)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105 ${
            userReactions.has(emoji)
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <span>{emoji}</span>
          <span className="font-medium">{reactionCounts[emoji]}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          title="Add reaction"
        >
          <Smile className="h-3 w-3" />
          <Plus className="h-2 w-2" />
        </button>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50 min-w-[240px]">
            {/* Popular emojis */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Popular</p>
              <div className="grid grid-cols-6 gap-1">
                {popularEmojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center ${
                      userReactions.has(emoji) ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                    }`}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(emojiCategories).map(([category, emojis]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">
                    {category}
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className={`w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center text-sm ${
                          userReactions.has(emoji) ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                        }`}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Close button */}
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="w-full px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
}