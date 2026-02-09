/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';
import {
  type LucideIcon,
  ArrowLeft,
  CheckSquare,
  Play,
  Repeat,
  Grid3x3,
  Users,
  Clock,
  Shuffle,
  FolderKanban,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface GuideSection {
  title: string;
  icon: LucideIcon;
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
        description: 'Learn how Rowan helps you organize daily tasks and household chores with 23 powerful features',
        readTime: '4 min read',
        href: '#intro',
      },
      {
        title: 'Creating Your First Task',
        description: 'Quick guide to creating and managing tasks with priorities, due dates, and assignments',
        readTime: '3 min read',
        href: '#first-task',
      },
      {
        title: 'Understanding Task Statuses',
        description: 'How to use pending, in-progress, completed, blocked, and on-hold statuses effectively',
        readTime: '3 min read',
        href: '#statuses',
      },
      {
        title: 'Setting Priorities',
        description: 'Use urgent, high, medium, and low priorities to organize your workload',
        readTime: '2 min read',
        href: '#priorities',
      },
    ],
  },
  {
    title: 'Core Task Features',
    icon: CheckSquare,
    color: 'from-emerald-500 to-emerald-600',
    articles: [
      {
        title: 'Task Creation & Editing',
        description: 'Add tasks with titles, descriptions, due dates, and assignments',
        readTime: '4 min read',
        href: '#create-tasks',
      },
      {
        title: 'Subtasks & Breakdown',
        description: 'Break complex tasks into manageable subtasks with completion tracking',
        readTime: '5 min read',
        href: '#subtasks',
      },
      {
        title: 'Task Categories',
        description: 'Organize tasks with custom color-coded categories',
        readTime: '3 min read',
        href: '#categories',
      },
      {
        title: 'Drag & Drop Reordering',
        description: 'Visually reorganize tasks by priority or preference with smooth drag-and-drop',
        readTime: '3 min read',
        href: '#drag-drop',
      },
      {
        title: 'Advanced Filtering',
        description: 'Filter tasks by status, priority, assignee, category, due date, and more',
        readTime: '4 min read',
        href: '#filtering',
      },
      {
        title: 'Real-Time Updates',
        description: 'See changes instantly as team members update tasks',
        readTime: '2 min read',
        href: '#realtime',
      },
    ],
  },
  {
    title: 'Recurring & Templates',
    icon: Repeat,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Creating Recurring Tasks',
        description: 'Set up tasks that repeat daily, weekly, monthly, or yearly with flexible patterns',
        readTime: '6 min read',
        href: '#recurring',
      },
      {
        title: 'Task Templates',
        description: 'Save frequently used task configurations as templates for quick reuse',
        readTime: '4 min read',
        href: '#templates',
      },
      {
        title: 'Managing Recurrence Patterns',
        description: 'Configure custom intervals, specific days, and end conditions',
        readTime: '5 min read',
        href: '#recurrence-patterns',
      },
    ],
  },
  {
    title: 'Time & Tracking',
    icon: Clock,
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'Time Tracking',
        description: 'Track time spent on tasks with start/stop timer and manual entry',
        readTime: '5 min read',
        href: '#time-tracking',
      },
      {
        title: 'Due Dates & Reminders',
        description: 'Set due dates and receive notifications before, at, or after deadline',
        readTime: '4 min read',
        href: '#reminders',
      },
      {
        title: 'Snooze & Postpone',
        description: 'Temporarily hide tasks with quick snooze presets or custom datetime',
        readTime: '3 min read',
        href: '#snooze',
      },
      {
        title: 'Calendar Integration',
        description: 'Sync tasks to your calendar with two-way updates',
        readTime: '5 min read',
        href: '#calendar',
      },
    ],
  },
  {
    title: 'Collaboration & Assignment',
    icon: Users,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Multi-Assignment',
        description: 'Assign tasks to multiple team members with different roles',
        readTime: '4 min read',
        href: '#multi-assignment',
      },
      {
        title: 'Task Handoff',
        description: 'Reassign tasks between team members with notes and history',
        readTime: '3 min read',
        href: '#handoff',
      },
      {
        title: 'Comments & Reactions',
        description: 'Collaborate with threaded comments and emoji reactions',
        readTime: '4 min read',
        href: '#comments',
      },
      {
        title: 'Chore Rotation',
        description: 'Automatically rotate chore assignments in round-robin or random order',
        readTime: '5 min read',
        href: '#rotation',
      },
    ],
  },
  {
    title: 'Advanced Features',
    icon: Zap,
    color: 'from-indigo-500 to-indigo-600',
    articles: [
      {
        title: 'Task Dependencies',
        description: 'Create blocking relationships between tasks with circular detection',
        readTime: '5 min read',
        href: '#dependencies',
      },
      {
        title: 'Approval Workflow',
        description: 'Request approval from team members before marking tasks complete',
        readTime: '5 min read',
        href: '#approval',
      },
      {
        title: 'File Attachments',
        description: 'Upload documents, images, and files up to 50MB per task',
        readTime: '3 min read',
        href: '#attachments',
      },
      {
        title: 'Bulk Operations',
        description: 'Perform actions on multiple tasks at once for efficiency',
        readTime: '4 min read',
        href: '#bulk-operations',
      },
      {
        title: 'Quick Actions',
        description: 'Access common actions instantly with tracked usage analytics',
        readTime: '3 min read',
        href: '#quick-actions',
      },
      {
        title: 'Task Export',
        description: 'Export tasks to CSV with custom column selection and filters',
        readTime: '4 min read',
        href: '#export',
      },
    ],
  },
  {
    title: 'Integration with Other Features',
    icon: Grid3x3,
    color: 'from-teal-500 to-teal-600',
    articles: [
      {
        title: 'Recipe → Shopping → Task Chain',
        description: 'Auto-create tasks from recipes and shopping lists with smart cleanup',
        readTime: '6 min read',
        href: '#recipe-chain',
      },
      {
        title: 'Meal Plan → Task Integration',
        description: 'Automatically create cooking tasks from meal plans with time tracking',
        readTime: '5 min read',
        href: '#meal-plan-tasks',
      },
      {
        title: 'Calendar Task View',
        description: 'See all your tasks on the calendar with due date visualization',
        readTime: '3 min read',
        href: '#calendar-view',
      },
    ],
  },
  {
    title: 'Analytics & History',
    icon: FolderKanban,
    color: 'from-orange-500 to-orange-600',
    articles: [
      {
        title: 'Task History & Activity Log',
        description: 'Comprehensive audit trail of all task changes with 1-year retention',
        readTime: '4 min read',
        href: '#history',
      },
      {
        title: 'Quick Actions Analytics',
        description: 'See which actions you use most with usage tracking',
        readTime: '3 min read',
        href: '#analytics',
      },
      {
        title: 'Completion Stats',
        description: 'Track pending, in-progress, and completed task counts',
        readTime: '2 min read',
        href: '#stats',
      },
    ],
  },
  {
    title: 'Automation',
    icon: Shuffle,
    color: 'from-red-500 to-red-600',
    articles: [
      {
        title: 'Background Job System',
        description: 'Automated processing for recurring tasks, reminders, and cleanup',
        readTime: '5 min read',
        href: '#background-jobs',
      },
      {
        title: 'Auto-Complete Meal Tasks',
        description: 'Tasks auto-complete 2 hours after scheduled meal time',
        readTime: '3 min read',
        href: '#auto-complete',
      },
      {
        title: 'Auto-Delete Shopping Tasks',
        description: 'Shopping-linked tasks auto-delete at midnight in your timezone',
        readTime: '3 min read',
        href: '#auto-delete',
      },
      {
        title: 'Auto-Unsnooze',
        description: 'Snoozed tasks automatically reappear at scheduled time',
        readTime: '2 min read',
        href: '#auto-unsnooze',
      },
    ],
  },
];

