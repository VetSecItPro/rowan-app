'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft,
  CheckSquare,
  Play,
  Plus,
  Clock,
  Users,
  Grid3x3,
  MessageSquare,
  BarChart3,
  Lightbulb,
  Home,
  ListChecks,
  Calendar,
  Bell,
  Tag,
  GripVertical,
  Repeat,
  FileText,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react';

interface GuideSection {
  title: string;
  icon: any;
  color: string;
  articles: {
    title: string;
    description: string;
    readTime: string;
    href: string;
  }[];
}

const guideSections: GuideSection[] = [
  {
    title: 'Getting Started',
    icon: Play,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Introduction to Tasks & Chores',
        description: 'Learn how Rowan helps you organize daily tasks and household chores with smart features',
        readTime: '4 min read',
        href: '#intro',
      },
      {
        title: 'Tasks vs Chores - What\'s the Difference?',
        description: 'Understand when to use tasks for projects and chores for recurring household duties',
        readTime: '3 min read',
        href: '#tasks-vs-chores',
      },
      {
        title: 'Creating Your First Task',
        description: 'Quick guide to creating tasks with titles, descriptions, priorities, and due dates',
        readTime: '4 min read',
        href: '#first-task',
      },
      {
        title: 'Creating Your First Chore',
        description: 'Set up household chores with rotation schedules and recurring patterns',
        readTime: '4 min read',
        href: '#first-chore',
      },
      {
        title: 'Understanding Status Indicators',
        description: 'How colored checkboxes show task status: Pending (red), In Progress (amber), Completed (green)',
        readTime: '3 min read',
        href: '#status-indicators',
      },
    ],
  },
  {
    title: 'Core Task Management',
    icon: CheckSquare,
    color: 'from-emerald-500 to-emerald-600',
    articles: [
      {
        title: 'Creating & Editing Tasks',
        description: 'Add tasks with detailed information including priority, due dates, and descriptions',
        readTime: '5 min read',
        href: '#create-edit-tasks',
      },
      {
        title: 'Status Management with Colored Checkboxes',
        description: 'Click checkboxes to cycle: Pending → In Progress → Completed → Pending',
        readTime: '3 min read',
        href: '#status-management',
      },
      {
        title: 'Setting Priorities',
        description: 'Use Urgent, High, Medium, and Low priorities with visual icons to organize workload',
        readTime: '3 min read',
        href: '#priorities',
      },
      {
        title: 'Due Dates & Overdue Tracking',
        description: 'Set deadlines and get visual warnings for overdue tasks',
        readTime: '4 min read',
        href: '#due-dates',
      },
      {
        title: 'Task Categories & Tags',
        description: 'Organize tasks with custom color-coded categories for better visual organization',
        readTime: '4 min read',
        href: '#categories',
      },
      {
        title: 'Drag & Drop Reordering',
        description: 'Visually reorganize tasks by dragging them into your preferred order',
        readTime: '3 min read',
        href: '#drag-drop',
      },
      {
        title: 'Deleting Tasks',
        description: 'Remove completed or unwanted tasks with confirmation prompts',
        readTime: '2 min read',
        href: '#delete-tasks',
      },
    ],
  },
  {
    title: 'Task Details & Advanced Features',
    icon: Zap,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Accessing Task Details',
        description: 'Open the full task details panel via three-dot menu → "View Details"',
        readTime: '3 min read',
        href: '#access-details',
      },
      {
        title: 'Quick Actions',
        description: 'Fast access to Complete, Snooze, Assign, Repeat, Comment, and Attach actions',
        readTime: '4 min read',
        href: '#quick-actions',
      },
      {
        title: 'Time Tracking',
        description: 'Track time spent on tasks with start/stop timer and manual time entry',
        readTime: '5 min read',
        href: '#time-tracking',
      },
      {
        title: 'Subtasks & Breakdown',
        description: 'Break complex tasks into smaller subtasks with individual completion tracking',
        readTime: '5 min read',
        href: '#subtasks',
      },
      {
        title: 'Comments & Collaboration',
        description: 'Add comments to tasks and react with emojis (👍❤️) for team communication',
        readTime: '4 min read',
        href: '#comments',
      },
      {
        title: 'Calendar Sync',
        description: 'Toggle calendar sync to show tasks in your calendar with automatic updates',
        readTime: '4 min read',
        href: '#calendar-sync',
      },
    ],
  },
  {
    title: 'Chore Management & Rotation',
    icon: Home,
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'Creating Household Chores',
        description: 'Set up recurring household duties with estimated time and difficulty levels',
        readTime: '4 min read',
        href: '#create-chores',
      },
      {
        title: 'Chore Rotation Setup',
        description: 'Automate chore assignment rotation in Round Robin or Random order',
        readTime: '6 min read',
        href: '#chore-rotation',
      },
      {
        title: 'Round Robin Rotation',
        description: 'Assign chores in sequential order to distribute work fairly among household members',
        readTime: '4 min read',
        href: '#round-robin',
      },
      {
        title: 'Random Assignment',
        description: 'Let the system randomly assign chores to keep things interesting',
        readTime: '3 min read',
        href: '#random-assignment',
      },
      {
        title: 'Rotation Intervals',
        description: 'Set how often chores rotate: daily, weekly, biweekly, or monthly',
        readTime: '4 min read',
        href: '#rotation-intervals',
      },
      {
        title: 'Chore Completion Tracking',
        description: 'Mark chores as done and track completion history over time',
        readTime: '3 min read',
        href: '#chore-completion',
      },
    ],
  },
  {
    title: 'Dashboard & Analytics',
    icon: BarChart3,
    color: 'from-indigo-500 to-indigo-600',
    articles: [
      {
        title: 'Understanding Stats Cards',
        description: 'Dashboard cards show Pending, In Progress, Completed, and Total counts with visual indicators',
        readTime: '3 min read',
        href: '#stats-cards',
      },
      {
        title: 'Pending Tasks Indicator',
        description: 'Orange "Needs attention" badge shows tasks waiting to be started',
        readTime: '2 min read',
        href: '#pending-indicator',
      },
      {
        title: 'In Progress Tracking',
        description: 'Blue "Active" badge with trending arrow shows currently worked-on tasks',
        readTime: '2 min read',
        href: '#progress-tracking',
      },
      {
        title: 'Completion Percentage',
        description: 'Green completion card shows percentage of finished tasks (e.g., "67%")',
        readTime: '3 min read',
        href: '#completion-percentage',
      },
      {
        title: 'Monthly Overview',
        description: 'See current month badge and track task counts over time',
        readTime: '3 min read',
        href: '#monthly-overview',
      },
    ],
  },
  {
    title: 'Search & Filtering',
    icon: Target,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Searching Tasks & Chores',
        description: 'Use the search bar to find items by title or description instantly',
        readTime: '3 min read',
        href: '#search',
      },
      {
        title: 'Status Filtering',
        description: 'Filter view by All, Pending, In Progress, or Completed with segmented controls',
        readTime: '3 min read',
        href: '#status-filter',
      },
      {
        title: 'Task vs Chore Tabs',
        description: 'Switch between Tasks and Chores tabs to focus on specific item types',
        readTime: '2 min read',
        href: '#tabs',
      },
      {
        title: 'Combined Task Count',
        description: 'See total count of filtered items displayed in the header',
        readTime: '2 min read',
        href: '#item-count',
      },
    ],
  },
  {
    title: 'Integration with Other Features',
    icon: Grid3x3,
    color: 'from-teal-500 to-teal-600',
    articles: [
      {
        title: 'Shopping List Integration',
        description: 'Link tasks to shopping lists and see item counts directly on task cards',
        readTime: '4 min read',
        href: '#shopping-integration',
      },
      {
        title: 'Calendar Integration',
        description: 'View tasks in calendar and automatically sync due dates with calendar events',
        readTime: '5 min read',
        href: '#calendar-integration',
      },
      {
        title: 'Meal Plan Task Automation',
        description: 'Auto-create cooking tasks from meal plans that complete 2 hours after meal time',
        readTime: '4 min read',
        href: '#meal-plan-tasks',
      },
      {
        title: 'Recipe to Shopping to Task Chain',
        description: 'Seamless flow from recipe selection to shopping list creation to task completion',
        readTime: '5 min read',
        href: '#recipe-chain',
      },
    ],
  },
  {
    title: 'Collaboration & Teamwork',
    icon: Users,
    color: 'from-rose-500 to-rose-600',
    articles: [
      {
        title: 'Real-Time Updates',
        description: 'See changes instantly as household members update tasks across all devices',
        readTime: '3 min read',
        href: '#realtime',
      },
      {
        title: 'Assigning Tasks',
        description: 'Assign tasks to specific household members with clear ownership',
        readTime: '4 min read',
        href: '#assign-tasks',
      },
      {
        title: 'Comments & Communication',
        description: 'Use comments to discuss tasks and react with emojis for quick feedback',
        readTime: '4 min read',
        href: '#communication',
      },
      {
        title: 'Chore Rotation Among Members',
        description: 'Automatically rotate chores among all household members fairly',
        readTime: '5 min read',
        href: '#member-rotation',
      },
    ],
  },
  {
    title: 'Mobile & Accessibility',
    icon: TrendingUp,
    color: 'from-cyan-500 to-cyan-600',
    articles: [
      {
        title: 'Mobile-Friendly Interface',
        description: 'Fully responsive design works seamlessly on phones and tablets',
        readTime: '3 min read',
        href: '#mobile',
      },
      {
        title: 'Touch Gestures for Drag & Drop',
        description: 'Use touch gestures to reorder tasks on mobile devices',
        readTime: '3 min read',
        href: '#touch-gestures',
      },
      {
        title: 'Dark Mode Support',
        description: 'Automatic dark mode for comfortable viewing in any lighting condition',
        readTime: '2 min read',
        href: '#dark-mode',
      },
      {
        title: 'Keyboard Shortcuts',
        description: 'Navigate and manage tasks efficiently with keyboard commands',
        readTime: '4 min read',
        href: '#keyboard-shortcuts',
      },
      {
        title: 'Screen Reader Support',
        description: 'Full accessibility with ARIA labels and semantic HTML',
        readTime: '3 min read',
        href: '#accessibility',
      },
    ],
  },
  {
    title: 'Tips & Best Practices',
    icon: Lightbulb,
    color: 'from-yellow-500 to-yellow-600',
    articles: [
      {
        title: 'Organizing Your Task List',
        description: 'Best practices for keeping your task list manageable and actionable',
        readTime: '5 min read',
        href: '#organize-tasks',
      },
      {
        title: 'Using Priorities Effectively',
        description: 'How to assign priorities to focus on what matters most',
        readTime: '4 min read',
        href: '#effective-priorities',
      },
      {
        title: 'Breaking Down Large Tasks',
        description: 'Use subtasks to make complex projects more manageable',
        readTime: '5 min read',
        href: '#break-down-tasks',
      },
      {
        title: 'Daily Task Review Routine',
        description: 'Establish a daily routine for reviewing and updating your task list',
        readTime: '4 min read',
        href: '#daily-routine',
      },
      {
        title: 'Household Chore Distribution',
        description: 'Tips for fair and effective chore distribution among household members',
        readTime: '5 min read',
        href: '#chore-distribution',
      },
      {
        title: 'Time Tracking for Productivity',
        description: 'Use time tracking to understand how long tasks actually take',
        readTime: '4 min read',
        href: '#time-tracking-tips',
      },
    ],
  },
];

