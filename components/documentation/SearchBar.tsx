'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from 'use-debounce';
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

  // Household & Budget
  { title: 'Household Management Overview', description: 'Organize household with chore tracking, budget management, and bill organization', href: '/settings/documentation/household#understanding-household', category: 'Household & Budget' },
  { title: 'Setting Up Your First Budget', description: 'Create your household budget and expense categories', href: '/settings/documentation/household#first-budget', category: 'Household & Budget' },
  { title: 'Creating Household Chores', description: 'Set up recurring chores and assign them to family members', href: '/settings/documentation/household#creating-chores', category: 'Household & Budget' },
  { title: 'Chore Status System', description: 'Understand chore statuses: pending, in-progress, blocked, on-hold, completed', href: '/settings/documentation/household#chore-status', category: 'Household & Budget' },
  { title: 'Chore Assignment & Rotation', description: 'Assign chores to family members and set up rotation schedules', href: '/settings/documentation/household#chore-assignment', category: 'Household & Budget' },
  { title: 'Budget Analytics', description: 'Detailed budget vs actual analysis with insights', href: '/settings/documentation/household#budget-analytics', category: 'Household & Budget' },
  { title: 'Bills & Payments', description: 'Track bills with due dates and payment history', href: '/settings/documentation/household#adding-bills', category: 'Household & Budget' },
  { title: 'Expense Categories', description: 'Organize expenses like groceries, utilities, entertainment', href: '/settings/documentation/household#expense-categories', category: 'Household & Budget' },
  { title: 'Smart Home Integration', description: 'Connect with smart home devices and IoT sensors for automated tracking', href: '/settings/documentation/household#smart-home', category: 'Household & Budget' },
  { title: 'Seasonal Planning', description: 'Set up seasonal chores, budget adjustments, and holiday planning', href: '/settings/documentation/household#seasonal-planning', category: 'Household & Budget' },
  { title: 'Emergency Fund Tracking', description: 'Monitor emergency savings and unexpected expense handling', href: '/settings/documentation/household#emergency-fund', category: 'Household & Budget' },
  { title: 'Multi-Property Management', description: 'Manage chores and budgets across multiple properties or rental units', href: '/settings/documentation/household#multi-property', category: 'Household & Budget' },
  { title: 'Handling Irregular Income', description: 'Budget strategies for freelancers and variable income households', href: '/settings/documentation/household#irregular-income', category: 'Household & Budget' },
  { title: 'Motivating Family Members', description: 'Tips for encouraging chore completion and budget compliance', href: '/settings/documentation/household#family-motivation', category: 'Household & Budget' },
  { title: 'Overdue Chores Management', description: 'Handle chores that don\'t get done on time with escalation rules', href: '/settings/documentation/household#overdue-chores', category: 'Household & Budget' },
  { title: 'Individual Budget Limits', description: 'Set different budget limits for different family members', href: '/settings/documentation/household#individual-budgets', category: 'Household & Budget' },
  { title: 'Over Budget Handling', description: 'What happens when you exceed budget limits and how to adjust', href: '/settings/documentation/household#over-budget', category: 'Household & Budget' },
  { title: 'Chore Rotation System', description: 'Set up automatic rotation of chores between family members', href: '/settings/documentation/household#chore-rotation', category: 'Household & Budget' },
  { title: 'Bank Account Import', description: 'Import expenses from bank accounts and CSV files', href: '/settings/documentation/household#bank-import', category: 'Household & Budget' },
  { title: 'Seasonal Expenses', description: 'Handle seasonal or irregular expenses in your budget planning', href: '/settings/documentation/household#seasonal-expenses', category: 'Household & Budget' },
  { title: 'Chores vs Tasks', description: 'Understanding the difference between chores and tasks', href: '/settings/documentation/household#chores-vs-tasks', category: 'Household & Budget' },
  { title: 'Automatic Bill Payments', description: 'Set up automatic bill payments tracking and expense creation', href: '/settings/documentation/household#auto-bills', category: 'Household & Budget' },
  { title: 'Kids Chore Motivation', description: 'Gamification features and reward systems for children', href: '/settings/documentation/household#kids-motivation', category: 'Household & Budget' },
  { title: 'Household Analytics', description: 'Completion rates, spending trends, and performance analytics', href: '/settings/documentation/household#household-analytics', category: 'Household & Budget' },

  // Expenses & Receipt Scanning
  { title: 'Expense Tracking Overview', description: 'Master AI-powered expense tracking with receipt scanning and analytics', href: '/settings/documentation/expenses#understanding-expenses', category: 'Expenses & Receipt Scanning' },
  { title: 'Camera Receipt Scanning', description: 'Take photos of receipts for instant AI processing', href: '/settings/documentation/expenses#camera-scanning', category: 'Expenses & Receipt Scanning' },
  { title: 'AI Data Extraction', description: 'How AI extracts merchant, amount, date, and items from receipts', href: '/settings/documentation/expenses#ai-extraction', category: 'Expenses & Receipt Scanning' },
  { title: 'Receipt Correction', description: 'Review and correct AI-extracted data before saving', href: '/settings/documentation/expenses#receipt-correction', category: 'Expenses & Receipt Scanning' },
  { title: 'Expense Analytics Dashboard', description: 'View comprehensive spending analytics and trends', href: '/settings/documentation/expenses#spending-analytics', category: 'Expenses & Receipt Scanning' },
  { title: 'Category Breakdown', description: 'Analyze spending by category with visual charts', href: '/settings/documentation/expenses#category-breakdown', category: 'Expenses & Receipt Scanning' },
  { title: 'Bulk Expense Operations', description: 'Edit, delete, or categorize multiple expenses at once', href: '/settings/documentation/expenses#bulk-operations', category: 'Expenses & Receipt Scanning' },
  { title: 'Expense Export', description: 'Export expense data for tax purposes or external accounting', href: '/settings/documentation/expenses#expense-export', category: 'Expenses & Receipt Scanning' },

  // Projects & Budgets
  { title: 'Project Management Overview', description: 'Master project management with comprehensive budget tracking and vendor management', href: '/settings/documentation/projects#understanding-projects', category: 'Projects & Budgets' },
  { title: 'Creating Your First Project', description: 'Set up a project with budget, timeline, and team members', href: '/settings/documentation/projects#first-project', category: 'Projects & Budgets' },
  { title: 'Project Status Tracking', description: 'Use project statuses: planning, in-progress, completed, on-hold', href: '/settings/documentation/projects#project-status', category: 'Projects & Budgets' },
  { title: 'Budget vs Actual Analysis', description: 'Compare planned budgets with actual spending for insights', href: '/settings/documentation/projects#budget-analysis', category: 'Projects & Budgets' },
  { title: 'Vendor Database', description: 'Maintain a database of contractors, suppliers, and service providers', href: '/settings/documentation/projects#vendor-database', category: 'Projects & Budgets' },
  { title: 'Project Templates', description: 'Create reusable project templates for common project types', href: '/settings/documentation/projects#project-templates', category: 'Projects & Budgets' },
  { title: 'Financial Reports', description: 'Generate detailed financial reports for projects and portfolios', href: '/settings/documentation/projects#financial-reports', category: 'Projects & Budgets' },
  { title: 'Receipt Scanning Integration', description: 'Link receipt scanning directly to project expense tracking', href: '/settings/documentation/projects#receipt-integration', category: 'Projects & Budgets' },

  // Recipe Library & Discovery
  { title: 'Recipe Library Overview', description: 'Discover, import, and organize recipes with AI-powered tools and external integrations', href: '/settings/documentation/recipes#understanding-recipes', category: 'Recipe Library & Discovery' },
  { title: 'AI Recipe Import', description: 'Import recipes from any cooking website using AI technology', href: '/settings/documentation/recipes#url-import', category: 'Recipe Library & Discovery' },
  { title: 'External API Recipe Search', description: 'Search recipes from Spoonacular, Tasty, and API Ninjas', href: '/settings/documentation/recipes#external-apis', category: 'Recipe Library & Discovery' },
  { title: 'Google Gemini Integration', description: 'How AI extracts ingredients, instructions, and metadata from websites', href: '/settings/documentation/recipes#gemini-integration', category: 'Recipe Library & Discovery' },
  { title: 'Recipe Organization', description: 'Categorize recipes with tags, cuisines, and custom collections', href: '/settings/documentation/recipes#recipe-organization', category: 'Recipe Library & Discovery' },
  { title: 'Recipe Rating & Reviews', description: 'Rate recipes and add personal notes and modifications', href: '/settings/documentation/recipes#recipe-rating', category: 'Recipe Library & Discovery' },
  { title: 'Recipe Collections', description: 'Create themed collections like "Quick Weeknight Dinners"', href: '/settings/documentation/recipes#recipe-collections', category: 'Recipe Library & Discovery' },
  { title: 'Recipe to Meal Conversion', description: 'Turn saved recipes into planned meals for your calendar', href: '/settings/documentation/recipes#recipe-to-meal', category: 'Recipe Library & Discovery' },
];

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 200);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search functionality - using debounced query to reduce re-renders
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const timeoutId = setTimeout(() => setIsTyping(false), 1000);

    const searchTerm = debouncedQuery.toLowerCase();
    const filtered = DOCUMENTATION_INDEX.filter(item =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.category.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limit to 8 results

    setResults(filtered);
    setIsOpen(filtered.length > 0);

    return () => clearTimeout(timeoutId);
  }, [debouncedQuery]);

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
            className={`btn-touch apple-search-clear ${query ? 'visible' : ''} active:scale-90 hover-lift shimmer-purple active-press`}
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
                className="btn-touch apple-search-result-item block p-3 active:scale-[0.98] hover-lift shimmer-purple active-press"
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
