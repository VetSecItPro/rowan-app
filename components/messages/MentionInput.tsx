'use client';

import { useState, useEffect, useRef, KeyboardEvent, ChangeEvent, forwardRef } from 'react';
import { MentionableUser, mentionsService } from '@/lib/services/mentions-service';
import { AtSign } from 'lucide-react';
import { RichTextToolbar } from './RichTextToolbar';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  spaceId: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showToolbar?: boolean;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  spaceId,
  placeholder = 'Type a message...',
  disabled = false,
  className = '',
  showToolbar = true,
}: MentionInputProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteUsers, setAutocompleteUsers] = useState<MentionableUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Load mentionable users when component mounts
  useEffect(() => {
    async function loadUsers() {
      const users = await mentionsService.getMentionableUsers(spaceId);
      setAutocompleteUsers(users);
    }

    if (spaceId) {
      loadUsers();
    }
  }, [spaceId]);

  // Handle input change and detect @ mentions
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check if we're in a mention context (after @)
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      // Check if there's a space between @ and cursor
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);

      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        // We're in a mention context
        setMentionQuery(textAfterAt.toLowerCase());
        setShowAutocomplete(true);
        setSelectedIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  // Filter users based on mention query
  const filteredUsers = autocompleteUsers.filter((user) => {
    if (!mentionQuery) return true;

    const displayNameMatch = user.display_name.toLowerCase().includes(mentionQuery);
    const emailMatch = user.email.toLowerCase().includes(mentionQuery);

    return displayNameMatch || emailMatch;
  }).slice(0, 5); // Limit to 5 results

  // Insert mention into input
  const insertMention = (user: MentionableUser) => {
    if (!inputRef.current) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    // Replace @query with @username
    const beforeMention = value.substring(0, atIndex);
    const mention = `@${user.display_name}`;
    const newValue = beforeMention + mention + ' ' + textAfterCursor;

    onChange(newValue);
    setShowAutocomplete(false);

    // Move cursor after mention
    setTimeout(() => {
      const newCursorPos = beforeMention.length + mention.length + 1;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      inputRef.current?.focus();
    }, 0);
  };

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAutocomplete || filteredUsers.length === 0) {
      // Handle submit on Enter without shift
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
      return;
    }

    // Autocomplete navigation
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? filteredUsers.length - 1 : prev - 1
        );
        break;

      case 'Enter':
      case 'Tab':
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
        break;

      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        break;
    }
  };

  // Click outside to close autocomplete and toolbar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }

      // Hide toolbar when clicking outside the input container
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsToolbarVisible(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <div className={`border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-300 ${
        isToolbarVisible ? '' : ''
      }`}>
        {/* Rich Text Toolbar - Only show when toggled */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          showToolbar && isToolbarVisible ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          {showToolbar && <RichTextToolbar textareaRef={inputRef} />}
        </div>

        <textarea
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsToolbarVisible(true)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={`w-full px-4 py-3 pr-12 ${isToolbarVisible ? 'rounded-b-xl border-0' : 'rounded-xl border border-gray-200 dark:border-gray-700'}
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            placeholder-gray-500 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600
            resize-none min-h-[48px] max-h-[150px] ${className}`}
          style={{
            height: 'auto',
            overflowY: value.split('\n').length > 3 ? 'scroll' : 'hidden',
          }}
        />
      </div>

      {/* Autocomplete Dropdown */}
      {showAutocomplete && filteredUsers.length > 0 && (
        <div
          ref={autocompleteRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50
            max-h-60 overflow-y-auto"
        >
          <div className="p-2">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <AtSign className="w-4 h-4" />
              <span>Mention someone</span>
            </div>
            {filteredUsers.map((user, index) => (
              <button
                key={user.user_id}
                onClick={() => insertMention(user)}
                className={`w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.display_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
