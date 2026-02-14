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

/** Renders an emoji reaction picker for responding to messages. */
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
        className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        title="Add reaction"
        aria-label="Add reaction"
      >
        <Smile className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Picker Popup - Glassmorphism */}
          <div className="absolute bottom-full left-0 mb-2 bg-gray-800/95 border border-gray-600/50 rounded-2xl shadow-2xl shadow-black/40 p-2.5 z-20 flex gap-1 flex-wrap max-w-[220px] ring-1 ring-white/5">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-9 h-9 flex items-center justify-center hover:bg-gray-600/60 rounded-xl text-xl transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-md"
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
