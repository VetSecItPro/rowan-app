/**
 * EmptyState — Shown when the chat has no messages
 *
 * Displays a personalized, time-aware greeting with the user's first name
 * and rotating messages (40 variations). Shows contextual suggestion chips
 * based on time of day. Inspired by ChatGPT's rotating prompts.
 */

'use client';

import { useMemo } from 'react';
import { Bot } from 'lucide-react';

// ── Greeting pools by time of day ──────────────────────────────────

const MORNING_GREETINGS = [
  (name: string) => `Good morning, ${name}`,
  (name: string) => `Rise and shine, ${name}`,
  (name: string) => `Morning, ${name}! Ready to tackle the day?`,
  (name: string) => `Hey ${name}, let's make today count`,
  (name: string) => `Good morning! What's the plan, ${name}?`,
  (name: string) => `Top of the morning, ${name}`,
  (name: string) => `Hey ${name}, what's on your mind this morning?`,
  (name: string) => `Morning, ${name}! How can I help today?`,
  (name: string) => `Fresh day ahead, ${name}. What's first?`,
  (name: string) => `Hey ${name}, let's get organized`,
  (name: string) => `Good morning, ${name}! What do we need to get done?`,
  (name: string) => `Hey ${name}, hope you slept well. What's up?`,
  (name: string) => `Morning! What can I help you with, ${name}?`,
];

const AFTERNOON_GREETINGS = [
  (name: string) => `Hey ${name}, how's the day going?`,
  (name: string) => `Good afternoon, ${name}`,
  (name: string) => `Hey ${name}, what can I help with?`,
  (name: string) => `Afternoon, ${name}! Need a hand with anything?`,
  (name: string) => `Hey ${name}, checking in. What do you need?`,
  (name: string) => `How's it going, ${name}?`,
  (name: string) => `Hey ${name}, what's next on the list?`,
  (name: string) => `Good afternoon! What can I do for you, ${name}?`,
  (name: string) => `Hey ${name}, keeping up with everything?`,
  (name: string) => `Afternoon, ${name}. What's on your mind?`,
  (name: string) => `Hey ${name}, let's check on a few things`,
  (name: string) => `What can I help organize, ${name}?`,
  (name: string) => `Hey ${name}, how can I make your day easier?`,
  (name: string) => `Need anything, ${name}? I'm here`,
];

const EVENING_GREETINGS = [
  (name: string) => `Good evening, ${name}`,
  (name: string) => `Hey ${name}, winding down?`,
  (name: string) => `Evening, ${name}! Need to wrap anything up?`,
  (name: string) => `Hey ${name}, how was the day?`,
  (name: string) => `Good evening! Anything left to take care of, ${name}?`,
  (name: string) => `Hey ${name}, let's get ahead for tomorrow`,
  (name: string) => `Evening, ${name}. What's on your mind?`,
  (name: string) => `Hey ${name}, ready to plan for tomorrow?`,
  (name: string) => `Good evening, ${name}! What can I help with?`,
  (name: string) => `Hey ${name}, let's make sure nothing slipped through`,
  (name: string) => `Evening! Anything I can help sort out, ${name}?`,
  (name: string) => `Hey ${name}, how about a quick check-in?`,
  (name: string) => `Wrapping up the day, ${name}? I'm here if you need me`,
];

// Fallback greetings when we don't have the user's name
const ANONYMOUS_GREETINGS = [
  () => 'Hey there! What can I help with?',
  () => 'Hi! What would you like to tackle?',
  () => 'Hello! How can I help today?',
  () => 'Hey! Ready when you are',
  () => 'Hi there! What\'s on your mind?',
];

// ── Suggestion chips by time of day ────────────────────────────────

interface Suggestion {
  label: string;
  message: string;
}

const MORNING_SUGGESTIONS: Suggestion[] = [
  { label: "What's on today?", message: "What's on my schedule today?" },
  { label: 'Tasks due today', message: 'What tasks are due today?' },
  { label: 'Plan breakfast', message: 'Help me plan breakfast' },
  { label: 'This week at a glance', message: "Give me a summary of what's coming this week" },
];

const AFTERNOON_SUGGESTIONS: Suggestion[] = [
  { label: 'Check the budget', message: 'How is the budget looking this month?' },
  { label: 'Overdue tasks', message: 'Do I have any overdue tasks?' },
  { label: "What's for dinner?", message: "What's planned for dinner tonight?" },
  { label: 'Shopping list', message: 'Show me the shopping list' },
];

const EVENING_SUGGESTIONS: Suggestion[] = [
  { label: 'Plan dinner', message: 'Help me plan dinner' },
  { label: "Tomorrow's schedule", message: "What's on the schedule tomorrow?" },
  { label: 'Weekly meal prep', message: 'Help me plan meals for this week' },
  { label: 'Week in review', message: 'Give me a summary of this week' },
];

// ── Helpers ────────────────────────────────────────────────────────

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getFirstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

// ── Component ──────────────────────────────────────────────────────

interface EmptyStateProps {
  onSend: (message: string) => void;
  userName?: string | null;
}

export default function EmptyState({ onSend, userName }: EmptyStateProps) {
  const timeOfDay = useMemo(() => getTimeOfDay(), []);

  // Pick a greeting once per mount (stable across re-renders)
  const greeting = useMemo(() => {
    const firstName = getFirstName(userName);

    if (!firstName) {
      return pickRandom(ANONYMOUS_GREETINGS)();
    }

    const pool =
      timeOfDay === 'morning'
        ? MORNING_GREETINGS
        : timeOfDay === 'afternoon'
          ? AFTERNOON_GREETINGS
          : EVENING_GREETINGS;

    return pickRandom(pool)(firstName);
  }, [userName, timeOfDay]);

  // Time-aware suggestion chips
  const suggestions = useMemo(() => {
    return timeOfDay === 'morning'
      ? MORNING_SUGGESTIONS
      : timeOfDay === 'afternoon'
        ? AFTERNOON_SUGGESTIONS
        : EVENING_SUGGESTIONS;
  }, [timeOfDay]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-4">
        <Bot className="w-6 h-6 text-blue-400" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">
        {greeting}
      </h3>
      <p className="text-xs text-gray-400 max-w-[280px] mb-6">
        I can help you with tasks, meals, calendar, budgets, and more.
      </p>

      {/* Contextual suggestion chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-[320px]">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSend(s.message)}
            className="px-3 py-1.5 text-xs rounded-full border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-600 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
