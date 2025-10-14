'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft,
  Bell,
  Sparkles,
  Users,
  MessageCircle,
  AtSign,
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  Flag,
  Tag,
  Repeat,
  Download,
  Timer,
  Lightbulb,
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
    icon: Sparkles,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Introduction to Reminders',
        description: 'Learn how Rowan helps you never forget important moments and tasks',
        readTime: '3 min read',
        href: '#intro',
      },
      {
        title: 'Creating Your First Reminder',
        description: 'Quick guide to setting up reminders with categories, priorities, and times',
        readTime: '4 min read',
        href: '#first-reminder',
      },
      {
        title: 'Categories & Priorities',
        description: 'Organize reminders by type and importance for better clarity',
        readTime: '3 min read',
        href: '#categories',
      },
      {
        title: 'Setting Reminder Times',
        description: 'Schedule reminders for specific dates and times that work for you',
        readTime: '3 min read',
        href: '#timing',
      },
      {
        title: 'Status Management',
        description: 'Track reminders as Active, Snoozed, or Completed with one click',
        readTime: '2 min read',
        href: '#status',
      },
    ],
  },
  {
    title: 'Collaboration Features',
    icon: Users,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Assigning Reminders',
        description: 'Delegate reminders to specific users in your space for clear responsibility',
        readTime: '3 min read',
        href: '#assignment',
      },
      {
        title: 'Comments & Conversations',
        description: 'Discuss reminder details with threaded comments and real-time updates',
        readTime: '4 min read',
        href: '#comments',
      },
      {
        title: '@Mentions',
        description: 'Tag specific people in comments to get their attention instantly',
        readTime: '2 min read',
        href: '#mentions',
      },
      {
        title: 'Activity Timeline',
        description: 'See complete history of changes, assignments, and status updates',
        readTime: '3 min read',
        href: '#activity',
      },
    ],
  },
  {
    title: 'Advanced Features',
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Repeat Patterns',
        description: 'Create recurring reminders daily, weekly, or monthly with custom days',
        readTime: '4 min read',
        href: '#repeat',
      },
      {
        title: 'Snooze Functionality',
        description: 'Postpone reminders for 15 minutes to 2 hours when you need more time',
        readTime: '2 min read',
        href: '#snooze',
      },
      {
        title: 'Quick Templates',
        description: 'Use pre-built templates for common reminders like bills and appointments',
        readTime: '4 min read',
        href: '#templates',
      },
      {
        title: 'Real-time Notifications',
        description: 'Get instant alerts when reminders are assigned, commented, or overdue',
        readTime: '3 min read',
        href: '#notifications',
      },
    ],
  },
  {
    title: 'Bulk Operations',
    icon: CheckCircle2,
    color: 'from-green-500 to-green-600',
    articles: [
      {
        title: 'Multi-Select Mode',
        description: 'Select multiple reminders at once for batch operations',
        readTime: '2 min read',
        href: '#multi-select',
      },
      {
        title: 'Bulk Complete',
        description: 'Mark many reminders as done with a single action',
        readTime: '2 min read',
        href: '#bulk-complete',
      },
      {
        title: 'Bulk Priority & Category Changes',
        description: 'Update priority or category for multiple reminders simultaneously',
        readTime: '3 min read',
        href: '#bulk-edit',
      },
      {
        title: 'Export to JSON/CSV',
        description: 'Download your reminders data for backup or external analysis',
        readTime: '2 min read',
        href: '#export',
      },
    ],
  },
  {
    title: 'Tips & Best Practices',
    icon: Lightbulb,
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'Organizing with Categories',
        description: 'Best practices for using Bills, Health, Work, Personal, and Household categories',
        readTime: '3 min read',
        href: '#organizing',
      },
      {
        title: 'Using Priorities Effectively',
        description: 'When to use Urgent, High, Medium, and Low priority levels',
        readTime: '3 min read',
        href: '#priorities',
      },
      {
        title: 'Template Workflow',
        description: 'Save time by creating custom templates for recurring reminder types',
        readTime: '4 min read',
        href: '#template-workflow',
      },
      {
        title: 'Managing Overdue Reminders',
        description: 'Strategies for handling and preventing reminder backlog',
        readTime: '3 min read',
        href: '#overdue',
      },
    ],
  },
];

export default function RemindersDocumentationPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-reminders flex items-center justify-center shadow-lg">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Reminders Guide
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Complete guide to never forgetting important moments
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-200 dark:border-pink-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-pink-600 dark:text-pink-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-pink-900 dark:text-pink-100 mb-2">
                  Your Collaborative Reminder System
                </h3>
                <p className="text-pink-800 dark:text-pink-200 mb-3">
                  Track important tasks, delegate responsibilities, and collaborate with your partner on reminders:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-pink-700 dark:text-pink-300">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>User Assignment</strong> - Delegate to specific people</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Comments & Conversations</strong> - Discuss details inline</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AtSign className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>@Mentions</strong> - Tag people for attention</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Activity Tracking</strong> - Full change history</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Real-time Updates</strong> - Instant sync across devices</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Notifications</strong> - Never miss important reminders</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Quick Templates</strong> - 8 pre-built templates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Bulk Operations</strong> - Edit multiple at once</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Repeat className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Repeat Patterns</strong> - Daily, weekly, monthly</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Timer className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Snooze</strong> - Postpone when you need more time</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Download className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Export</strong> - Download as JSON or CSV</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>5 Categories</strong> - Bills, Health, Work, Personal, Household</span>
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
                      <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                        {article.readTime}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-reminders rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to Never Miss Important Moments?
          </h2>
          <p className="text-pink-100 mb-6 max-w-2xl mx-auto">
            Create reminders, assign to your partner, and collaborate on important tasks with comments, templates, and bulk operations.
          </p>
          <Link
            href="/reminders"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-pink-600 rounded-xl font-semibold hover:shadow-lg transition-shadow"
          >
            <Bell className="w-5 h-5" />
            Go to Reminders
          </Link>
        </div>
        </div>
      </div>
    </>
  );
}
