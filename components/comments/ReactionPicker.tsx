'use client';

import { useEffect, useRef } from 'react';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const COMMON_REACTIONS = [
  '👍',
  '❤️',
  '😊',
  '😂',
  '🎉',
  '🤔',
  '👏',
  '🔥',
  '✅',
  '👀',
  '💯',
  '🚀',
  '💪',
  '🙌',
  '⭐',
  '💡',
];

export default function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="rounded-lg border border-gray-700 bg-gray-800 p-2"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300">
          Pick a reaction
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
        {COMMON_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded text-lg transition-transform hover:scale-125 hover:bg-gray-700"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
