'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  title: string;
  description: string;
  href: string;
  category: string;
}

// Documentation index - all searchable content
const DOCUMENTATION_INDEX: SearchResult[] = [
  // Tasks & Chores
  { title: 'Introduction to Tasks & Chores', description: 'Learn how Rowan helps you organize daily tasks', href: '/settings/documentation/tasks-chores#intro', category: 'Tasks & Chores' },
  { title: 'Creating Your First Task', description: 'Quick guide to creating tasks with priorities', href: '/settings/documentation/tasks-chores#first-task', category: 'Tasks & Chores' },
  { title: 'Understanding Task Statuses', description: 'Pending, in-progress, completed, blocked statuses', href: '/settings/documentation/tasks-chores#statuses', category: 'Tasks & Chores' },
  { title: 'Setting Priorities', description: 'Use urgent, high, medium, and low priorities', href: '/settings/documentation/tasks-chores#priorities', category: 'Tasks & Chores' },
  { title: 'Task Creation & Editing', description: 'Add tasks with titles, descriptions, due dates', href: '/settings/documentation/tasks-chores#create-tasks', category: 'Tasks & Chores' },
  { title: 'Subtasks & Breakdown', description: 'Break complex tasks into manageable subtasks', href: '/settings/documentation/tasks-chores#subtasks', category: 'Tasks & Chores' },
  { title: 'Task Categories', description: 'Organize tasks with custom color-coded categories', href: '/settings/documentation/tasks-chores#categories', category: 'Tasks & Chores' },
  { title: 'Drag & Drop Reordering', description: 'Visually reorganize tasks with drag-and-drop', href: '/settings/documentation/tasks-chores#drag-drop', category: 'Tasks & Chores' },
  { title: 'Advanced Filtering', description: 'Filter tasks by status, priority, assignee, category', href: '/settings/documentation/tasks-chores#filtering', category: 'Tasks & Chores' },
  { title: 'Real-Time Updates', description: 'See changes instantly as team members update tasks', href: '/settings/documentation/tasks-chores#realtime', category: 'Tasks & Chores' },
  { title: 'Creating Recurring Tasks', description: 'Set up tasks that repeat daily, weekly, monthly', href: '/settings/documentation/tasks-chores#recurring', category: 'Tasks & Chores' },
  { title: 'Task Templates', description: 'Save frequently used task configurations', href: '/settings/documentation/tasks-chores#templates', category: 'Tasks & Chores' },
  { title: 'Time Tracking', description: 'Track time spent on tasks with timer', href: '/settings/documentation/tasks-chores#time-tracking', category: 'Tasks & Chores' },
  { title: 'Due Dates & Reminders', description: 'Set due dates and receive notifications', href: '/settings/documentation/tasks-chores#reminders', category: 'Tasks & Chores' },
  { title: 'Multi-Assignment', description: 'Assign tasks to multiple team members', href: '/settings/documentation/tasks-chores#multi-assignment', category: 'Tasks & Chores' },
  { title: 'Task Dependencies', description: 'Create blocking relationships between tasks', href: '/settings/documentation/tasks-chores#dependencies', category: 'Tasks & Chores' },
  { title: 'File Attachments', description: 'Upload documents and images to tasks', href: '/settings/documentation/tasks-chores#attachments', category: 'Tasks & Chores' },

  // Calendar
  { title: 'Calendar Overview', description: 'Master your schedule with shared calendar', href: '/settings/documentation/calendar#overview', category: 'Calendar' },
  { title: 'Creating Events', description: 'Add events with dates, times, and details', href: '/settings/documentation/calendar#creating-events', category: 'Calendar' },
  { title: 'Event Types', description: 'Personal, shared, and recurring events', href: '/settings/documentation/calendar#event-types', category: 'Calendar' },
  { title: 'Calendar Views', description: 'Month, week, day, and agenda views', href: '/settings/documentation/calendar#views', category: 'Calendar' },
  { title: 'Event Reminders', description: 'Set up notifications for upcoming events', href: '/settings/documentation/calendar#event-reminders', category: 'Calendar' },
  { title: 'Recurring Events', description: 'Create events that repeat on a schedule', href: '/settings/documentation/calendar#recurring-events', category: 'Calendar' },

  // Reminders
  { title: 'Reminders Overview', description: 'Never forget important tasks and events', href: '/settings/documentation/reminders#overview', category: 'Reminders' },
  { title: 'Creating Reminders', description: 'Set up one-time or recurring reminders', href: '/settings/documentation/reminders#creating', category: 'Reminders' },
  { title: 'Reminder Categories', description: 'Organize with bills, health, work, personal', href: '/settings/documentation/reminders#categories', category: 'Reminders' },
  { title: 'Snooze Reminders', description: 'Temporarily postpone reminder notifications', href: '/settings/documentation/reminders#snooze', category: 'Reminders' },
  { title: 'Reminder Priorities', description: 'Set urgent, high, medium, low priorities', href: '/settings/documentation/reminders#priorities', category: 'Reminders' },

  // Shopping
  { title: 'Shopping Lists Overview', description: 'Create and share shopping lists with ease', href: '/settings/documentation/shopping#overview', category: 'Shopping' },
  { title: 'Creating Shopping Lists', description: 'Add items and organize by store or category', href: '/settings/documentation/shopping#creating-lists', category: 'Shopping' },
  { title: 'Adding Items', description: 'Quick add with quantity and notes', href: '/settings/documentation/shopping#adding-items', category: 'Shopping' },
  { title: 'Shared Shopping', description: 'Collaborate on lists in real-time', href: '/settings/documentation/shopping#shared-shopping', category: 'Shopping' },

  // Meals
  { title: 'Meal Planning Overview', description: 'Plan meals and discover recipes', href: '/settings/documentation/meals#overview', category: 'Meal Planning' },
  { title: 'Recipe Library', description: 'Browse and save favorite recipes', href: '/settings/documentation/meals#recipes', category: 'Meal Planning' },
  { title: 'Meal Scheduling', description: 'Schedule meals for the week', href: '/settings/documentation/meals#scheduling', category: 'Meal Planning' },
  { title: 'Generate Shopping Lists', description: 'Auto-create shopping lists from meal plans', href: '/settings/documentation/meals#shopping-lists', category: 'Meal Planning' },

  // Daily Check-In
  { title: 'Daily Check-In Overview', description: 'Track emotional wellness and connect', href: '/settings/documentation/checkin#overview', category: 'Daily Check-In' },
  { title: 'Mood Tracking', description: 'Log your daily mood with emoji selector', href: '/settings/documentation/checkin#mood-tracking', category: 'Daily Check-In' },
  { title: 'Gratitude Journal', description: 'Share what you\'re grateful for', href: '/settings/documentation/checkin#gratitude', category: 'Daily Check-In' },
  { title: 'Partner Reactions', description: 'React to your partner\'s check-ins', href: '/settings/documentation/checkin#reactions', category: 'Daily Check-In' },
  { title: 'Weekly Insights', description: 'View mood trends and patterns', href: '/settings/documentation/checkin#insights', category: 'Daily Check-In' },

  // Messages (will be added)
  { title: 'Messages Overview', description: 'Communicate effectively with your partner', href: '/settings/documentation/messages#overview', category: 'Messages' },
  { title: 'Creating Conversations', description: 'Start new conversation threads', href: '/settings/documentation/messages#conversations', category: 'Messages' },
  { title: 'Sending Messages', description: 'Send text, files, and voice messages', href: '/settings/documentation/messages#sending', category: 'Messages' },
  { title: 'Message Reactions', description: 'React to messages with emojis', href: '/settings/documentation/messages#reactions', category: 'Messages' },
  { title: 'Pinned Messages', description: 'Pin important messages for easy access', href: '/settings/documentation/messages#pinned', category: 'Messages' },
  { title: 'Message Threads', description: 'Reply to specific messages', href: '/settings/documentation/messages#threads', category: 'Messages' },
  { title: 'Voice Messages', description: 'Record and send voice messages', href: '/settings/documentation/messages#voice', category: 'Messages' },
  { title: 'File Attachments', description: 'Share files and images in messages', href: '/settings/documentation/messages#attachments', category: 'Messages' },
  { title: 'Mentions & Tagging', description: 'Mention users with @ symbol', href: '/settings/documentation/messages#mentions', category: 'Messages' },
  { title: 'Search Messages', description: 'Find messages in conversation history', href: '/settings/documentation/messages#search', category: 'Messages' },
];

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search functionality
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const timeoutId = setTimeout(() => setIsTyping(false), 1000);

    const searchTerm = query.toLowerCase();
    const filtered = DOCUMENTATION_INDEX.filter(item =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.category.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limit to 8 results

    setResults(filtered);
    setIsOpen(filtered.length > 0);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setIsTyping(false);
  };

  return (
    <div ref={searchRef} className="relative w-full sm:w-64 md:w-80">
      {/* Apple-Inspired Search Input */}
      <div className="apple-search-container">
        <Search className="apple-search-icon" />
        <input
          type="search"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`apple-search-input w-full ${isTyping ? 'typing' : ''}`}
        />
        {query && (
          <button
            onClick={handleClear}
            className={`apple-search-clear ${query ? 'visible' : ''}`}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Apple-Inspired Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 apple-search-results max-h-96 overflow-y-auto z-50">
          <div className="p-2">
            {results.map((result, index) => (
              <Link
                key={index}
                href={result.href}
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                  setIsTyping(false);
                }}
                className="apple-search-result-item block p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {result.title}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      {result.description}
                    </p>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {result.category}
                      </span>
                    </div>
                  </div>
                  <span className="text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm flex-shrink-0">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Footer hint */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to navigate
            </p>
          </div>
        </div>
      )}

      {/* Apple-Inspired No Results */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 apple-search-results z-50">
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No results found for <span className="font-semibold text-gray-700 dark:text-gray-300">"{query}"</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Try searching for a feature name or topic
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