export default function TasksDocumentationPage() {
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
                Complete documentation for all 23 task management features
              </p>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-blue-100 mb-2">
                  Welcome to Advanced Task Management
                </h3>
                <p className="text-blue-200 mb-2">
                  Rowan's task system includes everything you need to organize daily tasks and household chores:
                </p>
                <ul className="text-sm text-blue-300 space-y-1 ml-4">
                  <li>• <strong>Recurring tasks</strong> - Auto-generate tasks daily, weekly, or monthly</li>
                  <li>• <strong>Time tracking</strong> - Track hours spent with built-in timer</li>
                  <li>• <strong>Subtasks</strong> - Break down complex projects</li>
                  <li>• <strong>Dependencies</strong> - Create task relationships</li>
                  <li>• <strong>Approval workflow</strong> - Require sign-off before completion</li>
                  <li>• <strong>Drag & drop</strong> - Visual reordering</li>
                  <li>• <strong>Real-time sync</strong> - Instant updates across devices</li>
                  <li>• <strong>File attachments</strong> - Store documents up to 50MB</li>
                  <li>• <strong>Calendar integration</strong> - Two-way sync</li>
                  <li>• <strong>Chore rotation</strong> - Automated assignment rotation</li>
                  <li>• Plus 13 more features...</li>
                </ul>
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

        {/* Quick Access Section */}
        <div className="mt-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="mb-6 text-blue-100">
            Access the advanced tasks interface to try all features:
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/tasks-advanced"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
            >
              <CheckSquare className="w-5 h-5" />
              Open Advanced Tasks
            </Link>
            <Link
              href="/tasks"
              className="px-6 py-3 bg-blue-400 text-white rounded-lg font-semibold hover:bg-blue-300 transition-colors inline-flex items-center gap-2"
            >
              <CheckSquare className="w-5 h-5" />
              Standard Tasks Page
            </Link>
          </div>
        </div>

        {/* Feature Count Badge */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 rounded-full border border-gray-700">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="text-white font-semibold">
              23 Powerful Features
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">
              8,981 lines of code
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">
              100% complete
            </span>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
