/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';

import {
  type LucideIcon,
  ArrowLeft,
  Target,
  Play,
  Plus,
  Clock,
  Users,
  Grid3x3,
  MessageSquare,
  BarChart3,
  Lightbulb,
  Award,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Mic,
  Sparkles,
  FileText,
  Zap,
  Pin,
  LayoutGrid,
  List,
  Flame,
  Volume2,
  Settings,
  Heart,
  BookOpen,
  Activity,
  Hash,
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
    color: 'from-indigo-500 to-indigo-600',
    articles: [
      {
        title: 'Introduction to Goals & Milestones',
        description: 'Learn how Rowan helps you set, track, and achieve your shared goals with powerful features',
        readTime: '5 min read',
        href: '#intro',
      },
      {
        title: 'Understanding the Four View Modes',
        description: 'Master Goals, Milestones, Habits, and Activity views for complete goal management',
        readTime: '4 min read',
        href: '#view-modes',
      },
      {
        title: 'Creating Your First Goal',
        description: 'Quick guide to setting up goals with templates or manual setup',
        readTime: '5 min read',
        href: '#first-goal',
      },
      {
        title: 'Understanding Goal Status & Progress',
        description: 'How colored checkboxes show goal status: Not Started, In Progress, and Completed',
        readTime: '3 min read',
        href: '#status-indicators',
      },
      {
        title: 'Setting Up Your First Milestone',
        description: 'Break down goals into achievable milestones with tracking and celebrations',
        readTime: '4 min read',
        href: '#first-milestone',
      },
    ],
  },
  {
    title: 'Goal Creation & Management',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Template-Based Goal Creation',
        description: 'Use pre-built templates across 8 categories with auto-generated milestones',
        readTime: '6 min read',
        href: '#template-goals',
      },
      {
        title: 'Manual Goal Creation',
        description: 'Create custom goals from scratch with complete control over details',
        readTime: '4 min read',
        href: '#manual-creation',
      },
      {
        title: 'Goal Categories & Organization',
        description: 'Organize goals with categories, priorities, and pinning for better focus',
        readTime: '5 min read',
        href: '#goal-organization',
      },
      {
        title: 'Priority & Pin System',
        description: 'Use P1-P4 priorities and pinning to keep important goals at the top',
        readTime: '4 min read',
        href: '#priorities-pins',
      },
      {
        title: 'Focus Mode for Better Concentration',
        description: 'Hide distractions and focus on your top 3 most important goals',
        readTime: '3 min read',
        href: '#focus-mode',
      },
    ],
  },
  {
    title: 'Check-Ins & Progress Tracking',
    icon: CheckCircle2,
    color: 'from-green-500 to-green-600',
    articles: [
      {
        title: 'Goal Check-Ins Overview',
        description: 'Regular progress updates with mood tracking, notes, and voice recordings',
        readTime: '6 min read',
        href: '#check-ins-overview',
      },
      {
        title: 'Advanced Voice Check-Ins',
        description: 'Record structured voice notes with templates, transcription, and playback controls',
        readTime: '7 min read',
        href: '#voice-checkins',
      },
      {
        title: 'Check-In Frequency & Reminders',
        description: 'Set up automated reminders for daily, weekly, or monthly check-ins',
        readTime: '5 min read',
        href: '#checkin-frequency',
      },
      {
        title: 'Progress Photos & Visual Tracking',
        description: 'Document your journey with progress photos and visual evidence',
        readTime: '4 min read',
        href: '#progress-photos',
      },
      {
        title: 'Check-In History Timeline',
        description: 'Review your entire goal journey with a visual timeline of all check-ins',
        readTime: '5 min read',
        href: '#checkin-history',
      },
      {
        title: 'Mood Tracking & Emotional Wellness',
        description: 'Track how you feel about your goals with emoji mood indicators',
        readTime: '3 min read',
        href: '#mood-tracking',
      },
    ],
  },
  {
    title: 'Milestones & Achievements',
    icon: Award,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Creating & Managing Milestones',
        description: 'Set up milestones with percentage, count, money, or date-based tracking',
        readTime: '6 min read',
        href: '#milestone-management',
      },
      {
        title: 'Milestone Celebrations',
        description: 'Automatic celebrations with confetti, achievements, and motivational messages',
        readTime: '4 min read',
        href: '#milestone-celebrations',
      },
      {
        title: 'Milestone Types & Tracking',
        description: 'Understand percentage, count, money, and date-based milestone tracking',
        readTime: '5 min read',
        href: '#milestone-types',
      },
      {
        title: 'Achievement Wall',
        description: 'View all your completed milestones in a visual achievement gallery',
        readTime: '3 min read',
        href: '#achievement-wall',
      },
    ],
  },
  {
    title: 'Habit Tracking',
    icon: Flame,
    color: 'from-orange-500 to-orange-600',
    articles: [
      {
        title: 'Daily Habit Tracking',
        description: 'Build consistent habits with daily completion tracking and visual progress',
        readTime: '6 min read',
        href: '#daily-habits',
      },
      {
        title: 'Habit Categories & Organization',
        description: 'Organize habits by Health, Learning, Productivity, Mindfulness, and more',
        readTime: '4 min read',
        href: '#habit-categories',
      },
      {
        title: 'Streak Tracking & Analytics',
        description: 'Monitor current streaks, best streaks, and completion rates over time',
        readTime: '5 min read',
        href: '#habit-streaks',
      },
      {
        title: 'Habit Calendar Views',
        description: 'View habits in Today, Week, and Month views for different perspectives',
        readTime: '4 min read',
        href: '#habit-calendar',
      },
      {
        title: 'Habit Analytics & Insights',
        description: 'Understand your patterns with completion rates and trend analysis',
        readTime: '5 min read',
        href: '#habit-analytics',
      },
    ],
  },
  {
    title: 'Collaboration & Activity',
    icon: Users,
    color: 'from-emerald-500 to-emerald-600',
    articles: [
      {
        title: 'Real-Time Collaboration',
        description: 'See who\'s viewing goals, get instant updates, and track presence indicators',
        readTime: '5 min read',
        href: '#collaboration',
      },
      {
        title: 'Activity Feed & Updates',
        description: 'Stay informed with real-time activity feeds showing all goal-related actions',
        readTime: '4 min read',
        href: '#activity-feed',
      },
      {
        title: 'Comments & Reactions',
        description: 'Communicate with emoji reactions, threaded comments, and @mentions',
        readTime: '5 min read',
        href: '#comments-reactions',
      },
      {
        title: 'Partner Support & Help Requests',
        description: 'Request help from your partner when facing challenges or blockers',
        readTime: '4 min read',
        href: '#partner-support',
      },
      {
        title: 'Shared Goal Visibility',
        description: 'Control who can see your goals and collaborate on shared objectives',
        readTime: '3 min read',
        href: '#shared-visibility',
      },
    ],
  },
  {
    title: 'Advanced Features',
    icon: Sparkles,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Voice Note Templates & Transcription',
        description: 'Use structured templates for voice check-ins with automatic transcription',
        readTime: '7 min read',
        href: '#voice-templates',
      },
      {
        title: 'Search & Filtering',
        description: 'Find goals quickly with powerful search and filtering capabilities',
        readTime: '4 min read',
        href: '#search-filtering',
      },
      {
        title: 'Statistics Dashboard',
        description: 'Track overall progress with active goals, completion rates, and milestone stats',
        readTime: '5 min read',
        href: '#statistics',
      },
      {
        title: 'Drag & Drop Reordering',
        description: 'Visually organize your goals by dragging them into priority order',
        readTime: '3 min read',
        href: '#drag-drop',
      },
      {
        title: 'Goal Templates & Quick Creation',
        description: 'Speed up goal creation with smart templates and one-click setup',
        readTime: '5 min read',
        href: '#quick-creation',
      },
    ],
  },
];

