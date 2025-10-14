'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Zap,
  Calendar,
  TrendingUp,
  Users,
  MessageCircle,
  BarChart3,
  Clock,
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
        title: 'Introduction to Daily Check-Ins',
        description: 'Learn how Rowan helps you track emotional wellness and connect with your partner',
        readTime: '3 min read',
        href: '#intro',
      },
      {
        title: 'Creating Your First Check-In',
        description: 'Quick guide to selecting your mood and adding context to start tracking',
        readTime: '4 min read',
        href: '#first-checkin',
      },
      {
        title: 'Understanding the 5-Mood System',
        description: 'How Great, Good, Okay, Meh, and Rough moods help you track emotional patterns',
        readTime: '3 min read',
        href: '#mood-system',
      },
      {
        title: 'Smart Prompts Explained',
        description: 'How check-in prompts adapt based on your mood selection',
        readTime: '3 min read',
        href: '#smart-prompts',
      },
      {
        title: 'Building Your Streak',
        description: 'Why daily consistency matters and how streaks help build healthy habits',
        readTime: '3 min read',
        href: '#streaks',
      },
    ],
  },
  {
    title: 'Partner Connection',
    icon: Users,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Seeing Your Partner\'s Mood',
        description: 'Real-time mood visibility lets you check in on each other at a glance',
        readTime: '2 min read',
        href: '#partner-mood',
      },
      {
        title: 'Sending Reactions',
        description: 'Send hearts, hugs, and strength reactions to support your partner',
        readTime: '3 min read',
        href: '#reactions',
      },
      {
        title: 'Understanding Partner Notifications',
        description: 'Get notified when your partner needs extra support on tough days',
        readTime: '3 min read',
        href: '#notifications',
      },
      {
        title: 'Privacy & Visibility',
        description: 'Your check-ins are private between you and your partner only',
        readTime: '2 min read',
        href: '#privacy',
      },
    ],
  },
  {
    title: 'Journal & History',
    icon: Calendar,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Calendar View',
        description: 'See both your and your partner\'s moods for the entire month at a glance',
        readTime: '3 min read',
        href: '#calendar-view',
      },
      {
        title: 'List View',
        description: 'Detailed chronological list with all notes, highlights, and challenges',
        readTime: '3 min read',
        href: '#list-view',
      },
      {
        title: 'Reviewing Past Check-Ins',
        description: 'Navigate through history to see how your emotional journey has evolved',
        readTime: '2 min read',
        href: '#history',
      },
      {
        title: 'Editing Check-Ins',
        description: 'Update your mood or notes anytime during the day it was created',
        readTime: '2 min read',
        href: '#editing',
      },
    ],
  },
  {
    title: 'Insights & Patterns',
    icon: BarChart3,
    color: 'from-indigo-500 to-indigo-600',
    articles: [
      {
        title: 'Weekly Insights Dashboard',
        description: 'AI-powered analysis of your emotional patterns with confidence scores',
        readTime: '4 min read',
        href: '#weekly-insights',
      },
      {
        title: 'Mood Distribution Charts',
        description: 'Visual breakdown showing how often you experience each mood',
        readTime: '3 min read',
        href: '#distribution',
      },
      {
        title: 'Pattern Detection',
        description: 'Identify trends like Monday blues, Friday highs, and emotional shifts',
        readTime: '4 min read',
        href: '#patterns',
      },
      {
        title: 'Understanding Confidence Scores',
        description: 'How the AI determines which patterns are significant (60-100% confidence)',
        readTime: '3 min read',
        href: '#confidence',
      },
      {
        title: 'Average Wellness Score',
        description: 'Track your overall emotional health on a 1-5 scale',
        readTime: '2 min read',
        href: '#wellness-score',
      },
    ],
  },
  {
    title: 'Best Practices & Tips',
    icon: Lightbulb,
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'Building a Daily Habit',
        description: 'Set a consistent time each day to check in for maximum benefit',
        readTime: '3 min read',
        href: '#daily-habit',
      },
      {
        title: 'Being Honest with Yourself',
        description: 'Why authentic check-ins lead to better insights and self-awareness',
        readTime: '3 min read',
        href: '#honesty',
      },
      {
        title: 'Adding Meaningful Context',
        description: 'How notes help you remember what made days special or challenging',
        readTime: '3 min read',
        href: '#context',
      },
      {
        title: 'Supporting Your Partner',
        description: 'Best practices for using reactions and checking in on each other',
        readTime: '4 min read',
        href: '#support',
      },
      {
        title: 'Reviewing Insights Weekly',
        description: 'Make time each week to spot patterns and celebrate progress',
        readTime: '3 min read',
        href: '#weekly-review',
      },
      {
        title: 'Handling Missed Days',
        description: 'Do not stress about broken streaks - consistency matters more than perfection',
        readTime: '2 min read',
        href: '#missed-days',
      },
    ],
  },
];

export default function CheckInDocumentationPage() {
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Daily Check-In Guide
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Complete guide to emotional tracking and partner connection
              </p>
            </div>
          </div>

          <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-pink-600 dark:text-pink-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-pink-900 dark:text-pink-100 mb-2">
                  Your Emotional Wellness Companion
                </h3>
                <p className="text-pink-800 dark:text-pink-200 mb-3">
                  Track your emotional journey, connect with your partner, and build self-awareness through daily mood check-ins:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-pink-700 dark:text-pink-300">
                  <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>5-Mood System</strong> - Simple tracking from Great to Rough</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Smart Prompts</strong> - Context-aware questions based on mood</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Partner Reactions</strong> - Send hearts, hugs, and strength</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Streak Tracking</strong> - Build consistency with daily check-ins</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Calendar & List Views</strong> - See your emotional history</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BarChart3 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>AI Insights</strong> - Pattern detection with confidence scores</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Mood Trends</strong> - Track improvements over time</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Private & Secure</strong> - Only you and your partner can see</span>
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
        <div className="mt-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to Start Your Emotional Wellness Journey?
          </h2>
          <p className="text-pink-100 mb-6 max-w-2xl mx-auto">
            Check in daily to track your moods, connect with your partner, and gain insights into your emotional patterns.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-pink-600 rounded-xl font-semibold hover:shadow-lg transition-shadow"
          >
            <Heart className="w-5 h-5" />
            Go to Dashboard
          </Link>
        </div>
        </div>
      </div>
    </>
  );
}
