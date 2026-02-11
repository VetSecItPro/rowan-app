/**
 * QuickActions — Time-of-day context-aware action chips
 *
 * Shows horizontally scrollable pills with contextual suggestions
 * based on the current time of day. Tapping a chip sends the text
 * directly to the chat.
 */

'use client';

import { useMemo } from 'react';

interface QuickActionsProps {
  onSend: (message: string) => void;
}

interface QuickAction {
  label: string;
  message: string;
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const ACTIONS: Record<'morning' | 'afternoon' | 'evening', QuickAction[]> = {
  morning: [
    { label: "What's on today?", message: "What's on my schedule today?" },
    { label: 'Plan breakfast', message: 'Help me plan breakfast' },
    { label: 'Due today', message: 'What tasks are due today?' },
    { label: "Tomorrow's prep", message: 'What should I prepare for tomorrow?' },
  ],
  afternoon: [
    { label: 'Check budget', message: 'How is the budget looking this month?' },
    { label: "What's for dinner?", message: "What's planned for dinner tonight?" },
    { label: 'Overdue tasks', message: 'Do I have any overdue tasks?' },
    { label: 'Shopping list', message: 'Show me the shopping list' },
  ],
  evening: [
    { label: 'Plan dinner', message: 'Help me plan dinner' },
    { label: "Tomorrow's schedule", message: "What's on the schedule tomorrow?" },
    { label: 'Meal prep', message: 'Help me plan meals for this week' },
    { label: 'Weekly review', message: 'Give me a summary of this week' },
  ],
};

export default function QuickActions({ onSend }: QuickActionsProps) {
  const actions = useMemo(() => ACTIONS[getTimeOfDay()], []);

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1 -mx-1">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => onSend(action.message)}
          className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-600 transition-colors whitespace-nowrap"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
