import Link from 'next/link';

import {
  type LucideIcon,
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
    <div className="min-h-screen bg-black p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-pink-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Daily Check-In Guide
              </h1>
              <p className="text-gray-400 mt-1">
                Complete guide to emotional tracking and partner connection
              </p>
            </div>
          </div>

          <div className="bg-pink-900/20 border border-pink-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-pink-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-pink-100 mb-2">
                  Your Emotional Wellness Companion
                </h3>
                <p className="text-pink-200 mb-3">
                  Track your emotional journey, connect with your partner, and build self-awareness through daily mood check-ins:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-pink-300">
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
                      <span className="text-xs text-pink-400 font-medium">
                        {article.readTime}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ============================================ */}
        {/* DETAILED ARTICLE CONTENT SECTIONS */}
        {/* ============================================ */}

        {/* SECTION: Introduction to Daily Check-Ins */}
        <section id="intro" className="mt-16 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Introduction to Daily Check-Ins
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Daily Check-Ins are your personal emotional wellness journal within Rowan. In just a few seconds each day, you can capture how you are feeling, add context about what is influencing your mood, and stay connected with your partner through shared emotional visibility.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Why Daily Check-Ins Matter</h3>
              <p className="text-gray-300 mb-4">
                Research shows that emotional awareness is a cornerstone of mental wellness and healthy relationships. By taking a moment each day to reflect on your emotional state:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Build self-awareness</strong> by regularly checking in with how you actually feel</li>
                <li><strong>Identify patterns</strong> in what triggers different moods over time</li>
                <li><strong>Strengthen your relationship</strong> through transparent emotional communication</li>
                <li><strong>Track progress</strong> as you work on personal growth and wellness goals</li>
                <li><strong>Create accountability</strong> for prioritizing your emotional health</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">How It Works</h3>
              <p className="text-gray-300 mb-4">
                The check-in process is designed to be quick yet meaningful:
              </p>
              <ol className="list-decimal pl-6 space-y-3 text-gray-300 mb-6">
                <li><strong>Select your mood</strong> from five options: Great, Good, Okay, Meh, or Rough</li>
                <li><strong>Answer smart prompts</strong> that adapt based on your mood selection</li>
                <li><strong>Add optional notes</strong> to capture highlights, challenges, or context</li>
                <li><strong>Submit and track</strong> your check-in as part of your streak</li>
              </ol>

              <div className="bg-pink-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-pink-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-pink-100 mb-2">Partner Connection</p>
                    <p className="text-pink-200 text-sm">
                      When you check in, your partner can see your mood at a glance on their dashboard. This creates an opportunity for support without requiring you to initiate a conversation every time you are having a tough day.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Creating Your First Check-In */}
        <section id="first-checkin" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Creating Your First Check-In
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Getting started with daily check-ins is simple. Here is a step-by-step guide to recording your first emotional check-in and beginning your wellness tracking journey.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Step 1: Navigate to Check-In</h3>
              <p className="text-gray-300 mb-4">
                From your dashboard, look for the check-in card or tap the heart icon in your navigation. If you have not checked in today, you will see a prompt encouraging you to do so.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Step 2: Select Your Mood</h3>
              <p className="text-gray-300 mb-4">
                You will see five mood options displayed as colorful cards:
              </p>
              <ul className="list-none space-y-2 text-gray-300 mb-6">
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-lg">😊</span>
                  <span><strong>Great</strong> - Feeling fantastic, energized, or particularly happy</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-emerald-400 flex items-center justify-center text-white text-lg">🙂</span>
                  <span><strong>Good</strong> - Generally positive, things are going well</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white text-lg">😐</span>
                  <span><strong>Okay</strong> - Neutral, neither particularly up nor down</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white text-lg">😕</span>
                  <span><strong>Meh</strong> - A bit off, low energy, or slightly down</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-lg">😢</span>
                  <span><strong>Rough</strong> - Struggling, stressed, or having a difficult time</span>
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Step 3: Answer the Prompts</h3>
              <p className="text-gray-300 mb-4">
                After selecting your mood, you will see prompts that help add context. These might ask about:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>What is making today great (for positive moods)</li>
                <li>What is on your mind (for neutral moods)</li>
                <li>What is challenging you (for difficult moods)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Step 4: Add Notes (Optional)</h3>
              <p className="text-gray-300 mb-4">
                The notes field is your space to capture anything else relevant. This could be a highlight from your day, something you are grateful for, or additional context you want to remember.
              </p>

              <div className="bg-amber-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-100 mb-2">Pro Tip</p>
                    <p className="text-amber-200 text-sm">
                      Do not overthink it! Your first check-in does not need to be perfect. The most important thing is to start the habit. You can always edit your check-in later if you want to add more context.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Understanding the 5-Mood System */}
        <section id="mood-system" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Understanding the 5-Mood System
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                The 5-mood system is designed to be simple enough to use quickly while still capturing meaningful emotional data. Here is a deeper look at each mood level and when to use it.
              </p>

              <div className="space-y-6 mt-8">
                <div className="bg-green-900/20 rounded-xl p-6 border border-green-800">
                  <h3 className="text-xl font-semibold text-green-200 mb-3">Great (5/5)</h3>
                  <p className="text-green-300 mb-3">
                    Use this when you are feeling exceptional. This is for those days when you have extra energy, feel particularly happy, or something wonderful has happened.
                  </p>
                  <p className="text-sm text-green-400">
                    <strong>Examples:</strong> Got a promotion, had an amazing date night, feeling grateful and energized, accomplished a major goal
                  </p>
                </div>

                <div className="bg-emerald-900/20 rounded-xl p-6 border border-emerald-800">
                  <h3 className="text-xl font-semibold text-emerald-200 mb-3">Good (4/5)</h3>
                  <p className="text-emerald-300 mb-3">
                    This is your baseline positive. Things are going well, you feel content, and there are no significant stressors weighing on you.
                  </p>
                  <p className="text-sm text-emerald-400">
                    <strong>Examples:</strong> Productive day at work, enjoyed time with family, no major complaints, feeling steady and positive
                  </p>
                </div>

                <div className="bg-yellow-900/20 rounded-xl p-6 border border-yellow-800">
                  <h3 className="text-xl font-semibold text-yellow-200 mb-3">Okay (3/5)</h3>
                  <p className="text-yellow-300 mb-3">
                    The neutral middle ground. You are neither particularly happy nor sad. This is a perfectly valid place to be and is often the most common mood.
                  </p>
                  <p className="text-sm text-yellow-400">
                    <strong>Examples:</strong> Regular routine day, nothing special happened, feeling average, going through the motions
                  </p>
                </div>

                <div className="bg-orange-900/20 rounded-xl p-6 border border-orange-800">
                  <h3 className="text-xl font-semibold text-orange-200 mb-3">Meh (2/5)</h3>
                  <p className="text-orange-300 mb-3">
                    Something is off. You might feel low energy, slightly anxious, or just not yourself. This is different from being sad - it is more of a general malaise.
                  </p>
                  <p className="text-sm text-orange-400">
                    <strong>Examples:</strong> Poor sleep affecting mood, minor conflict with someone, feeling unmotivated, Sunday scaries
                  </p>
                </div>

                <div className="bg-red-900/20 rounded-xl p-6 border border-red-800">
                  <h3 className="text-xl font-semibold text-red-200 mb-3">Rough (1/5)</h3>
                  <p className="text-red-300 mb-3">
                    Use this when you are having a genuinely difficult time. This could be due to stress, sadness, anxiety, or feeling overwhelmed.
                  </p>
                  <p className="text-sm text-red-400">
                    <strong>Examples:</strong> Major stressor at work, health concerns, relationship conflict, grief, feeling burnt out
                  </p>
                </div>
              </div>

              <div className="bg-purple-900/20 rounded-xl p-6 mt-8">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-purple-100 mb-2">Wellness Score</p>
                    <p className="text-purple-200 text-sm">
                      Your average wellness score is calculated from these 1-5 values over time. This gives you a trackable metric to see how your emotional health trends week over week and month over month.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Smart Prompts Explained */}
        <section id="smart-prompts" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Smart Prompts Explained
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Smart prompts adapt based on the mood you select, asking relevant questions that help capture meaningful context without feeling repetitive or intrusive.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">How Prompts Adapt</h3>
              <p className="text-gray-300 mb-4">
                The questions you see change based on your mood selection:
              </p>

              <div className="space-y-4 mb-6">
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="font-semibold text-white">For Great or Good moods:</p>
                  <p className="text-gray-400 text-sm">What is making today a good day? What are you grateful for? What went well?</p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <p className="font-semibold text-white">For Okay moods:</p>
                  <p className="text-gray-400 text-sm">What is on your mind? How is your energy level? Anything notable about today?</p>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <p className="font-semibold text-white">For Meh or Rough moods:</p>
                  <p className="text-gray-400 text-sm">What is challenging you? Would you like to talk about it? What would help right now?</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Why This Matters</h3>
              <p className="text-gray-300 mb-4">
                Mood-appropriate prompts serve several purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Relevance</strong> - You are not asked what is making today great when you are struggling</li>
                <li><strong>Depth</strong> - The right questions help you reflect more meaningfully</li>
                <li><strong>Support</strong> - Difficult days get prompts designed to help you process</li>
                <li><strong>Celebration</strong> - Good days get prompts that help you savor the positive</li>
              </ul>

              <div className="bg-pink-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-pink-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-pink-100 mb-2">Optional Responses</p>
                    <p className="text-pink-200 text-sm">
                      All prompt responses are optional. If you just want to log your mood without additional context, simply skip the prompts and submit your check-in.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Building Your Streak */}
        <section id="streaks" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Building Your Streak
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Streaks track your consecutive days of check-ins, helping you build and maintain the habit of daily emotional reflection.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">How Streaks Work</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>Your streak increases by 1 each day you complete a check-in</li>
                <li>The streak resets to 0 if you miss a day</li>
                <li>Your current streak is displayed on the dashboard</li>
                <li>You can see your longest streak ever achieved</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Benefits of Maintaining Streaks</h3>
              <p className="text-gray-300 mb-4">
                While streaks are motivational, the real benefits come from consistent emotional tracking:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Better insights</strong> - More data points lead to more accurate pattern detection</li>
                <li><strong>Habit formation</strong> - Consistent check-ins become automatic over time</li>
                <li><strong>Self-awareness</strong> - Daily reflection builds emotional intelligence</li>
                <li><strong>Partner connection</strong> - Regular check-ins keep both of you informed</li>
              </ul>

              <div className="bg-amber-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-100 mb-2">Do Not Stress About Broken Streaks</p>
                    <p className="text-amber-200 text-sm">
                      Life happens. Missing a day does not erase the benefits of the days you did check in. The goal is progress, not perfection. Simply pick back up the next day and keep building.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Seeing Your Partner's Mood */}
        <section id="partner-mood" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Seeing Your Partner&apos;s Mood
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                One of the most powerful features of daily check-ins is real-time emotional visibility between partners. When your partner checks in, you can see their mood instantly on your dashboard.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What You Can See</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Current mood</strong> - Their selected mood for today (Great, Good, Okay, Meh, or Rough)</li>
                <li><strong>Time of check-in</strong> - When they last checked in</li>
                <li><strong>Streak count</strong> - Their current consecutive check-in streak</li>
                <li><strong>Calendar history</strong> - Their mood patterns over time</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Why This Helps Your Relationship</h3>
              <p className="text-gray-300 mb-4">
                Emotional visibility creates opportunities for connection:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Awareness</strong> - Know at a glance if your partner might need extra support</li>
                <li><strong>Conversation starters</strong> - See that they are having a rough day? You can reach out proactively</li>
                <li><strong>Celebration</strong> - Notice when they are having a great day and share in their joy</li>
                <li><strong>Reduced friction</strong> - No need to always ask how are you? - you already know</li>
              </ul>

              <div className="bg-purple-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-purple-100 mb-2">Thoughtful, Not Intrusive</p>
                    <p className="text-purple-200 text-sm">
                      You cannot see the detailed notes your partner writes - only their mood level. This creates a balance between connection and privacy, letting your partner share what feels comfortable while still keeping you informed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Sending Reactions */}
        <section id="reactions" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Sending Reactions
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Reactions are quick ways to show your partner you are thinking of them and responding to their emotional state. A simple reaction can mean a lot on tough days.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Available Reactions</h3>
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                <div className="bg-pink-900/20 rounded-xl p-4 text-center">
                  <div className="text-4xl mb-2">❤️</div>
                  <p className="font-semibold text-pink-100">Heart</p>
                  <p className="text-sm text-pink-300">Send love and appreciation</p>
                </div>
                <div className="bg-purple-900/20 rounded-xl p-4 text-center">
                  <div className="text-4xl mb-2">🤗</div>
                  <p className="font-semibold text-purple-100">Hug</p>
                  <p className="text-sm text-purple-300">Offer comfort and support</p>
                </div>
                <div className="bg-indigo-900/20 rounded-xl p-4 text-center">
                  <div className="text-4xl mb-2">💪</div>
                  <p className="font-semibold text-indigo-100">Strength</p>
                  <p className="text-sm text-indigo-300">Show encouragement</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">When to Send Reactions</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Rough days</strong> - A hug or strength reaction shows you noticed and care</li>
                <li><strong>Great days</strong> - A heart celebrates their happiness with them</li>
                <li><strong>Any time</strong> - Reactions are always welcome as a simple I see you, I care</li>
              </ul>

              <div className="bg-green-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-100 mb-2">Low Effort, High Impact</p>
                    <p className="text-green-200 text-sm">
                      Sending a reaction takes just one tap but can significantly brighten your partner&apos;s day. It shows you are paying attention and thinking of them without requiring a full conversation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Understanding Partner Notifications */}
        <section id="notifications" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Understanding Partner Notifications
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Rowan can notify you when your partner might need extra support, helping you be there for each other during difficult times.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Notification Types</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Rough day alerts</strong> - Get notified when your partner logs a Rough mood</li>
                <li><strong>Streak milestones</strong> - Celebrate when either of you hits streak goals</li>
                <li><strong>Reaction received</strong> - Know when your partner sends you a reaction</li>
                <li><strong>Check-in reminders</strong> - Optional reminders to complete your daily check-in</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Customizing Notifications</h3>
              <p className="text-gray-300 mb-4">
                You can customize which notifications you receive in Settings &gt; Notifications. Options include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>Enable or disable specific notification types</li>
                <li>Set quiet hours when you do not want to be disturbed</li>
                <li>Choose between push notifications, email, or both</li>
              </ul>

              <div className="bg-blue-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-100 mb-2">Thoughtful Timing</p>
                    <p className="text-blue-200 text-sm">
                      Partner mood notifications are designed to be helpful, not overwhelming. You will not get bombarded - just gentle alerts when your attention might be meaningful.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Privacy & Visibility */}
        <section id="privacy" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Privacy & Visibility
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Your emotional data is personal. Here is exactly what is shared and what stays private.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What Your Partner Can See</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>Your selected mood (Great, Good, Okay, Meh, Rough)</li>
                <li>When you last checked in</li>
                <li>Your current and best streak</li>
                <li>Your mood history on the shared calendar view</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What Stays Private</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Your notes</strong> - Personal reflections you write are not shared</li>
                <li><strong>Prompt responses</strong> - Your answers to check-in questions stay private</li>
                <li><strong>Detailed insights</strong> - AI-generated insights about your patterns</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Who Else Can See Your Data?</h3>
              <p className="text-gray-300 mb-4">
                <strong>No one.</strong> Your check-in data is only visible to you and your partner within your shared space. It is:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>Not shared with other app users</li>
                <li>Not used for advertising</li>
                <li>Not sold to third parties</li>
                <li>Encrypted and securely stored</li>
              </ul>

              <div className="bg-gray-700 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-100 mb-2">Your Data, Your Control</p>
                    <p className="text-gray-300 text-sm">
                      You can export or delete your check-in data at any time from Settings &gt; Privacy. Your emotional journey belongs to you.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Calendar View */}
        <section id="calendar-view" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Calendar View
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                The calendar view gives you a bird&apos;s-eye view of your emotional patterns over time, showing both your and your partner&apos;s moods in a single glanceable interface.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Reading the Calendar</h3>
              <p className="text-gray-300 mb-4">
                Each day on the calendar shows mood indicators:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Colored dots</strong> represent mood levels (green for Great, yellow for Okay, red for Rough, etc.)</li>
                <li><strong>Your dot</strong> appears on top, your partner&apos;s below (or side by side)</li>
                <li><strong>Empty days</strong> indicate no check-in was recorded</li>
                <li><strong>Today</strong> is highlighted with a special border</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Navigation</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>Use arrows to move between months</li>
                <li>Tap any date to see detailed check-in information</li>
                <li>Jump to current month with the &quot;Today&quot; button</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Spotting Patterns</h3>
              <p className="text-gray-300 mb-4">
                The calendar makes it easy to spot visual patterns:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>Clusters of similar colors show consistent periods</li>
                <li>Color changes may correlate with events or seasons</li>
                <li>Comparing your dots to your partner&apos;s reveals relationship dynamics</li>
              </ul>

              <div className="bg-blue-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-100 mb-2">Tip: Month-at-a-Glance</p>
                    <p className="text-blue-200 text-sm">
                      At the start of each month, review the previous month in calendar view. You might notice patterns you did not realize were there - like always feeling better on weekends or dipping mid-week.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: List View */}
        <section id="list-view" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                List View
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                While the calendar provides a visual overview, list view gives you detailed chronological access to all your check-ins with full context.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What List View Shows</h3>
              <p className="text-gray-300 mb-4">
                Each entry in list view displays:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Date and time</strong> of the check-in</li>
                <li><strong>Mood indicator</strong> with color and label</li>
                <li><strong>Your notes</strong> (if you added any)</li>
                <li><strong>Highlights and challenges</strong> you mentioned</li>
                <li><strong>Reactions received</strong> from your partner</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">When to Use List View</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Deep reflection</strong> - When you want to read through your journey</li>
                <li><strong>Finding context</strong> - Looking for what you wrote on a specific day</li>
                <li><strong>Therapy prep</strong> - Reviewing recent entries before a session</li>
                <li><strong>Relationship conversations</strong> - Referencing specific moments to discuss</li>
              </ul>

              <div className="bg-indigo-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-indigo-100 mb-2">Scroll Through Time</p>
                    <p className="text-indigo-200 text-sm">
                      List view supports infinite scroll. Keep scrolling to load older entries and journey back through your emotional history as far as you want.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Reviewing Past Check-Ins */}
        <section id="history" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Reviewing Past Check-Ins
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Your check-in history is a valuable record of your emotional journey. Here is how to navigate and learn from your past entries.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Accessing History</h3>
              <p className="text-gray-300 mb-4">
                You can review past check-ins through:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Calendar view</strong> - Tap any past date with a mood indicator</li>
                <li><strong>List view</strong> - Scroll through chronological entries</li>
                <li><strong>Dashboard history widget</strong> - Quick access to recent check-ins</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What to Look For</h3>
              <p className="text-gray-300 mb-4">
                When reviewing your history, consider:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Triggers</strong> - What events correlate with mood changes?</li>
                <li><strong>Recovery</strong> - How long do rough periods typically last?</li>
                <li><strong>Gratitude</strong> - What keeps appearing in your highlights?</li>
                <li><strong>Growth</strong> - How has your baseline mood shifted over months?</li>
              </ul>

              <div className="bg-green-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-100 mb-2">Celebrate Progress</p>
                    <p className="text-green-200 text-sm">
                      Looking back at past rough periods from a better place can be incredibly validating. You got through it. Your history is proof of your resilience.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Editing Check-Ins */}
        <section id="editing" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Editing Check-Ins
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Changed your mind about how you are feeling? Need to add more context? You can edit your check-in anytime during the same day it was created.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What You Can Edit</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Mood selection</strong> - Change from Good to Great if your day improved</li>
                <li><strong>Notes and context</strong> - Add, modify, or remove your written reflections</li>
                <li><strong>Prompt responses</strong> - Update your answers to check-in questions</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Editing Limitations</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Same-day only</strong> - You can only edit check-ins from the current day</li>
                <li><strong>No backdating</strong> - You cannot create check-ins for past days you missed</li>
                <li><strong>History preserved</strong> - Past days remain as originally recorded</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">How to Edit</h3>
              <ol className="list-decimal pl-6 space-y-2 text-gray-300 mb-6">
                <li>Go to your check-in widget or dashboard</li>
                <li>Tap on your current check-in</li>
                <li>Make your changes</li>
                <li>Save to update</li>
              </ol>

              <div className="bg-amber-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-100 mb-2">End-of-Day Updates</p>
                    <p className="text-amber-200 text-sm">
                      Some people prefer to check in early and then update at the end of the day with how things actually turned out. This is a great way to capture both your morning expectations and evening reality.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Weekly Insights Dashboard */}
        <section id="weekly-insights" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Weekly Insights Dashboard
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                The Weekly Insights Dashboard uses AI to analyze your check-in data and surface meaningful patterns, trends, and observations about your emotional wellness.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What the Dashboard Shows</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Mood summary</strong> - Your average mood and total check-ins this week</li>
                <li><strong>Key patterns</strong> - AI-identified trends with confidence scores</li>
                <li><strong>Comparison</strong> - How this week compares to previous weeks</li>
                <li><strong>Recommendations</strong> - Personalized suggestions based on your patterns</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Understanding AI Insights</h3>
              <p className="text-gray-300 mb-4">
                The AI analyzes several factors to generate insights:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>Day-of-week mood patterns (e.g., better weekends, Monday blues)</li>
                <li>Mood transitions and volatility</li>
                <li>Common themes in your notes and responses</li>
                <li>Correlation between activities and mood changes</li>
              </ul>

              <div className="bg-indigo-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-indigo-100 mb-2">AI Improves Over Time</p>
                    <p className="text-indigo-200 text-sm">
                      The more consistently you check in, the better the AI can identify meaningful patterns. After a few weeks of data, insights become increasingly accurate and personalized.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Mood Distribution Charts */}
        <section id="distribution" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Mood Distribution Charts
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Mood distribution charts show you the breakdown of how often you experience each mood level, giving you a quantitative view of your emotional baseline.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Reading the Chart</h3>
              <p className="text-gray-300 mb-4">
                The distribution chart displays:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Percentage breakdown</strong> - What portion of days fall into each mood</li>
                <li><strong>Visual bars</strong> - Color-coded bars showing relative frequency</li>
                <li><strong>Time periods</strong> - View weekly, monthly, or all-time distributions</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What Distribution Tells You</h3>
              <p className="text-gray-300 mb-4">
                Your mood distribution reveals your emotional baseline:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Skewed positive</strong> - Most days are Good or Great? You are in a good place</li>
                <li><strong>Centered on Okay</strong> - Neutral baseline, neither particularly up nor down</li>
                <li><strong>Frequent Meh/Rough</strong> - May indicate ongoing stressors worth addressing</li>
                <li><strong>High variability</strong> - Wide distribution suggests mood volatility</li>
              </ul>

              <div className="bg-purple-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-purple-100 mb-2">Track Shifts Over Time</p>
                    <p className="text-purple-200 text-sm">
                      Compare your monthly distributions to see if your baseline is shifting. A gradual move toward more positive moods is meaningful progress worth celebrating.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Pattern Detection */}
        <section id="patterns" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Pattern Detection
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Pattern detection is where the real magic happens. Our AI analyzes your check-in history to identify recurring patterns you might not notice yourself.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Types of Patterns Detected</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Day-of-week patterns</strong> - Monday blues, Friday highs, weekend effects</li>
                <li><strong>Time-of-day patterns</strong> - Morning person vs. night owl tendencies</li>
                <li><strong>Cyclical patterns</strong> - Monthly rhythms, seasonal changes</li>
                <li><strong>Event correlations</strong> - How specific activities affect your mood</li>
                <li><strong>Recovery patterns</strong> - How quickly you bounce back from rough days</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Example Insights</h3>
              <div className="space-y-3 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-200">
                    <strong>&quot;Monday Blues Pattern&quot;</strong> - Your average Monday mood is 2.3 while other weekdays average 3.7. Consider starting your week with something you enjoy.
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-200">
                    <strong>&quot;Weekend Uplift&quot;</strong> - Saturdays and Sundays show 40% higher Great moods than weekdays. Weekend activities clearly boost your wellbeing.
                  </p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-200">
                    <strong>&quot;Quick Recovery&quot;</strong> - After Rough days, you typically return to Good within 1-2 days. Your resilience is strong.
                  </p>
                </div>
              </div>

              <div className="bg-green-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-100 mb-2">Actionable Insights</p>
                    <p className="text-green-200 text-sm">
                      The best patterns are ones you can act on. If you know Mondays are tough, you can plan something to look forward to. If exercise correlates with better moods, you have motivation to stay active.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Understanding Confidence Scores */}
        <section id="confidence" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Understanding Confidence Scores
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Every AI-generated insight comes with a confidence score (60-100%) that indicates how reliable the pattern is based on your data.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What Confidence Means</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>90-100%</strong> - Very reliable pattern with strong statistical support</li>
                <li><strong>80-89%</strong> - Highly likely pattern worth taking seriously</li>
                <li><strong>70-79%</strong> - Moderate confidence, pattern exists but may have exceptions</li>
                <li><strong>60-69%</strong> - Emerging pattern, needs more data to confirm</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Factors Affecting Confidence</h3>
              <p className="text-gray-300 mb-4">
                Several factors influence confidence scores:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Data volume</strong> - More check-ins = higher confidence in patterns</li>
                <li><strong>Consistency</strong> - Patterns that repeat reliably score higher</li>
                <li><strong>Statistical significance</strong> - Bigger differences are more trustworthy</li>
                <li><strong>Time span</strong> - Patterns that hold across weeks/months are more reliable</li>
              </ul>

              <div className="bg-indigo-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-indigo-100 mb-2">Building Confidence</p>
                    <p className="text-indigo-200 text-sm">
                      Patterns with lower confidence scores are not wrong - they just need more data. Keep checking in consistently and watch those confidence scores climb as the AI learns more about your patterns.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Average Wellness Score */}
        <section id="wellness-score" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Average Wellness Score
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Your wellness score is a simple 1-5 metric that averages your mood check-ins over time, giving you a single number to track your overall emotional health.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">How It Is Calculated</h3>
              <p className="text-gray-300 mb-4">
                Each mood maps to a number:
              </p>
              <ul className="list-none space-y-2 text-gray-300 mb-6">
                <li>Great = 5</li>
                <li>Good = 4</li>
                <li>Okay = 3</li>
                <li>Meh = 2</li>
                <li>Rough = 1</li>
              </ul>
              <p className="text-gray-300 mb-4">
                Your average is calculated across your check-ins for the selected time period (week, month, or all-time).
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Interpreting Your Score</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>4.0+ (Thriving)</strong> - You are doing great! Most days are Good or better</li>
                <li><strong>3.5-3.9 (Healthy)</strong> - Solid baseline with room for occasional challenges</li>
                <li><strong>3.0-3.4 (Steady)</strong> - Balanced, mostly neutral with ups and downs</li>
                <li><strong>2.5-2.9 (Struggling)</strong> - Frequent challenges worth addressing</li>
                <li><strong>Below 2.5 (Need support)</strong> - Consider reaching out for additional help</li>
              </ul>

              <div className="bg-pink-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-pink-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-pink-100 mb-2">Track Trends, Not Single Points</p>
                    <p className="text-pink-200 text-sm">
                      Your wellness score will fluctuate - that is normal. What matters is the trend over time. A gradual increase from 3.2 to 3.6 over three months is meaningful progress.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Building a Daily Habit */}
        <section id="daily-habit" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Building a Daily Habit
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                The key to getting value from daily check-ins is consistency. Here are strategies to make check-ins a natural part of your routine.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Choose Your Time</h3>
              <p className="text-gray-300 mb-4">
                Pick a consistent time that works for your schedule:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Morning</strong> - Set your intention for the day, capture how you woke up feeling</li>
                <li><strong>Lunch</strong> - Mid-day reflection on how things are going</li>
                <li><strong>Evening</strong> - Summarize your day while it is fresh</li>
                <li><strong>Before bed</strong> - Wind down with reflection</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Habit Stacking</h3>
              <p className="text-gray-300 mb-4">
                Attach your check-in to an existing habit:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>After your morning coffee</li>
                <li>During your commute (if not driving)</li>
                <li>Right after brushing your teeth at night</li>
                <li>When you sit down for lunch</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Use Reminders</h3>
              <p className="text-gray-300 mb-4">
                Enable check-in reminders in Settings &gt; Notifications. A gentle nudge at your chosen time can help until the habit is automatic.
              </p>

              <div className="bg-amber-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-100 mb-2">Start Small</p>
                    <p className="text-amber-200 text-sm">
                      Even if you only select a mood without adding notes, that counts. A quick 5-second check-in is infinitely better than no check-in. You can always add more detail as the habit strengthens.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Being Honest with Yourself */}
        <section id="honesty" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Being Honest with Yourself
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                The value of daily check-ins depends entirely on your honesty. Selecting Good every day when you are actually struggling does not help you - it just creates inaccurate data.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Why Honesty Matters</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Accurate insights</strong> - The AI can only help if it has real data</li>
                <li><strong>Self-awareness</strong> - Admitting a rough day is the first step to addressing it</li>
                <li><strong>Partner support</strong> - Your partner cannot help if they do not know you are struggling</li>
                <li><strong>Progress tracking</strong> - Real improvement requires an honest baseline</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Common Temptations to Avoid</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Performative positivity</strong> - Selecting Good because you think you should be fine</li>
                <li><strong>Protecting your partner</strong> - Hiding struggles to avoid worrying them</li>
                <li><strong>Comparison</strong> - Thinking others have it worse, so you can not complain</li>
                <li><strong>Streak pressure</strong> - Selecting Good quickly just to maintain your streak</li>
              </ul>

              <div className="bg-pink-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-pink-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-pink-100 mb-2">Vulnerability Is Strength</p>
                    <p className="text-pink-200 text-sm">
                      Logging a Rough day is not a failure - it is honest self-reflection. Your check-in history is for you. Being real with yourself is the foundation of emotional growth.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Adding Meaningful Context */}
        <section id="context" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Adding Meaningful Context
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Notes and context transform your check-ins from simple mood data points into a rich emotional journal. Here is how to add context that you will actually find valuable later.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What to Include</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Key events</strong> - What happened that influenced your mood?</li>
                <li><strong>Physical factors</strong> - Sleep quality, exercise, health issues</li>
                <li><strong>Relationship moments</strong> - Meaningful interactions with your partner</li>
                <li><strong>Gratitude</strong> - Something you are thankful for today</li>
                <li><strong>Challenges</strong> - What is making things difficult?</li>
                <li><strong>Wins</strong> - Small or big victories worth remembering</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Example Notes</h3>
              <div className="space-y-3 mb-6">
                <div className="bg-green-900/30 rounded-lg p-4">
                  <p className="text-green-200 text-sm">
                    <strong>Great day:</strong> &quot;Finished the project I have been stressing about. Celebrated with dinner out. Finally feel like I can breathe.&quot;
                  </p>
                </div>
                <div className="bg-yellow-900/30 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm">
                    <strong>Okay day:</strong> &quot;Regular day, nothing special. Only slept 5 hours though - might explain low energy.&quot;
                  </p>
                </div>
                <div className="bg-red-900/30 rounded-lg p-4">
                  <p className="text-red-200 text-sm">
                    <strong>Rough day:</strong> &quot;Argument with partner about finances. Feeling disconnected. Need to revisit this conversation when we are both calmer.&quot;
                  </p>
                </div>
              </div>

              <div className="bg-amber-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-100 mb-2">Future You Will Thank You</p>
                    <p className="text-amber-200 text-sm">
                      When you look back at your check-ins in a few months, you will not remember why a random Tuesday was rough. Your notes provide that context and help you see patterns you would otherwise miss.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Supporting Your Partner */}
        <section id="support" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Supporting Your Partner
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                One of the most powerful aspects of shared check-ins is the ability to support your partner proactively. Here are best practices for being there for each other.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Checking Their Mood</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>Glance at their mood when you open the app - make it a habit</li>
                <li>Pay special attention to Meh or Rough days</li>
                <li>Notice patterns - are Mondays always hard for them?</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Responding Appropriately</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Great/Good days</strong> - Send a heart to celebrate with them</li>
                <li><strong>Okay days</strong> - A simple check-in message can help</li>
                <li><strong>Meh days</strong> - Send a hug reaction, ask if they want to talk</li>
                <li><strong>Rough days</strong> - Reach out directly, offer support</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What NOT to Do</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Do not interrogate</strong> - Asking why are you only Okay? can feel intrusive</li>
                <li><strong>Do not fix immediately</strong> - Sometimes they just want acknowledgment</li>
                <li><strong>Do not take it personally</strong> - Their mood is not always about you</li>
                <li><strong>Do not ignore it</strong> - Pretending you did not notice a rough day feels dismissive</li>
              </ul>

              <div className="bg-purple-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-purple-100 mb-2">Simple Acknowledgment Goes Far</p>
                    <p className="text-purple-200 text-sm">
                      Sometimes all your partner needs is to know you noticed. A hug reaction with a simple message like &quot;Saw you are having a rough day - I&apos;m here if you need me&quot; can mean everything.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Reviewing Insights Weekly */}
        <section id="weekly-review" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Reviewing Insights Weekly
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Daily check-ins create data. Weekly reviews turn that data into wisdom. Setting aside time each week to review your insights maximizes the value of your tracking.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Weekly Review Ritual</h3>
              <p className="text-gray-300 mb-4">
                Pick a consistent time - Sunday evening works well for many:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-300 mb-6">
                <li>Open your Weekly Insights dashboard</li>
                <li>Review your average mood for the week</li>
                <li>Read through any AI-detected patterns</li>
                <li>Scroll through your daily notes from the week</li>
                <li>Compare to last week - better, worse, or about the same?</li>
                <li>Set an intention for the coming week</li>
              </ol>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Questions to Ask Yourself</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>What was my best day this week? Why?</li>
                <li>What was my hardest day? What made it difficult?</li>
                <li>Do I see any patterns I want to change?</li>
                <li>What am I grateful for this week?</li>
                <li>What do I want more of next week?</li>
              </ul>

              <div className="bg-green-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-100 mb-2">Make It a Couple Activity</p>
                    <p className="text-green-200 text-sm">
                      Consider doing your weekly review together with your partner. Share your insights, discuss patterns, and support each other&apos;s emotional growth. It is a great way to stay connected.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

        {/* SECTION: Handling Missed Days */}
        <section id="missed-days" className="mt-8 scroll-mt-24">
          <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Handling Missed Days
              </h2>
            </div>

            <div className="prose prose-gray prose-invert max-w-none">
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                Life gets busy. You will miss days. Here is how to handle it without derailing your emotional tracking practice.
              </p>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What Happens When You Miss</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li>Your streak resets to 0 (if you had one going)</li>
                <li>That day shows as empty on your calendar</li>
                <li>Your averages will have one less data point</li>
                <li>Your historical data remains intact</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">What You Cannot Do</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>No backdating</strong> - You cannot create check-ins for past days</li>
                <li><strong>No gap filling</strong> - Missed days stay missed</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">The Healthy Mindset</h3>
              <p className="text-gray-300 mb-4">
                Remember these truths about missed days:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300 mb-6">
                <li><strong>Consistency beats perfection</strong> - 5 days a week is excellent</li>
                <li><strong>Streaks are motivational, not mandatory</strong> - The insights matter more</li>
                <li><strong>Each day is fresh</strong> - Yesterday&apos;s miss does not affect today</li>
                <li><strong>Data gaps are okay</strong> - Patterns emerge even with occasional gaps</li>
              </ul>

              <div className="bg-amber-900/20 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-100 mb-2">Self-Compassion First</p>
                    <p className="text-amber-200 text-sm">
                      The worst thing you can do is beat yourself up for missing a day and then stop checking in altogether out of guilt. Just pick back up tomorrow. Your emotional wellness practice is about progress, not perfection.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 mt-8 text-pink-400 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to top
            </a>
          </div>
        </section>

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
  );
}
