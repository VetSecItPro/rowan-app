/**
 * EmptyState — Shown when the chat has no messages
 *
 * Displays a greeting with Rowan's avatar and a set of
 * example prompt chips the user can tap to start a conversation.
 */

'use client';

import { Bot } from 'lucide-react';

const EXAMPLE_PROMPTS = [
  'What tasks are due today?',
  'Help me plan dinner',
  'Create a grocery list',
  'What\u2019s on the calendar this week?',
];

interface EmptyStateProps {
  onSend: (message: string) => void;
}

export default function EmptyState({ onSend }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-4">
        <Bot className="w-6 h-6 text-blue-400" />
      </div>
      <h3 className="text-sm font-medium text-white mb-1">
        Hey! I&apos;m Rowan
      </h3>
      <p className="text-xs text-gray-400 max-w-[280px] mb-6">
        I can help you create tasks, plan meals, schedule events, and manage
        your household. Just ask!
      </p>

      {/* Example prompt chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-[320px]">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSend(prompt)}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-600 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