export default function TasksChoresDocumentationPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <CheckSquare className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Tasks & Chores Guide
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Complete guide to managing daily tasks and household chores
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Welcome to Task & Chore Management
                </h3>
                <p className="text-blue-800 dark:text-blue-200 mb-3">
                  Rowan helps you organize your daily life with powerful task management features:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-start gap-2">
                    <CheckSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Tasks</strong> - For projects, errands, and one-time activities</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Home className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Chores</strong> - For recurring household duties with rotation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Time tracking</strong> - See how long tasks actually take</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Drag & drop</strong> - Visual reordering to match priorities</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ListChecks className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Subtasks</strong> - Break down complex projects</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Comments</strong> - Collaborate with emoji reactions</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BarChart3 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Analytics</strong> - Visual stats with completion percentages</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Calendar sync</strong> - Two-way integration with calendar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guide Sections */}
        <div className="space-y-8">
          {guideSections.map((section, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className={`bg-gradient-to-r ${section.color} p-6`}>
                <div className="flex items-center gap-3">
                  <section.icon className="w-8 h-8 text-white" />
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.articles.map((article, articleIndex) => (
                    <a
                      key={articleIndex}
                      href={article.href}
                      className="block p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {article.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Read more →
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Access Section */}
        <div className="mt-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="mb-6 text-blue-100">
            Start managing your tasks and chores efficiently:
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/tasks"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
            >
              <CheckSquare className="w-5 h-5" />
              Go to Tasks & Chores
            </Link>
            <Link
              href="/calendar"
              className="px-6 py-3 bg-blue-400 text-white rounded-lg font-semibold hover:bg-blue-300 transition-colors inline-flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              View in Calendar
            </Link>
          </div>
        </div>

        {/* Feature Count Badge */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="text-gray-900 dark:text-white font-semibold">
              60+ Help Articles
            </span>
            <span className="text-gray-500 dark:text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-400">
              10 Feature Categories
            </span>
            <span className="text-gray-500 dark:text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-400">
              Beginner to Advanced
            </span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
