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

          {/* Picker Popup - Glassmorphism */}
          <div className="absolute bottom-full left-0 mb-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 border border-white/50 dark:border-gray-600/50 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 p-2.5 z-20 flex gap-1 flex-wrap max-w-[220px] ring-1 ring-black/5 dark:ring-white/5">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/60 dark:hover:bg-gray-600/60 rounded-xl text-xl transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-md"
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
