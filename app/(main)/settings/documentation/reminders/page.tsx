'use client';

import Link from 'next/link';

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
  Calendar,
  AlertCircle,
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 mb-6"
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

        {/* Detailed Content Sections */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-12 border border-gray-200 dark:border-gray-700">
          {/* GETTING STARTED */}
          <section id="intro" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-pink-500" />
              Introduction to Reminders
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Rowan's Reminders feature is your collaborative memory system, designed to help you and your partner never miss important moments together. Whether it's medication schedules, bill payments, or special dates, our reminders keep your household running smoothly.
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Why Reminders Are Different</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Unlike simple alarm apps, Rowan's reminders are built for collaboration. You can assign reminders to specific people, discuss details in comments, use @mentions to get attention, and track the complete history of changes.
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Key Features at a Glance</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Smart Categories:</strong> Bills, Health, Work, Personal, and Household categories with color coding</li>
                <li><strong>Priority Levels:</strong> Urgent, High, Medium, and Low priorities to focus on what matters</li>
                <li><strong>User Assignment:</strong> Delegate reminders to specific household members</li>
                <li><strong>Comments & @Mentions:</strong> Discuss details and tag people for attention</li>
                <li><strong>Repeat Patterns:</strong> Daily, weekly, monthly recurring reminders with custom days</li>
                <li><strong>Snooze Function:</strong> Postpone reminders for 15 minutes to 2 hours</li>
                <li><strong>Quick Templates:</strong> Pre-built templates for common reminders</li>
                <li><strong>Activity Tracking:</strong> Complete history of who did what and when</li>
                <li><strong>Bulk Operations:</strong> Select multiple reminders for batch actions</li>
                <li><strong>Real-time Sync:</strong> Everyone sees updates instantly across all devices</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="first-reminder" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Creating Your First Reminder</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Let's walk through creating a reminder step by step:
              </p>
              <ol className="space-y-4 text-gray-700 dark:text-gray-300">
                <li>
                  <strong>Navigate to Reminders:</strong> Click "Reminders" in your main navigation menu
                </li>
                <li>
                  <strong>Click "New Reminder":</strong> Look for the pink "+ New Reminder" button in the top right
                </li>
                <li>
                  <strong>Add Emoji Icon (Optional):</strong> Click the smiley face icon to choose an emoji that represents your reminder (💊 for medication, 💰 for bills, 📅 for appointments)
                </li>
                <li>
                  <strong>Enter Reminder Title:</strong> Give it a clear, specific name
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>Good: "Take blood pressure medication"</li>
                    <li>Good: "Pay electric bill before 15th"</li>
                    <li>Good: "Call Mom for her birthday"</li>
                    <li>Avoid: "meds" (too vague)</li>
                  </ul>
                </li>
                <li>
                  <strong>Add Description (Optional):</strong> Include helpful details like:
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>Dosage information for medications</li>
                    <li>Account numbers for bills</li>
                    <li>Phone numbers or addresses</li>
                    <li>Special instructions</li>
                  </ul>
                </li>
                <li>
                  <strong>Choose Category:</strong> Select from Bills (💰), Health (💊), Work (💼), Personal (👤), or Household (🏠)
                </li>
                <li>
                  <strong>Assign to Someone (Optional):</strong> Pick who's responsible from your household members
                </li>
                <li>
                  <strong>Set Reminder Time:</strong> Pick the exact date and time you want to be reminded
                </li>
                <li>
                  <strong>Set Priority:</strong> Choose Urgent, High, Medium, or Low
                </li>
                <li>
                  <strong>Set Repeat Pattern (Optional):</strong> Choose Daily, Weekly, or Monthly if this repeats
                </li>
                <li>
                  <strong>Click "Create Reminder":</strong> Your reminder is now active and will alert at the scheduled time!
                </li>
              </ol>

              <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4 mt-6">
                <p className="text-pink-700 dark:text-pink-300 text-sm">
                  <strong>✨ Quick Start Tip:</strong> Don't want to fill out all fields? Just add a title and time – you can always add more details later! The emoji, description, and other fields are all optional.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="categories" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Categories & Priorities</h2>
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">The 5 Reminder Categories</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Categories help you organize reminders visually and filter them quickly:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">💰</span>
                    <h4 className="font-bold text-gray-900 dark:text-white">Bills</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Financial reminders like utilities, rent, subscriptions, credit cards</p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">💊</span>
                    <h4 className="font-bold text-gray-900 dark:text-white">Health</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Medications, doctor appointments, prescriptions, wellness checks</p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">💼</span>
                    <h4 className="font-bold text-gray-900 dark:text-white">Work</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Work deadlines, meetings, project milestones, professional commitments</p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">👤</span>
                    <h4 className="font-bold text-gray-900 dark:text-white">Personal</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Birthdays, anniversaries, personal goals, social events</p>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🏠</span>
                    <h4 className="font-bold text-gray-900 dark:text-white">Household</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Home maintenance, repairs, inspections, seasonal tasks</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-8 mb-3">Understanding Priority Levels</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Urgent</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Time-sensitive, critical reminders that need immediate attention (medication due now, bill deadline today)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-2xl">🟠</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">High</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Important reminders that should be addressed soon (doctor appointment this week, upcoming bill)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <span className="text-2xl">🟡</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Medium</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Standard reminders with some flexibility (schedule maintenance, plan event)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-2xl">🟢</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Low</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Nice-to-have reminders with no urgency (consider renewal, check on something)</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-6">
                <p className="text-purple-700 dark:text-purple-300 text-sm">
                  <strong>🎯 Organization Tip:</strong> Use categories for visual organization (colors help you scan quickly) and priorities for urgency. A "Health" reminder can be Urgent (take meds now) or Low (schedule annual checkup).
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="timing" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Setting Reminder Times</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Timing is everything with reminders. Rowan gives you flexible options to set exactly when you want to be alerted:
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Setting a Specific Date & Time</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>In the reminder creation modal, find the "Reminder Time" field</li>
                <li>Click the date/time picker</li>
                <li>Select the date from the calendar</li>
                <li>Set the specific time you want the notification</li>
                <li>The system validates that you can't set times in the past</li>
              </ol>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 my-4">
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  <strong>⏰ Timing Strategy:</strong> Set medication reminders for the exact time you need to take them. Set bill reminders for 2-3 days before the due date to give yourself time to pay. Set appointment reminders for 1 hour before so you can prepare.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">How Notifications Work</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Real-time Alerts:</strong> Get browser notifications at the scheduled time</li>
                <li><strong>Overdue Indicators:</strong> Reminders show a red "Overdue" badge after the time passes</li>
                <li><strong>Dashboard Summary:</strong> See your Active, Overdue, and Completed counts at a glance</li>
                <li><strong>Filter by Status:</strong> Quickly view just overdue reminders to catch up</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Best Practices for Timing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">✅ Do This</h4>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Set medication times precisely</li>
                    <li>• Give yourself buffer time for bills</li>
                    <li>• Use morning times for daily tasks</li>
                    <li>• Set recurring reminders for routines</li>
                  </ul>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">❌ Avoid This</h4>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Setting reminders too close to deadlines</li>
                    <li>• Using vague times (just pick one!)</li>
                    <li>• Forgetting time zones if traveling</li>
                    <li>• Setting too many for the same time</li>
                  </ul>
                </div>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="status" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Status Management</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Rowan uses three simple statuses to track your reminders through their lifecycle:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-center mb-4">
                    <Clock className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Active</h3>
                  <p className="text-center text-gray-700 dark:text-gray-300 text-sm">
                    Waiting to happen - scheduled and ready to alert you at the set time
                  </p>
                </div>

                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-center mb-4">
                    <Timer className="w-12 h-12 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Snoozed</h3>
                  <p className="text-center text-gray-700 dark:text-gray-300 text-sm">
                    Temporarily postponed - pushed back 15 min to 2 hours for later
                  </p>
                </div>

                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Completed</h3>
                  <p className="text-center text-gray-700 dark:text-gray-300 text-sm">
                    Done! Marked as completed - task finished successfully
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Changing Status</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                You can change status from anywhere:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>From Reminder Card:</strong> Click the status dropdown (Active/Snoozed/Completed)</li>
                <li><strong>From Details Panel:</strong> Use the quick action buttons or dropdown</li>
                <li><strong>Bulk Operations:</strong> Select multiple and change all at once</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Status Filters</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                The filter bar lets you view reminders by status:
              </p>
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
                <span className="px-3 py-1 bg-pink-500 text-white rounded-lg text-sm font-medium">All</span>
                <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Active</span>
                <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Snoozed</span>
                <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm">Completed</span>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                <p className="text-green-700 dark:text-green-300 text-sm">
                  <strong>✨ Productivity Tip:</strong> Start your day by viewing Active reminders only to focus on what's coming up. End your day by marking things Completed to feel accomplished. Use Snoozed view to check what you postponed!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* COLLABORATION FEATURES */}
          <section id="assignment" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-500" />
              Assigning Reminders
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                One of Rowan's most powerful features is the ability to assign reminders to specific people in your household. This creates clear responsibility and ensures everyone knows who needs to handle what.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">How to Assign a Reminder</h3>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li>
                  <strong>During Creation:</strong>
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>Click the "Assigned To" dropdown in the reminder modal</li>
                    <li>Select a household member from the list</li>
                    <li>Or leave it unassigned if it's for everyone</li>
                  </ul>
                </li>
                <li>
                  <strong>After Creation:</strong>
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>Open the reminder details</li>
                    <li>Click "Assign" in the quick actions</li>
                    <li>Choose the person who should handle it</li>
                  </ul>
                </li>
                <li>
                  <strong>Bulk Assignment:</strong>
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>Select multiple reminders using Bulk Select</li>
                    <li>Click "Assign to"</li>
                    <li>Choose one person for all selected reminders</li>
                  </ul>
                </li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Assignment Filters</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Quickly filter reminders by assignment:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>All:</strong> See every reminder in the space</li>
                <li><strong>My Reminders:</strong> Only reminders assigned to you</li>
                <li><strong>Unassigned:</strong> Reminders that haven't been assigned yet</li>
              </ul>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-6">
                <p className="text-purple-700 dark:text-purple-300 text-sm">
                  <strong>👥 Collaboration Tip:</strong> Assign medication reminders to the person taking them, bill reminders to whoever pays bills, and appointment reminders to who's attending. This keeps everyone accountable and prevents "I thought you were handling that!" moments.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="comments" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Comments & Conversations</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Sometimes a reminder needs discussion. Rowan's comment system lets you have threaded conversations right on the reminder itself – no need to switch to messaging apps.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Adding Comments</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>Open any reminder's details panel</li>
                <li>Scroll to the "Comments" section at the bottom</li>
                <li>Type your comment in the input field</li>
                <li>Click "Post" or press Enter</li>
                <li>Your comment appears instantly for everyone</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Real-time Updates</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Comments sync in real-time across all devices. When your partner adds a comment, you see it immediately – no refresh needed!
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Use Cases for Comments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💊 Health Reminders</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">"Take blood pressure medication"</p>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <p>"Took it at 8am, BP was 120/80"</p>
                    <p>"Great! Keep tracking daily"</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💰 Bill Reminders</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">"Pay electric bill"</p>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <p>"Account number is 123456"</p>
                    <p>"Paid! Confirmation #789"</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  <strong>💬 Communication Tip:</strong> Use comments to add context that doesn't fit in the description, coordinate timing with your partner, or leave notes for future recurrences of the reminder.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="mentions" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">@Mentions</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Need to get someone's attention on a specific reminder? Use @mentions to tag them directly in comments!
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">How to @Mention Someone</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>Start typing a comment in any reminder</li>
                <li>Type the @ symbol</li>
                <li>A dropdown appears with household members</li>
                <li>Select the person you want to mention</li>
                <li>Their name appears highlighted in your comment</li>
                <li>They get a notification about the mention</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">When to Use @Mentions</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Asking for Help:</strong> "@Alex can you pick up my prescription?"</li>
                <li><strong>Delegating:</strong> "@Jamie you're better at calling insurance companies"</li>
                <li><strong>Getting Confirmation:</strong> "@Sam did you take your medication?"</li>
                <li><strong>Sharing Information:</strong> "@Taylor the appointment time changed to 3pm"</li>
              </ul>

              <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4 mt-6">
                <p className="text-pink-700 dark:text-pink-300 text-sm">
                  <strong>🔔 Notification Tip:</strong> @Mentions trigger instant notifications, so use them when you need someone's immediate attention. For general comments, skip the @ and they'll see it when they check the reminder.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="activity" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Activity Timeline</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Every reminder has a complete activity timeline showing who did what and when. This creates accountability and helps you track history.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">What's Tracked</h3>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Creation:</strong> "John created this reminder" with timestamp
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Users className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Assignment Changes:</strong> "Sarah assigned to Alex" with when
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Flag className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Status Updates:</strong> "Alex marked as completed" with time
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Timer className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Snooze Actions:</strong> "Jamie snoozed for 1 hour" with when
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Viewing Activity</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>Open any reminder's details panel</li>
                <li>Look for the "Activity" section</li>
                <li>See the full timeline in chronological order</li>
                <li>Most recent activities appear at the top</li>
              </ol>

              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-6">
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  <strong>📊 Accountability Benefit:</strong> Activity tracking answers "who changed this?" and "when was this done?" without anyone having to remember or explain. Perfect for medication tracking, bill payment history, and resolving "did you do it?" questions!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* ADVANCED FEATURES */}
          <section id="repeat" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
              <Repeat className="w-8 h-8 text-blue-500" />
              Repeat Patterns
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                For reminders that happen regularly, use repeat patterns to set them once and let Rowan handle the rest!
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">The Three Repeat Options</h3>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-blue-600" />
                    Daily Repeating
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
                    Perfect for daily medications, morning routines, or tasks that happen every single day.
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400"><strong>Example:</strong> "Take vitamin D supplement" at 8:00 AM every day</p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Weekly Repeating with Day Selection
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
                    Choose specific days of the week. Great for activities that happen on set weekdays.
                  </p>
                  <div className="mt-3 mb-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2"><strong>Select days:</strong></p>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-pink-500 text-white rounded text-xs">Mon</span>
                      <span className="px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">Tue</span>
                      <span className="px-2 py-1 bg-pink-500 text-white rounded text-xs">Wed</span>
                      <span className="px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">Thu</span>
                      <span className="px-2 py-1 bg-pink-500 text-white rounded text-xs">Fri</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400"><strong>Example:</strong> "Physical therapy exercises" on Mon, Wed, Fri</p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-green-600" />
                    Monthly Repeating with Date Selection
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
                    Choose specific days of the month (1-31). Perfect for bills, subscriptions, and monthly tasks.
                  </p>
                  <div className="mt-3 mb-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2"><strong>Select dates:</strong></p>
                    <div className="grid grid-cols-7 gap-1">
                      <span className="px-2 py-1 bg-pink-500 text-white rounded text-xs text-center">1</span>
                      <span className="px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs text-center">2</span>
                      <span className="px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs text-center">...</span>
                      <span className="px-2 py-1 bg-pink-500 text-white rounded text-xs text-center">15</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400"><strong>Example:</strong> "Pay rent" on the 1st and "Pay credit card" on the 15th</p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-6">
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  <strong>🔄 Repeat Strategy:</strong> Set up repeating reminders for medications, bills, and recurring appointments once, then never worry about creating them again. The system automatically creates the next occurrence when you complete the current one!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="snooze" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Snooze Functionality</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Sometimes you see a reminder but can't handle it right that second. That's where snooze comes in!
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">How to Snooze</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>Click on any active reminder</li>
                <li>Click the "Snooze" button in quick actions</li>
                <li>Choose your snooze duration:
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>15 minutes - Quick pause</li>
                    <li>30 minutes - Short delay</li>
                    <li>1 hour - Come back later</li>
                    <li>2 hours - Deal with this afternoon</li>
                  </ul>
                </li>
                <li>The reminder moves to "Snoozed" status</li>
                <li>After the snooze time, it automatically returns to "Active"</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Collaborative Snooze Tracking</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Rowan tracks who snoozed what and when, so your partner can see:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>"Alex snoozed for 1 hour at 2:00 PM"</li>
                <li>"Will be active again at 3:00 PM"</li>
                <li>Complete snooze history in the activity timeline</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Best Snooze Practices</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">✅ Good Uses</h4>
                  <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                    <li>• Quick tasks you'll do soon</li>
                    <li>• Waiting for right timing</li>
                    <li>• Need to finish current task first</li>
                    <li>• Reminder came too early</li>
                  </ul>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">❌ Avoid</h4>
                  <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
                    <li>• Repeatedly snoozing instead of doing</li>
                    <li>• Snoozing long-term tasks</li>
                    <li>• Using snooze as "delete"</li>
                    <li>• Snoozing critical medication</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  <strong>⏰ Snooze Wisely:</strong> Snooze is for short delays, not procrastination. If you find yourself snoozing the same reminder 5 times, either reschedule it to a better time or mark it complete and create a new one for later!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Quick Templates</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Quick Templates are your shortcut to creating common reminders without starting from scratch every time. Rowan comes with pre-built templates for the most frequent reminder types.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Available Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💊</span>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Doctor Appointment</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Medical appointment reminder with health category and high priority</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📞</span>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Call Someone</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Reminder to make a phone call with personal category</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💰</span>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Pay Bill</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Recurring bill payment with bills category and high priority</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💊</span>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Take Medication</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Daily medication reminder with health category</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🛒</span>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Buy Groceries</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Grocery shopping reminder with household category</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">How to Use Templates</h3>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li>
                  <strong>From Quick Templates Section:</strong> Click any template card on the Reminders page
                </li>
                <li>
                  <strong>Modal Opens with Pre-filled Data:</strong> Title, emoji, category, and priority are already set
                </li>
                <li>
                  <strong>Customize Before Saving:</strong>
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li>Add specific details to the title ("Pay electric bill" → "Pay electric bill - Account #123")</li>
                    <li>Set the reminder time</li>
                    <li>Assign to a specific person</li>
                    <li>Add description with notes</li>
                    <li>Configure repeat pattern if needed</li>
                  </ul>
                </li>
                <li>
                  <strong>Save Your Reminder:</strong> Click "Create Reminder" and it's added to your list
                </li>
              </ol>

              <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4 mt-6">
                <p className="text-pink-700 dark:text-pink-300 text-sm">
                  <strong>✨ Template Power Move:</strong> Templates save you time by pre-filling common settings. The "Pay Bill" template automatically sets Bills category and High priority, so you just need to add the bill name, amount, and due date!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="notifications" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Real-time Notifications</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Rowan's notification system ensures you never miss important reminders, with alerts delivered at exactly the right time.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Types of Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Bell className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Reminder Due:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Browser notification at the scheduled time with reminder title and details</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Users className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Assignment:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Notified when someone assigns a reminder to you</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                  <AtSign className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900 dark:text-white">@Mentions:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Instant alert when someone mentions you in a comment</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Overdue Reminders:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Daily summary of reminders that passed their due time</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Comments:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Notified when someone comments on your reminders</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Notification Preferences</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Control your notifications in Settings → Notifications:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Enable/Disable Browser Notifications:</strong> Turn on/off all browser alerts</li>
                <li><strong>Notification Channels:</strong> Choose which types of notifications you want</li>
                <li><strong>Quiet Hours:</strong> Set times when you don't want to be disturbed</li>
                <li><strong>Sound Preferences:</strong> Enable or disable notification sounds</li>
              </ul>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-6">
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  <strong>🔔 Notification Strategy:</strong> Enable browser notifications for time-sensitive reminders (medications, appointments) but consider muting less urgent categories during work hours. You can always check the Reminders page to see what's pending!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* BULK OPERATIONS */}
          <section id="multi-select" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              Multi-Select Mode
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                When you need to act on multiple reminders at once, Bulk Select mode is your friend. Perfect for end-of-week cleanup or managing related reminders together.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Entering Bulk Select Mode</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>Click the "Bulk Select" button in the top right of the Reminders page</li>
                <li>A tooltip explains: "Select multiple reminders for bulk actions"</li>
                <li>Checkboxes appear on all reminder cards</li>
                <li>The action bar appears at the bottom with available bulk operations</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Selecting Reminders</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Individual Selection:</strong> Click checkbox on any reminder card</li>
                <li><strong>Select All:</strong> Click "Select All" to check every visible reminder</li>
                <li><strong>Deselect All:</strong> Click "Deselect All" to uncheck everything</li>
                <li><strong>Filter First:</strong> Apply filters (status, category, assigned) before selecting to narrow down your choices</li>
              </ul>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-6">
                <p className="text-green-700 dark:text-green-300 text-sm">
                  <strong>🎯 Selection Strategy:</strong> Filter to see only what you want to act on (like all completed reminders from last week), then "Select All" to grab them all at once. Way faster than clicking one by one!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="bulk-complete" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Bulk Complete</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Mark multiple reminders as completed with one click – perfect for end-of-day cleanup or when you've tackled several tasks at once.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">How to Bulk Complete</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>Enter Bulk Select mode</li>
                <li>Check the boxes for reminders you've completed</li>
                <li>Click "Complete" in the bulk actions bar</li>
                <li>Confirm the action if prompted</li>
                <li>All selected reminders move to Completed status</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Common Use Cases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🏃 Morning Routine</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Complete all your morning medication reminders at once after taking them all</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💼 Work Day End</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Mark all work reminders as done when you finish for the day</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🏠 Weekend Cleanup</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Complete all household tasks you tackled during weekend chores</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💰 Bill Payment Session</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Mark all bills as paid after a bill-paying session</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  <strong>✅ Completion Tip:</strong> Filter by category first (like "Health" or "Bills") to see related reminders together, then bulk complete them all. This keeps similar tasks organized and prevents you from accidentally completing unrelated reminders!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="bulk-edit" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Bulk Priority & Category Changes</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Sometimes you need to reorganize multiple reminders at once – changing priorities, categories, or assignments. Bulk editing makes this fast and efficient.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Available Bulk Edits</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Flag className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Change Priority:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Update priority for all selected (Urgent, High, Medium, Low)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Tag className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Change Category:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Apply category to all selected (Bills, Health, Work, Personal, Household)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Assign To:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Assign all selected reminders to one person</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <Download className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-gray-900 dark:text-white">Delete:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Remove all selected reminders (with confirmation)</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Practical Scenarios</h3>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li>
                  <strong>Upcoming Vacation:</strong> Select all work reminders for next week and change priority to Low
                </li>
                <li>
                  <strong>New Roommate:</strong> Select all household reminders and reassign half to the new person
                </li>
                <li>
                  <strong>Health Focus:</strong> Select all health-related reminders and change to High priority for the month
                </li>
                <li>
                  <strong>Spring Cleaning:</strong> Select all old completed reminders and delete them in bulk
                </li>
              </ul>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-6">
                <p className="text-purple-700 dark:text-purple-300 text-sm">
                  <strong>🎨 Organization Power Move:</strong> At the start of each month, review last month's reminders, bulk complete what you forgot to mark done, and bulk delete old ones. Then bulk reassign responsibilities if household duties need rebalancing!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="export" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Export to JSON/CSV</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Need a backup of your reminders or want to analyze them in a spreadsheet? Export your data to JSON or CSV format.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">How to Export</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>Go to Settings → Data & Privacy</li>
                <li>Find the "Export Reminders" section</li>
                <li>Choose your format:
                  <ul className="mt-2 space-y-1 ml-4 text-sm">
                    <li><strong>JSON:</strong> Complete data with all fields, great for backups</li>
                    <li><strong>CSV:</strong> Spreadsheet-friendly format for Excel/Google Sheets analysis</li>
                  </ul>
                </li>
                <li>Click "Export"</li>
                <li>File downloads to your computer</li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">What Gets Exported</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>All reminder details (title, description, category, priority)</li>
                <li>Timing information (reminder time, repeat pattern)</li>
                <li>Assignment data (who it's assigned to)</li>
                <li>Status and completion dates</li>
                <li>Creation timestamps</li>
                <li>Metadata (IDs for reference)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Why Export?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">💾 Backup</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Keep a local copy of all your reminders for safekeeping</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📊 Analysis</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Analyze patterns in spreadsheets (who completes most reminders?)</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📋 Documentation</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Create reports for medical records or bill payment history</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🔄 Migration</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">Move data to another system if needed</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-4">
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  <strong>📁 Backup Recommendation:</strong> Export your reminders monthly as a backup. Store the files in your cloud storage (Google Drive, Dropbox) so you have a history of all your important reminders over time!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* TIPS & BEST PRACTICES */}
          <section id="organizing" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-amber-500" />
              Organizing with Categories
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Categories are your visual organization system. Use them strategically to scan your reminders at a glance and filter quickly.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Category Best Practices</h3>

              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    💰 Bills - Financial Reminders
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Monthly subscriptions (Netflix, Spotify, gym)</li>
                    <li>• Utilities (electric, water, gas, internet)</li>
                    <li>• Credit card payments and due dates</li>
                    <li>• Rent or mortgage payments</li>
                    <li>• Insurance premiums</li>
                  </ul>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3"><strong>Pro Tip:</strong> Set bill reminders for 2-3 days before due date with High priority</p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    💊 Health - Medical & Wellness
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Daily medications and vitamins</li>
                    <li>• Doctor, dentist, specialist appointments</li>
                    <li>• Prescription refills</li>
                    <li>• Exercise or physical therapy routines</li>
                    <li>• Mental health check-ins</li>
                  </ul>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3"><strong>Pro Tip:</strong> Use repeat patterns for daily medications, mark appointments as Urgent</p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    💼 Work - Professional Commitments
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Meeting preparation and attendance</li>
                    <li>• Project deadlines and milestones</li>
                    <li>• Follow-up calls and emails</li>
                    <li>• Report submissions</li>
                    <li>• Professional development tasks</li>
                  </ul>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3"><strong>Pro Tip:</strong> Keep work separate from personal for better work-life balance visualization</p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    👤 Personal - Life & Relationships
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Birthdays and anniversaries</li>
                    <li>• Social events and gatherings</li>
                    <li>• Gift shopping for special occasions</li>
                    <li>• Self-care appointments (haircut, massage)</li>
                    <li>• Personal goals and hobbies</li>
                  </ul>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3"><strong>Pro Tip:</strong> Set birthday reminders for 1 week before so you have time to shop</p>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    🏠 Household - Home & Maintenance
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Home repairs and maintenance</li>
                    <li>• Seasonal tasks (HVAC filter changes, gutter cleaning)</li>
                    <li>• Appliance servicing reminders</li>
                    <li>• Garden and lawn care</li>
                    <li>• Home improvement projects</li>
                  </ul>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3"><strong>Pro Tip:</strong> Use monthly repeats for maintenance tasks like changing air filters</p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-6">
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  <strong>🎯 Organization Strategy:</strong> Think of categories as "buckets" that group similar life areas together. This lets you focus on one area at a time (handle all bills at once, all health items together) rather than jumping between different types of reminders!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="priorities" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Using Priorities Effectively</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Priority levels help you focus on what actually matters. Here's how to use each level strategically:
              </p>

              <div className="space-y-4">
                <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-300 dark:border-red-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-3xl">🔴</span>
                    <h3 className="text-xl font-bold text-red-900 dark:text-red-100">Urgent Priority</h3>
                  </div>
                  <p className="text-red-800 dark:text-red-200 mb-3 font-semibold">Use for: Time-critical items that need immediate attention</p>
                  <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
                    <li>• Medication you need to take RIGHT NOW</li>
                    <li>• Bill due TODAY or tomorrow</li>
                    <li>• Appointment happening within hours</li>
                    <li>• Emergency or health-critical tasks</li>
                  </ul>
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-700 dark:text-gray-300"><strong>⚠️ Warning:</strong> If everything is Urgent, nothing is. Reserve this for genuine emergencies and time-critical items only!</p>
                  </div>
                </div>

                <div className="p-5 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-300 dark:border-orange-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-3xl">🟠</span>
                    <h3 className="text-xl font-bold text-orange-900 dark:text-orange-100">High Priority</h3>
                  </div>
                  <p className="text-orange-800 dark:text-orange-200 mb-3 font-semibold">Use for: Important items that should be handled soon</p>
                  <ul className="space-y-1 text-sm text-orange-800 dark:text-orange-200">
                    <li>• Bills due within a week</li>
                    <li>• Doctor appointments this week</li>
                    <li>• Important work deadlines</li>
                    <li>• Follow-ups that can't wait long</li>
                  </ul>
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-700 dark:text-gray-300"><strong>✅ Best Practice:</strong> Most of your actionable reminders should be High priority – important enough to do soon but not drop-everything urgent.</p>
                  </div>
                </div>

                <div className="p-5 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-3xl">🟡</span>
                    <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-100">Medium Priority</h3>
                  </div>
                  <p className="text-yellow-800 dark:text-yellow-200 mb-3 font-semibold">Use for: Standard reminders with some flexibility</p>
                  <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                    <li>• Routine appointments next month</li>
                    <li>• Household maintenance tasks</li>
                    <li>• Non-urgent shopping or errands</li>
                    <li>• Planning and preparation tasks</li>
                  </ul>
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-700 dark:text-gray-300"><strong>💡 Tip:</strong> Medium is your default for most reminders. Things you want to do but have flexibility on timing.</p>
                  </div>
                </div>

                <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-300 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-3xl">🟢</span>
                    <h3 className="text-xl font-bold text-green-900 dark:text-green-100">Low Priority</h3>
                  </div>
                  <p className="text-green-800 dark:text-green-200 mb-3 font-semibold">Use for: Nice-to-have items with no urgency</p>
                  <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                    <li>• "Someday" tasks with no deadline</li>
                    <li>• Annual renewals 6+ months away</li>
                    <li>• Ideas and considerations</li>
                    <li>• Long-term planning reminders</li>
                  </ul>
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-700 dark:text-gray-300"><strong>🌟 Strategy:</strong> Low priority keeps future ideas on your radar without cluttering your active reminders. Review monthly and upgrade if they become more urgent!</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  <strong>⚡ Priority Wisdom:</strong> Think of Urgent as "do now," High as "do today/this week," Medium as "do when you can," and Low as "nice to remember." Review and adjust priorities weekly – what's Medium on Monday might be Urgent by Friday!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="template-workflow" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Template Workflow</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Templates are more than just shortcuts – they're consistency builders. Here's how to maximize their power:
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">When Templates Shine</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">✨ Perfect For</h4>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Reminders you create often</li>
                    <li>• Standardized formats (bills, meds)</li>
                    <li>• Onboarding new household members</li>
                    <li>• Quick entry when you're busy</li>
                  </ul>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🎯 Skip Templates For</h4>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• One-time unique reminders</li>
                    <li>• Complex multi-step tasks</li>
                    <li>• When you need custom categories</li>
                    <li>• Experimental reminder types</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Building Consistent Habits with Templates</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Templates enforce consistency:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Medication Template:</strong> Always creates with Health category, High priority, so you never forget</li>
                <li><strong>Bill Template:</strong> Always Bills category, reminder 3 days before due, ensures you pay on time</li>
                <li><strong>Appointment Template:</strong> Consistent format makes it easy to scan your calendar</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Template Customization Workflow</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Click Template:</strong> Opens modal with pre-filled data</li>
                <li><strong>Add Specifics:</strong> Name, dosage, account number, etc.</li>
                <li><strong>Set Time:</strong> When you want to be reminded</li>
                <li><strong>Assign Person:</strong> Who's responsible (if not you)</li>
                <li><strong>Add Repeat if Needed:</strong> Daily meds, monthly bills</li>
                <li><strong>Save:</strong> Reminder created in seconds!</li>
              </ol>

              <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4 mt-6">
                <p className="text-pink-700 dark:text-pink-300 text-sm">
                  <strong>🚀 Power User Tip:</strong> Create your morning medication routine in under 2 minutes using templates: "Take Medication" template × 3 different meds = 3 perfect reminders with Health category, Urgent priority, and proper timing. No thinking required!</p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="overdue" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Managing Overdue Reminders</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Life happens, and sometimes reminders slip through the cracks. Here's how to prevent and handle reminder backlog:
              </p>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Identifying Overdue Reminders</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Dashboard Cards:</strong> "Overdue" stat shows count at a glance</li>
                <li><strong>Red Badges:</strong> Overdue reminders show red "Overdue" label</li>
                <li><strong>Filter View:</strong> Use filters to see ONLY overdue items</li>
                <li><strong>Sort by Date:</strong> Oldest overdue items appear first</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Triage Strategy for Backlog</h3>
              <div className="space-y-3">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">1️⃣ Do It Now (If Quick)</h4>
                  <p className="text-sm text-green-800 dark:text-green-200">If the reminder takes less than 5 minutes, just do it and mark complete</p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">2️⃣ Reschedule (If Still Relevant)</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Edit the reminder time to when you'll actually do it – be realistic!</p>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">3️⃣ Delete (If No Longer Needed)</h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200">That doctor appointment you never scheduled? Delete it or reschedule realistically</p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">4️⃣ Bulk Complete (If Done But Unmarked)</h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">Select all medications you took but forgot to mark – bulk complete them</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Preventing Future Backlog</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Daily Review:</strong> Spend 2 minutes each morning checking today's reminders</li>
                <li><strong>Mark as Complete Immediately:</strong> Don't wait – complete reminders right after doing them</li>
                <li><strong>Realistic Timing:</strong> Set reminder times when you'll actually be available</li>
                <li><strong>Use Snooze Wisely:</strong> If you can't do it now, snooze to a realistic time (not "later")</li>
                <li><strong>Weekly Cleanup:</strong> Every Sunday, review and triage any overdue items</li>
              </ul>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-6">
                <p className="text-red-700 dark:text-red-300 text-sm">
                  <strong>⚠️ Backlog Warning Signs:</strong> If you have 10+ overdue reminders, your system needs adjustment. Either you're creating too many reminders, setting unrealistic times, or not checking daily. Pick one issue to fix first!
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                <p className="text-green-700 dark:text-green-300 text-sm">
                  <strong>✅ Fresh Start:</strong> Feeling overwhelmed? Bulk complete everything over a week old (you either did it or it wasn't important), delete obvious non-starters, and reschedule anything still relevant. Clean slate, new habits!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>
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
  );
}