export default function GoalsDocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-indigo-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Goals & Milestones Guide
              </h1>
              <p className="text-gray-400 mt-1">
                Complete guide to setting, tracking, and achieving your shared goals
              </p>
            </div>
          </div>

          <div className="bg-indigo-900/20 border border-indigo-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-indigo-100 mb-2">
                  Welcome to Goals & Milestones
                </h3>
                <p className="text-indigo-200 mb-3">
                  Rowan helps you achieve your dreams together with comprehensive goal tracking:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-indigo-300">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Smart Goals</strong> - Templates and manual setup</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Milestones</strong> - Break goals into achievable steps with celebrations</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Flame className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Habits</strong> - Daily tracking with streaks and analytics</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Check-ins</strong> - Progress updates with mood and voice notes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mic className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Voice notes</strong> - Advanced recording with transcription</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Real-time</strong> - Live collaboration and activity feeds</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BarChart3 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Analytics</strong> - Visual stats and progress insights</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Pin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Focus mode</strong> - Priority management and distraction reduction</span>
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
                        <span className="text-xs text-indigo-400 font-medium">
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
              <Play className="w-8 h-8 text-indigo-500" />
              Introduction to Goals & Milestones
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Rowan's Goals & Milestones feature is your comprehensive goal achievement system. Whether you're pursuing personal growth, shared relationship goals, or building consistent habits, we've created powerful tools to help you succeed together.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Key Features at a Glance</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Four View Modes:</strong> Goals, Milestones, Habits, and Activity views for complete goal management</li>
                <li><strong>Smart Goal Creation:</strong> Templates or manual setup with pre-built milestones</li>
                <li><strong>Advanced Check-ins:</strong> Progress tracking with mood, notes, voice recordings, and photos</li>
                <li><strong>Milestone Celebrations:</strong> Automatic achievements with confetti and motivational messages</li>
                <li><strong>Habit Tracking:</strong> Daily habits with streak tracking and completion analytics</li>
                <li><strong>Voice Notes:</strong> Advanced recording with templates, transcription, and playback controls</li>
                <li><strong>Real-Time Collaboration:</strong> Live presence indicators and instant updates</li>
                <li><strong>Priority & Focus Systems:</strong> P1-P4 priorities and Focus Mode for better concentration</li>
                <li><strong>Activity Feeds:</strong> Real-time tracking of all goal-related activities</li>
                <li><strong>Statistics Dashboard:</strong> Visual progress tracking with completion rates and trends</li>
              </ul>
              <div className="mt-6 p-4 bg-indigo-900/20 border border-indigo-800 rounded-lg">
                <p className="text-indigo-200 text-sm">
                  <strong>💡 Pro Tip:</strong> Browse our <a href="#template-goals" className="text-indigo-400 underline">template library</a> for quick setup, or create custom goals manually for complete control.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="view-modes" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Understanding the Four View Modes</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                The Goals page offers four distinct views, each optimized for different aspects of goal management:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <div className="p-6 bg-indigo-900/20 rounded-xl border border-indigo-800">
                  <div className="flex items-center gap-3 mb-4">
                    <LayoutGrid className="w-8 h-8 text-indigo-600" />
                    <h3 className="text-2xl font-bold text-white">Goals View</h3>
                  </div>
                  <p className="text-gray-300 mb-4"><strong>Your main goal management dashboard</strong></p>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✓ Interactive goal cards with progress tracking</li>
                    <li>✓ Drag & drop reordering</li>
                    <li>✓ Status filters (All, Active, Completed)</li>
                    <li>✓ Focus Mode for top 3 goals</li>
                    <li>✓ Priority badges (P1-P4)</li>
                    <li>✓ Real-time collaboration indicators</li>
                  </ul>
                </div>

                <div className="p-6 bg-purple-900/20 rounded-xl border border-purple-800">
                  <div className="flex items-center gap-3 mb-4">
                    <List className="w-8 h-8 text-purple-600" />
                    <h3 className="text-2xl font-bold text-white">Milestones View</h3>
                  </div>
                  <p className="text-gray-300 mb-4"><strong>Your achievement wall</strong></p>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✓ All milestones across all goals</li>
                    <li>✓ Visual completion status</li>
                    <li>✓ Related goal associations</li>
                    <li>✓ Celebration animations</li>
                    <li>✓ Progress tracking</li>
                    <li>✓ Searchable milestone library</li>
                  </ul>
                </div>

                <div className="p-6 bg-orange-900/20 rounded-xl border border-orange-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Flame className="w-8 h-8 text-orange-600" />
                    <h3 className="text-2xl font-bold text-white">Habits View</h3>
                  </div>
                  <p className="text-gray-300 mb-4"><strong>Daily habit tracking system</strong></p>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✓ Today, Week, Month calendar views</li>
                    <li>✓ Streak tracking and analytics</li>
                    <li>✓ Category filtering</li>
                    <li>✓ Completion rate statistics</li>
                    <li>✓ Visual progress indicators</li>
                    <li>✓ Quick daily completion toggles</li>
                  </ul>
                </div>

                <div className="p-6 bg-emerald-900/20 rounded-xl border border-emerald-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="w-8 h-8 text-emerald-600" />
                    <h3 className="text-2xl font-bold text-white">Activity View</h3>
                  </div>
                  <p className="text-gray-300 mb-4"><strong>Real-time activity feed</strong></p>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✓ All goal-related activities</li>
                    <li>✓ User action tracking</li>
                    <li>✓ Timestamps and descriptions</li>
                    <li>✓ Comments and reactions</li>
                    <li>✓ Collaborative updates</li>
                    <li>✓ Filterable activity stream</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                <p className="text-green-200 text-sm">
                  <strong>🎯 Quick Switch:</strong> Use the segmented buttons at the top of the Goals page to quickly switch between view modes. Each view is optimized for different aspects of your goal journey.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="first-goal" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Creating Your First Goal</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Rowan offers three ways to create goals, each designed for different preferences and experience levels:
              </p>

              <div className="space-y-6">
                <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-800">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    1. Template-Based Creation (Recommended for Beginners)
                  </h3>
                  <p className="text-gray-300 mb-3">
                    Choose from pre-built goal templates across 8 categories with auto-generated milestones.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                    <div>• <strong>Financial:</strong> Savings, debt reduction, investments</div>
                    <div>• <strong>Health:</strong> Fitness, nutrition, wellness</div>
                    <div>• <strong>Home:</strong> Organization, improvements, maintenance</div>
                    <div>• <strong>Relationship:</strong> Communication, quality time, growth</div>
                    <div>• <strong>Career:</strong> Skills, promotions, networking</div>
                    <div>• <strong>Personal:</strong> Hobbies, self-care, learning</div>
                    <div>• <strong>Education:</strong> Courses, certifications, reading</div>
                    <div>• <strong>Family:</strong> Parenting, traditions, activities</div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-800/30 rounded-lg">
                    <p className="text-blue-200 text-sm">
                      <strong>How to:</strong> Click "New Goal" → Browse templates → Select category → Choose template → Customize details → Create goal
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-green-900/20 rounded-xl border border-green-800">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <Target className="w-6 h-6 text-green-600" />
                    2. Guided Creation Flow (Perfect for First-Time Users)
                  </h3>
                  <p className="text-gray-300 mb-3">
                    Step-by-step wizard that appears automatically when you have no goals, or can be manually triggered.
                  </p>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div>• Interactive goal-setting questions</div>
                    <div>• Smart suggestions based on your responses</div>
                    <div>• Automatic milestone generation</div>
                    <div>• Built-in best practices and tips</div>
                    <div>• Progress tracking setup</div>
                  </div>
                  <div className="mt-4 p-3 bg-green-800/30 rounded-lg">
                    <p className="text-green-200 text-sm">
                      <strong>How to:</strong> Visit Goals page → Click "New Goal" → Choose from templates or create manually
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-purple-900/20 rounded-xl border border-purple-800">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <Plus className="w-6 h-6 text-purple-600" />
                    3. Manual Creation (For Experienced Users)
                  </h3>
                  <p className="text-gray-300 mb-3">
                    Create completely custom goals from scratch with full control over all details.
                  </p>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div>• <strong>Title:</strong> Clear, specific goal name</div>
                    <div>• <strong>Description:</strong> Detailed explanation and context</div>
                    <div>• <strong>Category:</strong> Organization and filtering</div>
                    <div>• <strong>Target Date:</strong> Deadline for completion</div>
                    <div>• <strong>Visibility:</strong> Private or shared with partner</div>
                    <div>• <strong>Initial Progress:</strong> Starting percentage if applicable</div>
                  </div>
                  <div className="mt-4 p-3 bg-purple-800/30 rounded-lg">
                    <p className="text-purple-200 text-sm">
                      <strong>How to:</strong> Click "New Goal" → "Create from Scratch" → Fill in custom details → Save goal
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <p className="text-yellow-200 text-sm">
                  <strong>⚡ Quick Tip:</strong> New to goal setting? Start with templates to see examples of well-structured goals, then graduate to manual creation as you become more comfortable.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="status-indicators" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Understanding Goal Status & Progress</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Rowan uses intuitive visual indicators to show the status and progress of your goals at a glance.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                <div className="p-6 bg-red-900/20 rounded-xl border border-red-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full border-2 border-red-500"></div>
                    <h3 className="text-xl font-bold text-white">Not Started</h3>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Empty red circle checkbox</li>
                    <li>• 0% progress</li>
                    <li>• Goal is created but no work begun</li>
                    <li>• Click checkbox to move to In Progress</li>
                  </ul>
                </div>

                <div className="p-6 bg-amber-900/20 rounded-xl border border-amber-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                    <h3 className="text-xl font-bold text-white">In Progress</h3>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Filled amber circle</li>
                    <li>• 1-99% progress</li>
                    <li>• Active work in progress</li>
                    <li>• Click checkbox to mark Completed</li>
                  </ul>
                </div>

                <div className="p-6 bg-green-900/20 rounded-xl border border-green-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Completed</h3>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Green checkmark</li>
                    <li>• 100% progress</li>
                    <li>• Goal achieved!</li>
                    <li>• Click checkbox to cycle back to Not Started</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Progress Tracking</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Progress Bar Colors</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-2 bg-gray-700 rounded-full"></div>
                      <span>0% - Gray (Not started)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-2 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
                      <span>1-74% - Blue (In progress)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-2 bg-gradient-to-r from-green-400 to-green-500 rounded-full"></div>
                      <span>75-100% - Green (Near completion)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Progress Updates</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div>• <strong>Check-ins:</strong> Update progress percentage with notes and photos</div>
                    <div>• <strong>Milestone completion:</strong> Automatic progress updates</div>
                    <div>• <strong>Manual updates:</strong> Edit goal directly to adjust progress</div>
                    <div>• <strong>Status changes:</strong> Checkbox clicks cycle through statuses</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-indigo-900/20 border border-indigo-800 rounded-lg">
                <p className="text-indigo-200 text-sm">
                  <strong>💡 Progress Tip:</strong> Regular check-ins help maintain momentum and provide accurate progress tracking. Set up <a href="#checkin-frequency" className="text-indigo-400 underline">automatic reminders</a> to stay consistent.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="voice-checkins" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Mic className="w-8 h-8 text-green-500" />
              Advanced Voice Check-Ins
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Voice check-ins provide a natural, conversational way to track your goal progress. Rowan's advanced voice recorder includes professional features like waveform visualization, templates, and automatic transcription.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-4">Voice Note Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <div className="p-6 bg-green-900/20 rounded-xl border border-green-800">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    <h4 className="text-lg font-bold text-white">Progress Update</h4>
                  </div>
                  <p className="text-gray-300 mb-3 text-sm">
                    Share what progress you've made since your last check-in
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>• What specific actions did you take?</div>
                    <div>• What results did you achieve?</div>
                    <div>• How do you feel about your progress?</div>
                  </div>
                </div>

                <div className="p-6 bg-red-900/20 rounded-xl border border-red-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-6 h-6 text-red-600" />
                    <h4 className="text-lg font-bold text-white">Challenges & Blockers</h4>
                  </div>
                  <p className="text-gray-300 mb-3 text-sm">
                    Reflect on any challenges or obstacles you've encountered
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>• What challenges are you facing?</div>
                    <div>• What's preventing you from moving forward?</div>
                    <div>• What support or resources do you need?</div>
                  </div>
                </div>

                <div className="p-6 bg-purple-900/20 rounded-xl border border-purple-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Heart className="w-6 h-6 text-purple-600" />
                    <h4 className="text-lg font-bold text-white">Personal Reflection</h4>
                  </div>
                  <p className="text-gray-300 mb-3 text-sm">
                    Take a moment to reflect on your goal journey
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>• How has this goal impacted you personally?</div>
                    <div>• What have you learned about yourself?</div>
                    <div>• What would you do differently?</div>
                  </div>
                </div>

                <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-6 h-6 text-blue-600" />
                    <h4 className="text-lg font-bold text-white">Next Steps Planning</h4>
                  </div>
                  <p className="text-gray-300 mb-3 text-sm">
                    Plan your next steps and set intentions
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>• What will you focus on next?</div>
                    <div>• What are your priorities for the coming period?</div>
                    <div>• How will you measure success?</div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Advanced Recording Features</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Volume2 className="w-5 h-5" />
                    WaveSurfer.js Integration
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                    <div>• Visual waveform display</div>
                    <div>• Precise playback controls</div>
                    <div>• Speed adjustment (0.5x to 2x)</div>
                    <div>• Skip forward/backward (10 seconds)</div>
                    <div>• Volume control slider</div>
                    <div>• Seek to any position</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Automatic Transcription
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                    <div>• Speech-to-text conversion</div>
                    <div>• Confidence scoring</div>
                    <div>• Keyword extraction</div>
                    <div>• Searchable transcriptions</div>
                    <div>• Multiple language support</div>
                    <div>• Text editing capability</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Professional Recording
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                    <div>• Echo cancellation</div>
                    <div>• Noise suppression</div>
                    <div>• Auto gain control</div>
                    <div>• High-quality audio (44.1kHz)</div>
                    <div>• Live recording visualization</div>
                    <div>• Duration tracking</div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">How to Record Voice Check-ins</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <p><strong>Start Check-in:</strong> Click "Check In" on any goal card</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <p><strong>Choose Template (Optional):</strong> Select a voice note template or record freeform</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <p><strong>Record:</strong> Click the red microphone button and speak naturally</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <div>
                    <p><strong>Review:</strong> Listen back with professional playback controls</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                  <div>
                    <p><strong>Transcribe (Optional):</strong> Click "Transcribe" for text conversion</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
                  <div>
                    <p><strong>Save:</strong> Click "Send Check-In" to save with your progress update</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                <p className="text-green-200 text-sm">
                  <strong>🎙️ Voice Tip:</strong> Speak naturally and take your time. The templates provide guided questions, but feel free to add your own thoughts and insights. Transcription makes your voice notes searchable later!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="milestone-management" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Award className="w-8 h-8 text-purple-500" />
              Creating & Managing Milestones
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Milestones break down large goals into achievable steps, providing motivation and clear progress markers. Rowan supports four types of milestone tracking to match different goal types.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-4">Milestone Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Hash className="w-6 h-6 text-blue-600" />
                    <h4 className="text-lg font-bold text-white">Percentage-Based</h4>
                  </div>
                  <p className="text-gray-300 mb-3 text-sm">
                    Track progress as a percentage of completion (0-100%)
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>• "Complete 25% of home renovation"</div>
                    <div>• "Finish 50% of online course"</div>
                    <div>• "Reach 75% of fundraising goal"</div>
                  </div>
                </div>

                <div className="p-6 bg-green-900/20 rounded-xl border border-green-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Hash className="w-6 h-6 text-green-600" />
                    <h4 className="text-lg font-bold text-white">Count-Based</h4>
                  </div>
                  <p className="text-gray-300 mb-3 text-sm">
                    Track specific numbers or quantities
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>• "Read 5 of 12 books"</div>
                    <div>• "Complete 10 of 20 workouts"</div>
                    <div>• "Visit 3 of 8 museums"</div>
                  </div>
                </div>

                <div className="p-6 bg-emerald-900/20 rounded-xl border border-emerald-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Hash className="w-6 h-6 text-emerald-600" />
                    <h4 className="text-lg font-bold text-white">Money-Based</h4>
                  </div>
                  <p className="text-gray-300 mb-3 text-sm">
                    Track financial targets and amounts
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>• "Save $2,500 of $10,000"</div>
                    <div>• "Pay off $5,000 of debt"</div>
                    <div>• "Raise $1,000 for charity"</div>
                  </div>
                </div>

                <div className="p-6 bg-purple-900/20 rounded-xl border border-purple-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-purple-600" />
                    <h4 className="text-lg font-bold text-white">Date-Based</h4>
                  </div>
                  <p className="text-gray-300 mb-3 text-sm">
                    Track completion by specific target dates
                  </p>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>• "Submit application by March 15"</div>
                    <div>• "Complete phase 1 by quarter end"</div>
                    <div>• "Launch product by December"</div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Creating Milestones</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <p><strong>Access Milestones View:</strong> Click the "Milestones" tab in the Goals page</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <p><strong>Create New Milestone:</strong> Click "New Milestone" button</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <p><strong>Choose Goal:</strong> Select which goal this milestone belongs to</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <div>
                    <p><strong>Set Details:</strong> Add title, description, and choose milestone type</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                  <div>
                    <p><strong>Define Target:</strong> Set target value (percentage, count, amount, or date)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
                  <div>
                    <p><strong>Save Milestone:</strong> Click "Create Milestone" to add to your goal</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Milestone Completion</h3>
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-300">
                  <div>
                    <h4 className="font-semibold text-white mb-2">Marking Complete</h4>
                    <div>• Click the checkbox on milestone cards</div>
                    <div>• Automatic progress updates to parent goal</div>
                    <div>• Celebration animation triggers</div>
                    <div>• Timestamps recorded for completion</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-2">Editing Milestones</h4>
                    <div>• Click edit button on milestone cards</div>
                    <div>• Update title, description, or targets</div>
                    <div>• Change milestone type if needed</div>
                    <div>• Delete milestones no longer relevant</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-purple-900/20 border border-purple-800 rounded-lg">
                <p className="text-purple-200 text-sm">
                  <strong>🏆 Milestone Strategy:</strong> Create 3-7 milestones per goal for optimal motivation. Space them evenly and celebrate each completion! The achievement celebrations help maintain momentum.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="daily-habits" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-500" />
              Daily Habit Tracking
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                The Habits view provides a dedicated system for tracking daily habits with streak counting, analytics, and multiple calendar perspectives. Perfect for building consistent behaviors that support your larger goals.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-4">Habit Dashboard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
                <div className="p-4 bg-blue-900/20 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-white">Total Habits</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">12</p>
                  <p className="text-xs text-gray-400">Active habits tracked</p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-xl border border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h4 className="font-bold text-white">Today's Progress</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">8/12</p>
                  <p className="text-xs text-gray-400">Completed today</p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-xl border border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <h4 className="font-bold text-white">Completion Rate</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">87%</p>
                  <p className="text-xs text-gray-400">30-day average</p>
                </div>

                <div className="p-4 bg-orange-900/20 rounded-xl border border-orange-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-5 h-5 text-orange-600" />
                    <h4 className="font-bold text-white">Active Streaks</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">5</p>
                  <p className="text-xs text-gray-400">Ongoing streaks</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">View Modes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <h4 className="text-lg font-bold text-white">Today View</h4>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Grid of all habits for today</li>
                    <li>• Quick completion toggles</li>
                    <li>• Current streak display</li>
                    <li>• Completion rate statistics</li>
                    <li>• Category badges</li>
                    <li>• Progress indicators</li>
                  </ul>
                </div>

                <div className="p-6 bg-purple-900/20 rounded-xl border border-purple-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-purple-600" />
                    <h4 className="text-lg font-bold text-white">Week View</h4>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• 7-day calendar grid</li>
                    <li>• Historical completion data</li>
                    <li>• Pattern recognition</li>
                    <li>• Week navigation controls</li>
                    <li>• Streak visualization</li>
                    <li>• Miss pattern analysis</li>
                  </ul>
                </div>

                <div className="p-6 bg-green-900/20 rounded-xl border border-green-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Grid3x3 className="w-6 h-6 text-green-600" />
                    <h4 className="text-lg font-bold text-white">Month View</h4>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Full month calendar</li>
                    <li>• Long-term pattern view</li>
                    <li>• Monthly statistics</li>
                    <li>• Trend identification</li>
                    <li>• Seasonal patterns</li>
                    <li>• Goal correlation</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Habit Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6 text-sm">
                <div className="p-3 bg-green-900/20 rounded-lg border border-green-800">
                  <div className="font-semibold text-white">💪 Health & Fitness</div>
                  <div className="text-gray-400">Exercise, nutrition, wellness</div>
                </div>
                <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-800">
                  <div className="font-semibold text-white">📚 Learning</div>
                  <div className="text-gray-400">Reading, courses, skills</div>
                </div>
                <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-800">
                  <div className="font-semibold text-white">⚡ Productivity</div>
                  <div className="text-gray-400">Work, organization, efficiency</div>
                </div>
                <div className="p-3 bg-indigo-900/20 rounded-lg border border-indigo-800">
                  <div className="font-semibold text-white">🧘 Mindfulness</div>
                  <div className="text-gray-400">Meditation, gratitude, reflection</div>
                </div>
                <div className="p-3 bg-pink-900/20 rounded-lg border border-pink-800">
                  <div className="font-semibold text-white">🎨 Creativity</div>
                  <div className="text-gray-400">Art, writing, hobbies</div>
                </div>
                <div className="p-3 bg-orange-900/20 rounded-lg border border-orange-800">
                  <div className="font-semibold text-white">👥 Social</div>
                  <div className="text-gray-400">Relationships, networking, family</div>
                </div>
                <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-800">
                  <div className="font-semibold text-white">💰 Finance</div>
                  <div className="text-gray-400">Budgeting, saving, investing</div>
                </div>
                <div className="p-3 bg-gray-900/20 rounded-lg border border-gray-800">
                  <div className="font-semibold text-white">📋 General</div>
                  <div className="text-gray-400">Other personal habits</div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Tracking Habits Daily</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <p><strong>Access Habits View:</strong> Click the "Habits" tab in the Goals page</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <p><strong>Review Today's Habits:</strong> See all habits scheduled for today in card format</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <p><strong>Mark Complete:</strong> Click the completion button on each habit card</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <div>
                    <p><strong>View Progress:</strong> See updated streak counts and completion rates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                  <div>
                    <p><strong>Filter by Category:</strong> Use category filter to focus on specific habit types</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-orange-900/20 border border-orange-800 rounded-lg">
                <p className="text-orange-200 text-sm">
                  <strong>🔥 Streak Building:</strong> Consistency beats perfection! Focus on building small streaks first. Missing one day won't break your progress - just get back on track the next day.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="collaboration" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-500" />
              Real-Time Collaboration
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Goals are more achievable when you work together. Rowan's real-time collaboration features keep you and your partner connected throughout your goal journey.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-4">Live Presence Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                <div className="p-6 bg-emerald-900/20 rounded-xl border border-emerald-800">
                  <h4 className="text-lg font-bold text-white mb-3">Online Users Display</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• See who's currently viewing the Goals page</li>
                    <li>• User count indicator in page header</li>
                    <li>• Real-time updates when users join/leave</li>
                    <li>• Partner activity notifications</li>
                  </ul>
                </div>

                <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-800">
                  <h4 className="text-lg font-bold text-white mb-3">Goal-Level Presence</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• See who's viewing the same goal as you</li>
                    <li>• Avatar indicators on goal cards</li>
                    <li>• Collaborative editing awareness</li>
                    <li>• Prevent conflicting updates</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Real-Time Updates</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Instant Synchronization</h4>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                    <div>• Goal creation and updates</div>
                    <div>• Progress changes and check-ins</div>
                    <div>• Milestone completions</div>
                    <div>• Priority and pin changes</div>
                    <div>• Status updates</div>
                    <div>• Comments and reactions</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Notification System</h4>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                    <div>• Toast notifications for partner actions</div>
                    <div>• Activity feed updates</div>
                    <div>• Help request alerts</div>
                    <div>• Milestone celebration sharing</div>
                    <div>• Comment mentions (@partner)</div>
                    <div>• Check-in reminder notifications</div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Partner Support Features</h3>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-800">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-yellow-600" />
                    Help Requests
                  </h4>
                  <p className="text-gray-300 text-sm mb-2">
                    When facing challenges, you can request support from your partner:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                    <div>• Toggle help request in check-ins</div>
                    <div>• Automatic partner notification</div>
                    <div>• Contextual goal information shared</div>
                    <div>• Encouragement and advice tracking</div>
                  </div>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    Comments & Reactions
                  </h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Communicate and encourage through the activity feed:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
                    <div>• Comment on activities and updates</div>
                    <div>• React with 7+ emoji options</div>
                    <div>• Threaded comment conversations</div>
                    <div>• @mention your partner for notifications</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-800 rounded-lg">
                <p className="text-emerald-200 text-sm">
                  <strong>🤝 Collaboration Tip:</strong> Regular check-ins and encouragement make a huge difference! Use the activity feed to celebrate each other's progress and offer support during challenges.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="statistics" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-pink-500" />
              Statistics Dashboard
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Track your overall progress with visual statistics that show your goal achievement patterns and motivation trends.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
                <div className="p-6 bg-indigo-900/20 rounded-xl border border-indigo-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">12</p>
                      <p className="text-sm text-gray-400">Active Goals</p>
                    </div>
                  </div>
                  <div className="text-xs text-indigo-400">
                    Goals currently being worked on
                  </div>
                </div>

                <div className="p-6 bg-blue-900/20 rounded-xl border border-blue-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">8</p>
                      <p className="text-sm text-gray-400">In Progress</p>
                    </div>
                  </div>
                  <div className="text-xs text-blue-400">
                    Goals with measurable progress
                  </div>
                </div>

                <div className="p-6 bg-purple-900/20 rounded-xl border border-purple-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">23</p>
                      <p className="text-sm text-gray-400">Milestones</p>
                    </div>
                  </div>
                  <div className="text-xs text-purple-400">
                    Total milestones achieved
                  </div>
                </div>

                <div className="p-6 bg-green-900/20 rounded-xl border border-green-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">7</p>
                      <p className="text-sm text-gray-400">Completed</p>
                    </div>
                  </div>
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>37% success rate</span>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Understanding Your Progress</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Success Rate Calculation</h4>
                  <p className="text-sm text-gray-300 mb-2">
                    Your completion percentage is calculated as: <strong>Completed Goals ÷ (Active Goals + Completed Goals)</strong>
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3 text-xs text-gray-400">
                    <div className="p-2 bg-green-900/30 rounded">
                      <strong>67%+:</strong> Excellent! 🎉
                    </div>
                    <div className="p-2 bg-yellow-900/30 rounded">
                      <strong>34-66%:</strong> Good progress
                    </div>
                    <div className="p-2 bg-gray-800 rounded">
                      <strong>&lt;34%:</strong> Getting started
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-2">Monthly Progress Tracking</h4>
                  <p className="text-sm text-gray-300 mb-2">
                    Statistics are calculated for the current month and updated in real-time.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs text-gray-400">
                    <div>• Goals created this month</div>
                    <div>• Goals completed this month</div>
                    <div>• Milestones achieved this month</div>
                    <div>• Check-ins logged this month</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-pink-900/20 border border-pink-800 rounded-lg">
                <p className="text-pink-200 text-sm">
                  <strong>📊 Analytics Insight:</strong> Focus on consistency over perfection. Small, regular progress on multiple goals often leads to better outcomes than sporadic intense efforts on single goals.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

        </div>

        {/* Quick Links */}
        <div className="mt-12 p-6 bg-indigo-900/40 backdrop-blur-md border border-indigo-800/50 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Link href="/goals" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
              <Target className="w-4 h-4" />
              Goals Page
            </Link>
            <a href="#template-goals" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
              <BookOpen className="w-4 h-4" />
              Templates
            </a>
            <a href="#voice-checkins" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
              <Mic className="w-4 h-4" />
              Voice Notes
            </a>
            <a href="#daily-habits" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300">
              <Flame className="w-4 h-4" />
              Habits
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
