'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';

interface ReactionPickerProps {
  onSelectEmoji: (emoji: string) => void;
  className?: string;
}

// Common reaction emojis
const REACTION_EMOJIS = [
  '❤️', '👍', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '✨', '💯', '🙌'
];

export function ReactionPicker({ onSelectEmoji, className = '' }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onSelectEmoji(emoji);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Add reaction"
        aria-label="Add reaction"
      >
        <Smile className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Picker Popup */}
          <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl p-2 z-20 flex gap-1 flex-wrap max-w-[200px]">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xl transition-all hover:scale-110 active:scale-95"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
