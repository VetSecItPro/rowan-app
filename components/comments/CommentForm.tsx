'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CTAButton, SecondaryButton } from '@/components/ui/EnhancedButton';
import { logger } from '@/lib/logger';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  initialValue?: string;
  spaceId: string;
  placeholder?: string;
}

interface SpaceMember {
  user_id: string;
  users: {
    email: string;
  };
}

export default function CommentForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialValue = '',
  spaceId,
  placeholder = 'Write a comment...',
}: CommentFormProps) {
  const [content, setContent] = useState(initialValue);
  const [mentions, setMentions] = useState<SpaceMember[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load space members for mentions
  useEffect(() => {
    const loadMembers = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('space_members')
        .select('user_id, users(email)')
        .eq('space_id', spaceId);

      if (data) {
        setMentions(data as any);
      }
    };

    loadMembers();
  }, [spaceId]);

  // Handle textarea input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Check for @ mention trigger
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);

      // Check if there's a space after @
      if (!textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setSelectedMentionIndex(0);

        // Calculate position for mention dropdown
        if (textareaRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          setMentionPosition({
            top: rect.bottom,
            left: rect.left,
          });
        }
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Filter mentions based on query
  const filteredMentions = mentions.filter((member) =>
    member.users.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Handle mention selection
  const selectMention = (email: string) => {
    if (!textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = content.substring(cursorPosition);

    const username = email.split('@')[0];
    const newContent =
      content.substring(0, lastAtSymbol) + `@${username} ` + textAfterCursor;

    setContent(newContent);
    setShowMentions(false);

    // Focus and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtSymbol + username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation in mention list
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredMentions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && e.shiftKey === false) {
        e.preventDefault();
        selectMention(filteredMentions[selectedMentionIndex].users.email);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
      }
    } else if (e.key === 'Enter' && e.shiftKey === false && !showMentions) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSubmitting) return;

    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (err) {
      logger.error('Failed to submit comment:', err, { component: 'CommentForm', action: 'component_action' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        disabled={isSubmitting}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
      />

      {/* Mention Autocomplete Dropdown */}
      {showMentions && filteredMentions.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-64 overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {filteredMentions.map((member, index) => (
            <button
              key={member.user_id}
              type="button"
              onClick={() => selectMention(member.users.email)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                index === selectedMentionIndex
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                {member.users.email.charAt(0).toUpperCase()}
              </div>
              <span>{member.users.email.split('@')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Use @ to mention someone
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <SecondaryButton
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              feature="messages"
              size="sm"
            >
              Cancel
            </SecondaryButton>
          )}
          <CTAButton
            type="submit"
            disabled={!content.trim() || isSubmitting}
            feature="messages"
            size="sm"
            icon={<Send className="w-4 h-4" />}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </CTAButton>
        </div>
      </div>
    </form>
  );
}
