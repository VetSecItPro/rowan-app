'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface SpaceMember {
  user_id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  spaceId: string;
  placeholder?: string;
  className?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
}

export function MentionInput({
  value,
  onChange,
  spaceId,
  placeholder = 'Type @ to mention someone...',
  className = '',
  rows = 3,
  maxLength = 5000,
  disabled = false,
}: MentionInputProps) {
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch space members
  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('space_members')
        .select(`
          user_id,
          user:user_id!inner (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('space_id', spaceId);

      if (error) {
        logger.error('Error fetching space members:', error, { component: 'MentionInput', action: 'component_action' });
        return;
      }

      setMembers((data as unknown as SpaceMember[]) || []);
    };

    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase instance is stable
  }, [spaceId]);

  const filteredMembers = useMemo(() => {
    if (!mentionSearch) {
      return members;
    }

    const loweredSearch = mentionSearch.toLowerCase();
    return members.filter((member) =>
      member.user.name.toLowerCase().includes(loweredSearch)
    );
  }, [mentionSearch, members]);

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);

    // Check for @ mention trigger
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentionDropdown(true);
      setMentionSearch(mentionMatch[1]);
      setMentionStartPos(cursorPos - mentionMatch[0].length);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionDropdown(false);
      setMentionSearch('');
      setSelectedMentionIndex(0);
    }
  };

  // Handle mention selection
  const insertMention = (member: SpaceMember) => {
    if (!textareaRef.current) return;

    const mentionText = `@[${member.user.name}](${member.user.id})`;
    const beforeMention = value.slice(0, mentionStartPos);
    const afterMention = value.slice(textareaRef.current.selectionStart);
    const newValue = beforeMention + mentionText + ' ' + afterMention;

    onChange(newValue);
    setShowMentionDropdown(false);
    setMentionSearch('');

    // Set cursor position after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = (beforeMention + mentionText + ' ').length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionDropdown) return;

    const activeIndex = Math.min(
      selectedMentionIndex,
      Math.max(0, filteredMembers.length - 1)
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev < filteredMembers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && filteredMembers.length > 0) {
      e.preventDefault();
      insertMention(filteredMembers[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMentionDropdown(false);
      setMentionSearch('');
    }
  };

  // Display formatted text (convert mention syntax to readable format)
  const displayValue = value.replace(/@\[([^\]]+)\]\([a-f0-9-]+\)/g, '@$1');

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
      />

      {/* Mention Dropdown */}
      {showMentionDropdown && filteredMembers.length > 0 && (
        <>
          <div
            ref={dropdownRef}
            className="absolute z-50 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto"
            style={{
              bottom: 'calc(100% + 4px)',
              left: 0,
            }}
          >
            {filteredMembers.map((member, index) => (
              <button
                key={member.user_id}
                onClick={() => insertMention(member)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors ${
                  index === Math.min(selectedMentionIndex, Math.max(0, filteredMembers.length - 1))
                    ? 'bg-gray-700'
                    : ''
                }`}
              >
                {/* Avatar */}
                {member.user.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={member.user.avatar_url}
                    alt={member.user.name}
                    loading="lazy"
                    decoding="async"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {member.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}

                {/* User Info */}
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">
                    {member.user.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    @{member.user.name.toLowerCase().replace(/\s+/g, '')}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Hint */}
          <div className="mt-1 text-xs text-gray-400">
            Use ↑ ↓ to navigate, Enter to select, Esc to cancel
          </div>
        </>
      )}
    </div>
  );
}
