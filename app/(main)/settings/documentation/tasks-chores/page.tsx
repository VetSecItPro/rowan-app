'use client';

import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-blue-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <CheckSquare className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Tasks & Chores Guide
              </h1>
              <p className="text-gray-400 mt-1">
                Complete guide to managing daily tasks and household chores
              </p>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-100 mb-2">
                  Welcome to Task & Chore Management
                </h3>
                <p className="text-blue-200 mb-3">
                  Rowan helps you organize your daily life with powerful task management features:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-blue-300">
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
            <div key={index} className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
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
                      className="block p-4 bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors border border-gray-700"
                    >
                      <h3 className="font-semibold text-white mb-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-3">
                        {article.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime}
                        </span>
                        <span className="text-xs text-blue-400 font-medium">
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

        {/* Detailed Content Sections */}
        <div className="mt-12 bg-gray-800 rounded-2xl shadow-lg p-8 space-y-12 border border-gray-700">
          {/* GETTING STARTED */}
          <section id="intro" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Play className="w-8 h-8 text-blue-500" />
              Introduction to Tasks & Chores
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Rowan's Tasks & Chores feature is your household command center for managing daily life. Whether it's one-time errands or recurring household duties, we've built powerful yet simple tools to keep everyone organized and on track.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Key Features at a Glance</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Tasks for Projects & Errands:</strong> One-time activities like "Pick up dry cleaning" or "Finish quarterly report"</li>
                <li><strong>Chores for Recurring Duties:</strong> Household tasks that repeat like "Take out trash" or "Clean bathrooms"</li>
                <li><strong>Smart Status System:</strong> Visual colored checkboxes show Pending (red), In Progress (amber), and Completed (green)</li>
                <li><strong>Priority Management:</strong> Urgent, High, Medium, Low priorities with visual icons</li>
                <li><strong>Automatic Chore Rotation:</strong> Fair distribution of household duties among family members</li>
                <li><strong>Real-Time Collaboration:</strong> Everyone sees updates instantly when tasks change</li>
                <li><strong>Time Tracking:</strong> Know how long tasks actually take</li>
                <li><strong>Subtasks & Breakdown:</strong> Split complex projects into manageable pieces</li>
                <li><strong>Calendar Integration:</strong> See tasks in your calendar automatically</li>
                <li><strong>Comments & Reactions:</strong> Communicate with emoji reactions and threaded comments</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="tasks-vs-chores" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Tasks vs Chores - What's the Difference?</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Understanding when to use Tasks versus Chores helps keep your household organized efficiently:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckSquare className="w-8 h-8 text-blue-600" />
                    <h3 className="text-2xl font-bold text-white">Tasks</h3>
                  </div>
                  <p className="text-gray-300 mb-4"><strong>Use for one-time activities and projects</strong></p>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✓ Doctor appointments</li>
                    <li>✓ Shopping trips</li>
                    <li>✓ Project deliverables</li>
                    <li>✓ Home improvement projects</li>
                    <li>✓ Event planning</li>
                    <li>✓ Bills to pay</li>
                    <li>✓ Errands to run</li>
                  </ul>
                  <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400"><strong>Example:</strong> "Buy birthday gift for Mom" - happens once, has a deadline</p>
                  </div>
                </div>

                <div className="p-6 bg-amber-900/20 rounded-xl border border-amber-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Home className="w-8 h-8 text-amber-600" />
                    <h3 className="text-2xl font-bold text-white">Chores</h3>
                  </div>
                  <p className="text-gray-300 mb-4"><strong>Use for recurring household duties</strong></p>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✓ Take out trash (weekly)</li>
                    <li>✓ Clean bathrooms (bi-weekly)</li>
                    <li>✓ Mow lawn (weekly)</li>
                    <li>✓ Vacuum floors (weekly)</li>
                    <li>✓ Laundry (multiple times/week)</li>
                    <li>✓ Load/unload dishwasher (daily)</li>
                    <li>✓ Feed pets (daily)</li>
                  </ul>
                  <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400"><strong>Example:</strong> "Take out trash" - repeats every week, rotates between family members</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-300 text-sm">
                  <strong>💡 Pro Tip:</strong> Chores support automatic rotation, so you can set up "Clean kitchen" to rotate between household members weekly. Tasks are great for one-off items that need specific due dates!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="first-task" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Creating Your First Task</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Let's walk through creating a task step by step:
              </p>
              <ol className="space-y-4 text-gray-300">
                <li>
                  <strong>Navigate to Tasks:</strong> Click "Tasks & Chores" in your main navigation menu
                </li>
                <li>
                  <strong>Click "Create Task":</strong> Look for the "+ Create Task" button at the top
                </li>
                <li>
                  <strong>Enter Task Title:</strong> Give it a clear, actionable name
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>Good: "Schedule dentist appointment for next month"</li>
                    <li>Good: "Buy groceries for dinner party"</li>
                    <li>Avoid: "dentist" (too vague)</li>
                  </ul>
                </li>
                <li>
                  <strong>Add Description (Optional):</strong> Include helpful details like:
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>What exactly needs to be done</li>
                    <li>Any important notes or context</li>
                    <li>Links to related information</li>
                  </ul>
                </li>
                <li>
                  <strong>Set Priority:</strong> Choose from:
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>🔴 <strong>Urgent:</strong> Drop everything, do this now</li>
                    <li>🟠 <strong>High:</strong> Important, schedule time today</li>
                    <li>🟡 <strong>Medium:</strong> Should be done this week</li>
                    <li>🟢 <strong>Low:</strong> Nice to have, no rush</li>
                  </ul>
                </li>
                <li>
                  <strong>Set Due Date (Optional):</strong> Click the calendar icon to pick a deadline
                </li>
                <li>
                  <strong>Choose Category (Optional):</strong> Tag with a color-coded category for organization
                </li>
                <li>
                  <strong>Assign to Someone (Optional):</strong> Pick who's responsible from your household members
                </li>
                <li>
                  <strong>Click "Create Task":</strong> Your task is now live and visible to everyone!
                </li>
              </ol>

              <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 mt-6">
                <p className="text-emerald-300 text-sm">
                  <strong>✨ Power Tip:</strong> After creating a task, you can add subtasks, comments, attachments, and even link it to your calendar. We'll cover these advanced features below!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="first-chore" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Creating Your First Chore</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Chores are designed for recurring household duties that need to be done regularly:
              </p>
              <ol className="space-y-4 text-gray-300">
                <li>
                  <strong>Navigate to Tasks Page:</strong> Click "Tasks & Chores" in your navigation
                </li>
                <li>
                  <strong>Switch to Chores Tab:</strong> Click the "Chores" tab at the top
                </li>
                <li>
                  <strong>Click "Create Chore":</strong> The button changes when you're on the Chores tab
                </li>
                <li>
                  <strong>Enter Chore Name:</strong> Be specific about what needs doing
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>"Take out trash and recycling"</li>
                    <li>"Clean all bathrooms"</li>
                    <li>"Vacuum entire house"</li>
                    <li>"Mow front and back lawn"</li>
                  </ul>
                </li>
                <li>
                  <strong>Set Estimated Time:</strong> How long does this usually take? (helps with scheduling)
                </li>
                <li>
                  <strong>Choose Difficulty:</strong> Easy, Medium, or Hard (helps with fair distribution)
                </li>
                <li>
                  <strong>Configure Rotation (The Magic Part!):</strong>
                  <ul className="mt-2 space-y-2 ml-4 text-sm">
                    <li><strong>Rotation Type:</strong>
                      <ul className="ml-4 mt-1">
                        <li>Round Robin - Assign in order (Alex → Jamie → Alex → Jamie...)</li>
                        <li>Random - Let the system pick randomly each time</li>
                      </ul>
                    </li>
                    <li><strong>Rotation Interval:</strong>
                      <ul className="ml-4 mt-1">
                        <li>Daily - New person every day</li>
                        <li>Weekly - New person every week</li>
                        <li>Bi-weekly - New person every 2 weeks</li>
                        <li>Monthly - New person every month</li>
                      </ul>
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Click "Create Chore":</strong> The system automatically assigns the first person!
                </li>
              </ol>

              <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mt-6">
                <p className="text-amber-300 text-sm">
                  <strong>🏡 Household Tip:</strong> Set up all your recurring chores once, and Rowan handles the rotation automatically. The system runs at midnight each rotation period, so everyone wakes up knowing whose turn it is!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="status-indicators" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Understanding Status Indicators</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Rowan uses a smart color-coded checkbox system that shows task status at a glance:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                <div className="p-6 bg-red-900/20 rounded-xl border-2 border-red-800">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 rounded border-2 border-red-500 bg-red-900/40"></div>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-2">Pending</h3>
                  <p className="text-center text-gray-300 text-sm">
                    <strong className="text-red-400">Red checkbox</strong><br/>
                    Not started yet, waiting for someone to begin
                  </p>
                </div>

                <div className="p-6 bg-amber-900/20 rounded-xl border-2 border-amber-800">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 rounded border-2 border-amber-500 bg-amber-900/40 flex items-center justify-center">
                      <div className="w-6 h-1 bg-amber-500"></div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-2">In Progress</h3>
                  <p className="text-center text-gray-300 text-sm">
                    <strong className="text-amber-400">Amber checkbox</strong><br/>
                    Currently being worked on, actively in progress
                  </p>
                </div>

                <div className="p-6 bg-green-900/20 rounded-xl border-2 border-green-800">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 rounded border-2 border-green-500 bg-green-900/40 flex items-center justify-center">
                      <CheckSquare className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white text-center mb-2">Completed</h3>
                  <p className="text-center text-gray-300 text-sm">
                    <strong className="text-green-400">Green checkmark</strong><br/>
                    Finished! Task is done and checked off
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How to Change Status</h3>
              <p className="text-gray-300 mb-3">
                Simply <strong>click the checkbox</strong> to cycle through statuses:
              </p>
              <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg mb-4">
                <span className="text-gray-300">Pending (red)</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">In Progress (amber)</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">Completed (green)</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">Pending (red)</span>
              </div>

              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-300 text-sm">
                  <strong>🎯 Quick Tip:</strong> The color-coding means you can scan your task list instantly and see what needs attention (red), what's being worked on (amber), and what's done (green). No reading required!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* CORE TASK MANAGEMENT */}
          <section id="create-edit-tasks" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-emerald-500" />
              Creating & Editing Tasks
            </h2>
            <div className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold text-white mb-3">Creating New Tasks</h3>
              <p className="text-gray-300 mb-4">
                Tasks can be created from multiple places in Rowan:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Tasks Page:</strong> The main "+ Create Task" button</li>
                <li><strong>Calendar:</strong> Click any date to create a task with that due date</li>
                <li><strong>Shopping Lists:</strong> Convert a shopping trip into a task</li>
                <li><strong>Meal Plans:</strong> Automatically create cooking tasks from recipes</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Editing Existing Tasks</h3>
              <p className="text-gray-300 mb-3">
                There are two ways to edit tasks:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li>
                  <strong>Quick Edit from Card:</strong>
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>Click the three-dot menu (⋮) on any task card</li>
                    <li>Select "Edit"</li>
                    <li>Make your changes in the modal</li>
                    <li>Click "Save Changes"</li>
                  </ul>
                </li>
                <li>
                  <strong>Full Edit from Details Panel:</strong>
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>Click "View Details" from the three-dot menu</li>
                    <li>Click "Edit Task" button in the details panel</li>
                    <li>Access all fields including advanced options</li>
                    <li>Save when done</li>
                  </ul>
                </li>
              </ol>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">What You Can Edit</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Basic Fields</h4>
                  <ul className="space-y-1 text-sm text-gray-300">
                    <li>• Title</li>
                    <li>• Description</li>
                    <li>• Status</li>
                    <li>• Priority</li>
                    <li>• Due date</li>
                    <li>• Category/tags</li>
                  </ul>
                </div>
                <div className="p-4 bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Advanced Options</h4>
                  <ul className="space-y-1 text-sm text-gray-300">
                    <li>• Assigned person</li>
                    <li>• Recurring pattern</li>
                    <li>• Calendar sync</li>
                    <li>• Estimated time</li>
                  </ul>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="status-management" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Status Management with Colored Checkboxes</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                The colored checkbox system is designed for speed and clarity. Here's everything you can do:
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Single Task Status Change</h3>
              <ol className="space-y-2 text-gray-300">
                <li><strong>Click once:</strong> Pending → In Progress (red → amber)</li>
                <li><strong>Click again:</strong> In Progress → Completed (amber → green)</li>
                <li><strong>Click again:</strong> Completed → Pending (green → red, to reopen)</li>
              </ol>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Status Filtering</h3>
              <p className="text-gray-300 mb-3">
                Use the filter bar to view tasks by status:
              </p>
              <div className="flex flex-wrap gap-3 my-4">
                <span className="px-4 py-2 bg-gray-800 rounded-lg text-gray-300 text-sm font-medium">
                  All Tasks
                </span>
                <span className="px-4 py-2 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm font-medium">
                  Pending Only
                </span>
                <span className="px-4 py-2 bg-amber-900/20 border border-amber-800 rounded-lg text-amber-300 text-sm font-medium">
                  In Progress Only
                </span>
                <span className="px-4 py-2 bg-green-900/20 border border-green-800 rounded-lg text-green-300 text-sm font-medium">
                  Completed Only
                </span>
              </div>

              <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 mt-6">
                <p className="text-emerald-300 text-sm">
                  <strong>⚡ Power User Tip:</strong> Start your day by filtering to "Pending" tasks to see what needs attention. Move important items to "In Progress" so your household knows you're working on them!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="priorities" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Setting Priorities</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Priorities help you and your household focus on what matters most. Rowan uses a four-tier system with visual icons:
              </p>

              <div className="space-y-4">
                <div className="p-5 bg-red-900/20 rounded-xl border-l-4 border-red-500">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🔴</span>
                    <h3 className="text-xl font-bold text-red-300">Urgent Priority</h3>
                  </div>
                  <p className="text-gray-300 mb-2">
                    <strong>When to use:</strong> Critical tasks that need immediate attention, emergencies, or time-sensitive deadlines.
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Examples:</strong> "Car registration expires today", "Fix broken water heater", "Submit tax return by midnight"
                  </p>
                </div>

                <div className="p-5 bg-orange-900/20 rounded-xl border-l-4 border-orange-500">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🟠</span>
                    <h3 className="text-xl font-bold text-orange-300">High Priority</h3>
                  </div>
                  <p className="text-gray-300 mb-2">
                    <strong>When to use:</strong> Important tasks that should be done soon, significant commitments, or tasks blocking others.
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Examples:</strong> "Buy groceries for dinner tonight", "Prepare for tomorrow's presentation", "Schedule doctor appointment"
                  </p>
                </div>

                <div className="p-5 bg-yellow-900/20 rounded-xl border-l-4 border-yellow-500">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🟡</span>
                    <h3 className="text-xl font-bold text-yellow-300">Medium Priority</h3>
                  </div>
                  <p className="text-gray-300 mb-2">
                    <strong>When to use:</strong> Regular tasks that should be done this week, routine errands, or nice-to-have items.
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Examples:</strong> "Clean out garage", "Call electrician for estimate", "Buy new running shoes"
                  </p>
                </div>

                <div className="p-5 bg-green-900/20 rounded-xl border-l-4 border-green-500">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🟢</span>
                    <h3 className="text-xl font-bold text-green-300">Low Priority</h3>
                  </div>
                  <p className="text-gray-300 mb-2">
                    <strong>When to use:</strong> Tasks that can wait, ideas for someday, or things to do when you have extra time.
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>Examples:</strong> "Organize photo albums", "Research new vacuum cleaners", "Paint accent wall in bedroom"
                  </p>
                </div>
              </div>

              <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4 mt-6">
                <p className="text-indigo-300 text-sm">
                  <strong>🎯 Priority Strategy:</strong> Don't make everything urgent! Reserve urgent for true emergencies. Most tasks should be High or Medium. This keeps your urgent items visible and actionable when they really matter.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="due-dates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Due Dates & Overdue Tracking</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Due dates help keep tasks on track with automatic visual warnings for overdue items.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Setting Due Dates</h3>
              <ol className="space-y-2 text-gray-300">
                <li>When creating or editing a task, click the calendar icon</li>
                <li>Pick the date when the task should be completed</li>
                <li>Optionally set a specific time (great for appointments)</li>
                <li>The due date appears on the task card</li>
              </ol>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Visual Indicators</h3>
              <div className="space-y-3 my-4">
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <p className="text-gray-300">
                    <strong className="text-blue-300">📅 Future Due Date:</strong> Shows as regular text with calendar icon
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Example: "Due Jun 15, 2025"
                  </p>
                </div>

                <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-800">
                  <p className="text-gray-300">
                    <strong className="text-yellow-300">⚠️ Due Soon (Today):</strong> Highlighted in amber/yellow
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Example: "Due Today" - time to get moving!
                  </p>
                </div>

                <div className="p-4 bg-red-900/20 rounded-lg border border-red-800">
                  <p className="text-gray-300">
                    <strong className="text-red-300">🚨 Overdue:</strong> Red badge with days overdue count
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Example: "Overdue by 3 days" - needs immediate attention!
                  </p>
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mt-6">
                <p className="text-red-300 text-sm">
                  <strong>⏰ Deadline Tip:</strong> Rowan automatically sorts overdue tasks to the top of your list. Start each day by checking overdue items and either completing them or updating their due dates if priorities have changed!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="categories" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Task Categories & Tags</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Categories help you organize tasks visually with color-coded tags. Create custom categories that match how your household thinks about tasks.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Popular Category Examples</h3>
              <div className="grid stats-grid-mobile gap-3 sm:gap-4 my-4">
                <div className="p-3 bg-blue-900/30 rounded-lg text-center">
                  <span className="text-blue-300 font-semibold">🏠 Home</span>
                </div>
                <div className="p-3 bg-green-900/30 rounded-lg text-center">
                  <span className="text-green-300 font-semibold">💼 Work</span>
                </div>
                <div className="p-3 bg-purple-900/30 rounded-lg text-center">
                  <span className="text-purple-300 font-semibold">🛒 Errands</span>
                </div>
                <div className="p-3 bg-pink-900/30 rounded-lg text-center">
                  <span className="text-pink-300 font-semibold">👨‍👩‍👧‍👦 Family</span>
                </div>
                <div className="p-3 bg-yellow-900/30 rounded-lg text-center">
                  <span className="text-yellow-300 font-semibold">💰 Finance</span>
                </div>
                <div className="p-3 bg-red-900/30 rounded-lg text-center">
                  <span className="text-red-300 font-semibold">🏥 Health</span>
                </div>
                <div className="p-3 bg-indigo-900/30 rounded-lg text-center">
                  <span className="text-indigo-300 font-semibold">🎯 Personal</span>
                </div>
                <div className="p-3 bg-orange-900/30 rounded-lg text-center">
                  <span className="text-orange-300 font-semibold">🚗 Auto</span>
                </div>
              </div>

              <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mt-6">
                <p className="text-purple-300 text-sm">
                  <strong>🎨 Organization Tip:</strong> Use categories for broad grouping (Home, Work, Errands) and priorities for urgency. Together, they make it easy to find exactly what you need: "Show me High priority Home tasks"!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="drag-drop" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Drag & Drop Reordering</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Sometimes priority and due date aren't enough—you need tasks in a specific order. Drag and drop lets you organize your list visually.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">How to Reorder Tasks</h3>
              <ol className="space-y-3 text-gray-300">
                <li><strong>Look for the grip handle:</strong> Each task card has a vertical grip icon (⋮⋮) on the left side</li>
                <li><strong>Click and hold the grip:</strong> The task card lifts up slightly with a shadow effect</li>
                <li><strong>Drag to new position:</strong> Move up or down in the list</li>
                <li><strong>Drop in place:</strong> Release to set the new position</li>
                <li><strong>Auto-saves:</strong> Your custom order is saved immediately for everyone</li>
              </ol>

              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-6">
                <p className="text-blue-300 text-sm">
                  <strong>✨ Pro Tip:</strong> Combine drag-and-drop with the "In Progress" status to show your household exactly what order you're working through tasks. It's like a visual work plan!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="delete-tasks" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Deleting Tasks</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Remove tasks you no longer need with confirmation prompts to prevent accidents.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Delete Single Task</h3>
              <ol className="space-y-2 text-gray-300">
                <li>Click the three-dot menu (⋮) on the task card</li>
                <li>Select "Delete Task" from the menu</li>
                <li>Confirm deletion in the popup dialog</li>
                <li>Task is permanently removed for all household members</li>
              </ol>

              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mt-6">
                <p className="text-yellow-300 text-sm mb-3">
                  <strong>⚠️ Important:</strong> Deletion is permanent! Tasks cannot be recovered once deleted.
                </p>
                <p className="text-yellow-300 text-sm">
                  <strong>💡 Alternative:</strong> Instead of deleting, consider marking tasks as "Completed" so you have a history!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* TASK DETAILS & ADVANCED FEATURES */}
          <section id="access-details" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Zap className="w-8 h-8 text-purple-500" />
              Accessing Task Details
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                The task details panel is where all the powerful features live. Click on any task to see subtasks, add comments, track time, attach files, and more.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Opening the Details Panel</h3>
              <ol className="space-y-2 text-gray-300">
                <li>Find the task card you want to view</li>
                <li>Click the three-dot menu (⋮) on the card</li>
                <li>Select "View Details" from the dropdown</li>
                <li>The details panel opens showing all task information</li>
              </ol>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="quick-actions" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Quick action buttons provide one-click access to common operations from the details panel.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-green-300 mb-2">✓ Complete Task</h4>
                  <p className="text-gray-300 text-sm">
                    Instantly mark as done
                  </p>
                </div>

                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-blue-300 mb-2">💤 Snooze Task</h4>
                  <p className="text-gray-300 text-sm">
                    Hide until later with preset times
                  </p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-purple-300 mb-2">👤 Assign Member</h4>
                  <p className="text-gray-300 text-sm">
                    Delegate to household member
                  </p>
                </div>

                <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-800">
                  <h4 className="font-semibold text-pink-300 mb-2">💬 Add Comment</h4>
                  <p className="text-gray-300 text-sm">
                    Leave notes for your household
                  </p>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="time-tracking" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Time Tracking</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Track how long tasks actually take to improve planning and productivity.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Using the Timer</h3>
              <ol className="space-y-3 text-gray-300">
                <li><strong>Start Timer:</strong> Click "Start Timer" when you begin working</li>
                <li><strong>Timer runs in background:</strong> Close the panel, timer keeps running</li>
                <li><strong>Stop Timer:</strong> Click "Stop Timer" when finished</li>
                <li><strong>Auto-logged:</strong> Time is automatically saved to the task</li>
              </ol>

              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-6">
                <p className="text-blue-300 text-sm">
                  <strong>📊 Productivity Insight:</strong> After tracking for a few weeks, you'll know exactly how long tasks take. Use this to set realistic deadlines!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="subtasks" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Subtasks & Breakdown</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Break complex tasks into smaller, manageable steps with individual checkboxes.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Creating Subtasks</h3>
              <ol className="space-y-2 text-gray-300">
                <li>Open task details panel</li>
                <li>Go to "Subtasks" tab</li>
                <li>Click "+ Add Subtask"</li>
                <li>Enter subtask title and press Enter</li>
                <li>Repeat for each step</li>
              </ol>

              <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 mt-6">
                <p className="text-emerald-300 text-sm">
                  <strong>🎯 Project Tip:</strong> When a task feels overwhelming, break it into subtasks immediately. You'll feel progress with each checkbox!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="comments" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Comments & Collaboration</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Use comments to discuss tasks, ask questions, and communicate with your household.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Adding Comments</h3>
              <ol className="space-y-2 text-gray-300">
                <li>Open task details</li>
                <li>Go to "Comments" tab</li>
                <li>Type your message</li>
                <li>Click "Post Comment"</li>
                <li>Everyone sees it instantly</li>
              </ol>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Emoji Reactions</h3>
              <div className="flex gap-3 my-4 p-4 bg-gray-900 rounded-lg">
                <button className="px-3 py-2 bg-gray-800 rounded-full border border-gray-700">👍</button>
                <button className="px-3 py-2 bg-gray-800 rounded-full border border-gray-700">❤️</button>
                <button className="px-3 py-2 bg-gray-800 rounded-full border border-gray-700">😄</button>
                <button className="px-3 py-2 bg-gray-800 rounded-full border border-gray-700">🎉</button>
              </div>

              <div className="bg-pink-900/20 border border-pink-800 rounded-lg p-4 mt-6">
                <p className="text-pink-300 text-sm">
                  <strong>👥 Family Tip:</strong> Comments create a running conversation. Future you will appreciate having the context when the task repeats!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="calendar-sync" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Calendar Sync</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Link tasks to your calendar for a unified view. Changes sync both ways automatically.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Enabling Calendar Sync</h3>
              <ol className="space-y-2 text-gray-300">
                <li>Open a task with a due date</li>
                <li>Find "Calendar Sync" toggle</li>
                <li>Turn it ON</li>
                <li>Task appears in calendar immediately</li>
              </ol>

              <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4 mt-6">
                <p className="text-indigo-300 text-sm">
                  <strong>📅 Organization Tip:</strong> Enable sync for time-bound tasks (appointments, deadlines), skip it for general to-dos. Keeps calendar focused!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* CHORE MANAGEMENT */}
          <section id="create-chores" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Home className="w-8 h-8 text-amber-500" />
              Creating Household Chores
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Chores are for recurring duties that rotate automatically among household members.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Common Household Chores</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 my-4">
                <div className="p-3 bg-amber-900/20 rounded-lg text-center text-sm">
                  🗑️ Take out trash
                </div>
                <div className="p-3 bg-amber-900/20 rounded-lg text-center text-sm">
                  🚿 Clean bathrooms
                </div>
                <div className="p-3 bg-amber-900/20 rounded-lg text-center text-sm">
                  🧹 Vacuum house
                </div>
                <div className="p-3 bg-amber-900/20 rounded-lg text-center text-sm">
                  🧺 Do laundry
                </div>
                <div className="p-3 bg-amber-900/20 rounded-lg text-center text-sm">
                  🍽️ Dishes/Dishwasher
                </div>
                <div className="p-3 bg-amber-900/20 rounded-lg text-center text-sm">
                  🌿 Mow lawn
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="chore-rotation" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Chore Rotation Setup</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Automatic rotation ensures fair distribution of household duties. Set it once, forget it forever.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">Rotation Options</h3>
              <div className="space-y-4 my-4">
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-blue-300 mb-2">🔄 Round Robin</h4>
                  <p className="text-gray-300 text-sm">
                    Assigns in order: Alex → Jamie → Alex → Jamie. Predictable and fair.
                  </p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-purple-300 mb-2">🎲 Random</h4>
                  <p className="text-gray-300 text-sm">
                    System picks randomly each time. Keeps things interesting!
                  </p>
                </div>
              </div>

              <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mt-6">
                <p className="text-amber-300 text-sm">
                  <strong>🏡 Household Tip:</strong> Rotation runs at midnight automatically. Everyone wakes up knowing whose turn it is!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="round-robin" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Round Robin Rotation</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Round Robin assigns chores in sequential order, ensuring everyone gets an equal turn.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">How It Works</h3>
              <div className="p-5 bg-gradient-to-r from-blue-50 from-blue-900/20 to-indigo-900/20 rounded-xl my-4">
                <p className="text-gray-300 mb-3"><strong>Example: "Take out trash" (Weekly)</strong></p>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li>Week 1: Alex's turn</li>
                  <li>Week 2: Jamie's turn</li>
                  <li>Week 3: Alex's turn again</li>
                  <li>Week 4: Jamie's turn again</li>
                  <li>...continues in order</li>
                </ul>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="random-assignment" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Random Assignment</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Random assignment lets the system pick someone randomly each rotation period. Great for keeping things unpredictable!
              </p>

              <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mt-4">
                <p className="text-purple-300 text-sm">
                  <strong>🎲 Fun Factor:</strong> Random assignment works well for chores nobody wants. The randomness makes it feel more fair somehow!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="rotation-intervals" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Rotation Intervals</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Choose how often chores rotate to match how frequently they need to be done.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">📅 Daily</h4>
                  <p className="text-sm text-gray-300">New person every day (e.g., "Feed pets", "Dishes")</p>
                </div>
                <div className="p-4 bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">📆 Weekly</h4>
                  <p className="text-sm text-gray-300">New person every week (e.g., "Trash", "Vacuum")</p>
                </div>
                <div className="p-4 bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">🗓️ Bi-weekly</h4>
                  <p className="text-sm text-gray-300">New person every 2 weeks (e.g., "Clean bathrooms")</p>
                </div>
                <div className="p-4 bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">📊 Monthly</h4>
                  <p className="text-sm text-gray-300">New person every month (e.g., "Deep clean", "Yard work")</p>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="chore-completion" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Chore Completion Tracking</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Mark chores as done just like tasks - click the checkbox to complete. The chore stays assigned to the same person until the next rotation period.
              </p>

              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 mt-4">
                <p className="text-green-300 text-sm">
                  <strong>✅ Completion Tip:</strong> Complete chores promptly so everyone can see who's pulling their weight. It builds household accountability!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* DASHBOARD & ANALYTICS */}
          <section id="stats-cards" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-500" />
              Understanding Stats Cards
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                The dashboard shows four stat cards at the top: Pending, In Progress, Completed, and Total. Each updates in real-time.
              </p>

              <div className="grid stats-grid-mobile gap-4 sm:gap-6 my-4">
                <div className="p-4 bg-red-900/20 rounded-lg text-center">
                  <div className="text-3xl font-bold text-red-400 mb-1">12</div>
                  <div className="text-sm text-gray-400">Pending</div>
                </div>
                <div className="p-4 bg-amber-900/20 rounded-lg text-center">
                  <div className="text-3xl font-bold text-amber-400 mb-1">5</div>
                  <div className="text-sm text-gray-400">In Progress</div>
                </div>
                <div className="p-4 bg-green-900/20 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">28</div>
                  <div className="text-sm text-gray-400">Completed</div>
                </div>
                <div className="p-4 bg-blue-900/20 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-1">45</div>
                  <div className="text-sm text-gray-400">Total</div>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="pending-indicator" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Pending Tasks Indicator</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                The orange "Needs attention" badge on the Pending card shows tasks waiting to be started. This is your daily action list!
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="progress-tracking" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">In Progress Tracking</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                The blue "Active" badge with trending arrow shows currently worked-on tasks. Great for seeing what your household is actively doing!
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="completion-percentage" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Completion Percentage</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                The green completion card shows the percentage of finished tasks (e.g., "67% complete"). Aim for that 100%!
              </p>

              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 mt-4">
                <p className="text-green-300 text-sm">
                  <strong>🎯 Goal Tip:</strong> Try to end each day with a higher completion percentage than you started. Small wins add up!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="monthly-overview" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Monthly Overview</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                See the current month badge and track task counts over time. Great for understanding household productivity patterns.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* SEARCH & FILTERING */}
          <section id="search" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Target className="w-8 h-8 text-pink-500" />
              Searching Tasks & Chores
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Use the search bar to find items by title or description instantly. Search is real-time and case-insensitive.
              </p>

              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-300 text-sm">
                  <strong>🔍 Search Tip:</strong> Type partial words! Searching "gro" finds "groceries", "grow flowers", "grout"
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="status-filter" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Status Filtering</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Filter view by All, Pending, In Progress, or Completed using the segmented controls at the top.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="tabs" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Task vs Chore Tabs</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Switch between Tasks and Chores tabs to focus on specific item types. Each tab maintains its own filters and sort order.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="item-count" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Combined Task Count</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                See the total count of filtered items displayed in the header. Helps you understand the scope of what you're viewing.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* INTEGRATION */}
          <section id="shopping-integration" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Grid3x3 className="w-8 h-8 text-teal-500" />
              Shopping List Integration
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Link tasks to shopping lists. Task cards show 🛒 icon with item count. Click to jump directly to the shopping list.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="calendar-integration" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Calendar Integration</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                View tasks in calendar and automatically sync due dates with calendar events. Toggle calendar sync per task.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="meal-plan-tasks" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Meal Plan Task Automation</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                When you add recipes to your meal plan, Rowan can auto-create cooking tasks that complete 2 hours after the scheduled meal time.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="recipe-chain" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Recipe to Shopping to Task Chain</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Seamless flow: Pick recipe → Add ingredients to shopping list → Create shopping task → Complete shopping → Cook meal. Everything connected!
              </p>

              <div className="bg-teal-900/20 border border-teal-800 rounded-lg p-4 mt-4">
                <p className="text-teal-300 text-sm">
                  <strong>🔗 Integration Magic:</strong> Rowan links all your household features together so nothing falls through the cracks!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* COLLABORATION */}
          <section id="realtime" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-rose-500" />
              Real-Time Updates
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                See changes instantly as household members update tasks across all devices. No refresh needed!
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="assign-tasks" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Assigning Tasks</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Assign tasks to specific household members with clear ownership. They'll see it in their filtered view.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="communication" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Comments & Communication</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Use comments to discuss tasks and react with emojis (👍❤️) for quick feedback. Keeps everyone in the loop!
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="member-rotation" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Chore Rotation Among Members</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Automatically rotate chores among all household members fairly with Round Robin or Random assignment.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* MOBILE & ACCESSIBILITY */}
          <section id="mobile" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-cyan-500" />
              Mobile-Friendly Interface
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Fully responsive design works seamlessly on phones and tablets. All features available on mobile!
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="touch-gestures" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Touch Gestures for Drag & Drop</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Use touch gestures to reorder tasks on mobile devices. Long press, drag, and drop works beautifully on touchscreens.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="dark-mode" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Dark Mode Support</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Automatic dark mode for comfortable viewing in any lighting condition. Toggle in settings or follows system preference.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="keyboard-shortcuts" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Keyboard Shortcuts</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Navigate and manage tasks efficiently with keyboard commands for power users who prefer keys over clicks.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="accessibility" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Screen Reader Support</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Full accessibility with ARIA labels, semantic HTML, and keyboard navigation. Rowan is usable by everyone!
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* TIPS & BEST PRACTICES */}
          <section id="organize-tasks" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-yellow-500" />
              Organizing Your Task List
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Best practices for keeping your task list manageable and actionable:
              </p>

              <ul className="space-y-2 text-gray-300">
                <li>Keep task list under 20 active items</li>
                <li>Complete or delete old tasks regularly</li>
                <li>Use clear, actionable titles</li>
                <li>Group related tasks with categories</li>
                <li>Review and update weekly</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="effective-priorities" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Using Priorities Effectively</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                How to assign priorities to focus on what matters most:
              </p>

              <ul className="space-y-2 text-gray-300">
                <li>Reserve Urgent for true emergencies (max 2-3 at a time)</li>
                <li>High priority for this week's important work</li>
                <li>Medium for general to-dos</li>
                <li>Low for someday/maybe items</li>
              </ul>

              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mt-6">
                <p className="text-yellow-300 text-sm">
                  <strong>💡 Priority Wisdom:</strong> If everything is urgent, nothing is urgent. Be selective!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="break-down-tasks" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Breaking Down Large Tasks</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Use subtasks to make complex projects more manageable. If a task takes more than 2 hours, break it down!
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="daily-routine" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Daily Task Review Routine</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Establish a daily routine for reviewing and updating your task list:
              </p>

              <ol className="space-y-2 text-gray-300">
                <li><strong>Morning:</strong> Review pending tasks, set 3 priorities for the day</li>
                <li><strong>Throughout day:</strong> Update status as you work</li>
                <li><strong>Evening:</strong> Complete finished tasks, plan tomorrow</li>
              </ol>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="chore-distribution" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Household Chore Distribution</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Tips for fair and effective chore distribution among household members:
              </p>

              <ul className="space-y-2 text-gray-300">
                <li>Set up rotation for regular chores</li>
                <li>Match chore difficulty to capabilities</li>
                <li>Rotate harder chores less frequently</li>
                <li>Track completion to ensure accountability</li>
              </ul>

              <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mt-6">
                <p className="text-amber-300 text-sm">
                  <strong>🏡 Family Harmony:</strong> Fair chore distribution reduces household conflict. Let the system handle it!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="time-tracking-tips" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Time Tracking for Productivity</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Use time tracking to understand how long tasks actually take and improve future planning:
              </p>

              <ul className="space-y-2 text-gray-300">
                <li>Track time for recurring tasks to set better estimates</li>
                <li>Review time logs to identify time sinks</li>
                <li>Use estimates to plan realistic daily schedules</li>
                <li>Share time data with household to set expectations</li>
              </ul>

              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-6">
                <p className="text-blue-300 text-sm">
                  <strong>⏱️ Time Wisdom:</strong> We consistently underestimate how long things take. Track time for 2 weeks to get realistic!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* Footer */}
          <div className="text-center text-gray-400 pt-8 border-t border-gray-700">
            <p>Need more help? Check out other <Link href="/settings/documentation" className="inline-block py-2 px-3 text-blue-400 hover:underline">documentation guides</Link></p>
          </div>
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
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 rounded-full border border-gray-700">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="text-white font-semibold">
              60+ Help Articles
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">
              10 Feature Categories
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">
              Beginner to Advanced
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
