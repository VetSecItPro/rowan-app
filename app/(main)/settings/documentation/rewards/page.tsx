'use client';

import Link from 'next/link';

import {
  ArrowLeft,
  Gift,
  Star,
  Trophy,
  Coins,
  ShoppingBag,
  Settings,
  Users,
  HelpCircle,
  Sparkles,
  CheckCircle,
  Clock,
  TrendingUp,
  Crown,
  Heart,
  Target,
  Award,
  Zap,
  AlertTriangle,
  RefreshCw,
  ListChecks,
  Shield,
} from 'lucide-react';

interface GuideSection {
  title: string;
  icon: React.ElementType;
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
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'Introduction to Rewards Shop',
        description: 'Learn how the rewards system motivates family members to complete chores and tasks',
        readTime: '4 min read',
        href: '#intro',
      },
      {
        title: 'Understanding Points',
        description: 'How points work, how they&apos;re earned, and what they can be used for',
        readTime: '3 min read',
        href: '#understanding-points',
      },
      {
        title: 'Roles: Kids vs Parents',
        description: 'Different views and capabilities for family members and parents/admins',
        readTime: '3 min read',
        href: '#roles',
      },
      {
        title: 'Navigating the Rewards Shop',
        description: 'Tour of the shop interface, points display, and catalog browsing',
        readTime: '4 min read',
        href: '#navigating',
      },
    ],
  },
  {
    title: 'Earning Points',
    icon: Coins,
    color: 'from-yellow-500 to-yellow-600',
    articles: [
      {
        title: 'Completing Chores for Points',
        description: 'How task completion awards points based on difficulty and assignment',
        readTime: '4 min read',
        href: '#earning-chores',
      },
      {
        title: 'Point Values & Multipliers',
        description: 'Understanding how different tasks earn different point amounts',
        readTime: '3 min read',
        href: '#point-values',
      },
      {
        title: 'Bonus Points & Streaks',
        description: 'Extra points for consistency, early completion, and special achievements',
        readTime: '4 min read',
        href: '#bonus-points',
      },
      {
        title: 'Viewing Your Points History',
        description: 'Track your earning history and see how your balance has grown',
        readTime: '3 min read',
        href: '#points-history',
      },
    ],
  },
  {
    title: 'Rewards Catalog',
    icon: ShoppingBag,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Browsing Available Rewards',
        description: 'Explore the catalog of rewards your family has created',
        readTime: '3 min read',
        href: '#browsing-rewards',
      },
      {
        title: 'Understanding Reward Tiers',
        description: 'Small treats, medium rewards, and big prizes - what&apos;s available at each level',
        readTime: '4 min read',
        href: '#reward-tiers',
      },
      {
        title: 'Reward Categories',
        description: 'From screen time to special outings - different types of rewards',
        readTime: '3 min read',
        href: '#reward-categories',
      },
      {
        title: 'Checking Reward Availability',
        description: 'Some rewards may have stock limits or time restrictions',
        readTime: '3 min read',
        href: '#reward-availability',
      },
    ],
  },
  {
    title: 'Redeeming Rewards',
    icon: Gift,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'How to Redeem a Reward',
        description: 'Step-by-step guide to spending your points on rewards',
        readTime: '4 min read',
        href: '#how-to-redeem',
      },
      {
        title: 'Redemption Approval Process',
        description: 'When redemptions need parent approval and how the process works',
        readTime: '4 min read',
        href: '#approval-process',
      },
      {
        title: 'Tracking Your Redemptions',
        description: 'View pending, approved, and completed redemption requests',
        readTime: '3 min read',
        href: '#tracking-redemptions',
      },
      {
        title: 'What Happens After Approval',
        description: 'Fulfillment process and when you&apos;ll receive your reward',
        readTime: '3 min read',
        href: '#after-approval',
      },
    ],
  },
  {
    title: 'Parent Management',
    icon: Settings,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Creating Custom Rewards',
        description: 'Add rewards tailored to your family&apos;s interests and values',
        readTime: '5 min read',
        href: '#creating-rewards',
      },
      {
        title: 'Setting Point Values',
        description: 'Balance reward costs to encourage saving without frustration',
        readTime: '4 min read',
        href: '#setting-values',
      },
      {
        title: 'Managing Stock & Availability',
        description: 'Limit redemptions and control when rewards are available',
        readTime: '4 min read',
        href: '#managing-stock',
      },
      {
        title: 'Approving Redemptions',
        description: 'Review and approve or deny redemption requests from family members',
        readTime: '4 min read',
        href: '#approving-redemptions',
      },
      {
        title: 'Viewing Family Leaderboard',
        description: 'See who&apos;s earning the most points and encourage friendly competition',
        readTime: '3 min read',
        href: '#leaderboard',
      },
    ],
  },
  {
    title: 'FAQ & Troubleshooting',
    icon: HelpCircle,
    color: 'from-teal-500 to-teal-600',
    articles: [
      {
        title: 'Common Questions',
        description: 'Answers to frequently asked questions about the rewards system',
        readTime: '5 min read',
        href: '#faq',
      },
      {
        title: 'Points Not Showing Up',
        description: 'Troubleshoot missing points and sync issues',
        readTime: '3 min read',
        href: '#missing-points',
      },
      {
        title: 'Redemption Issues',
        description: 'What to do if your redemption is stuck or denied',
        readTime: '4 min read',
        href: '#redemption-issues',
      },
      {
        title: 'Best Practices for Families',
        description: 'Tips for making the rewards system work well for everyone',
        readTime: '5 min read',
        href: '#best-practices',
      },
    ],
  },
];

export default function RewardsDocumentationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/30 from-gray-950 to-orange-950/20">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings/documentation"
              className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Documentation
            </Link>

            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Rewards Shop
              </h1>
              <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Motivate your family with a fun rewards system. Kids earn points by completing chores,
                then redeem them for rewards you create. Parents manage the catalog and approve redemptions.
              </p>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="mb-12 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Earn Points */}
              <div className="p-6 bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 flex items-center justify-center mb-4">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Earn Points</h3>
                <p className="text-sm text-gray-400">
                  Complete chores and tasks to earn points based on difficulty
                </p>
              </div>

              {/* Browse Rewards */}
              <div className="p-6 bg-gradient-to-br from-amber-50 from-amber-900/30 to-orange-900/30 backdrop-blur-sm border-2 border-amber-700 rounded-2xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-bold bg-amber-500 text-white rounded-full">FUN</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Browse Rewards</h3>
                <p className="text-sm text-gray-400">
                  Explore custom rewards your family has created
                </p>
              </div>

              {/* Redeem & Enjoy */}
              <div className="p-6 bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mb-4">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Redeem & Enjoy</h3>
                <p className="text-sm text-gray-400">
                  Spend points on rewards you&apos;ve earned through hard work
                </p>
              </div>
            </div>
          </div>

          {/* Motivation Banner */}
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">Make Chores Fun!</h3>
                  <p className="text-white/90">
                    The rewards system turns household responsibilities into opportunities. Kids learn the value of
                    work while earning treats they actually want!
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl">
                  <Star className="w-5 h-5" />
                  <span className="font-semibold">Family Plan</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guide Sections */}
          <div className="space-y-12">
            {guideSections.map((section, sectionIndex) => {
              const SectionIcon = section.icon;

              return (
                <div key={section.title} className="max-w-6xl mx-auto">
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${section.color} flex items-center justify-center shadow-lg`}>
                      <SectionIcon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white">
                        {section.title}
                      </h2>
                      <p className="text-gray-400 mt-1">
                        Section {sectionIndex + 1} of {guideSections.length}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.articles.map((article, index) => (
                      <Link
                        key={index}
                        href={article.href}
                        className="group p-6 bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 hover:border-amber-600 rounded-2xl hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                            {article.title}
                          </h3>
                          <span className="text-xs font-medium text-amber-400 bg-amber-900/30 px-2 py-1 rounded-full whitespace-nowrap ml-3">
                            {article.readTime}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed mb-4">
                          {article.description}
                        </p>
                        <div className="flex items-center text-sm font-semibold text-amber-400">
                          Read guide
                          <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Reference */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="p-8 bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">How It Works</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                    <ListChecks className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">1. Complete Tasks</h4>
                  <p className="text-sm text-gray-400">
                    Finish assigned chores and tasks
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center mb-4">
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">2. Earn Points</h4>
                  <p className="text-sm text-gray-400">
                    Points awarded based on task difficulty
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                    <ShoppingBag className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">3. Choose Rewards</h4>
                  <p className="text-sm text-gray-400">
                    Browse and select from available rewards
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-pink-500 to-pink-600 flex items-center justify-center mb-4">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">4. Redeem & Enjoy</h4>
                  <p className="text-sm text-gray-400">
                    Get approval and receive your reward
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* DETAILED ARTICLE CONTENT SECTIONS */}
          {/* ============================================ */}

          <div className="mt-20 space-y-16 max-w-4xl mx-auto">

            {/* SECTION: Introduction to Rewards Shop */}
            <section id="intro" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Introduction to Rewards Shop</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The Rewards Shop is Rowan&apos;s gamification feature designed to make household chores more engaging, especially for families with children. Instead of nagging kids to do their tasks, the rewards system creates positive motivation by letting them earn points for completed work and redeem those points for prizes they actually want.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Why Use the Rewards System?</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li><strong>Motivation:</strong> Points provide tangible incentive to complete tasks without constant reminders</li>
                  <li><strong>Life Skills:</strong> Kids learn about earning, saving, and delayed gratification</li>
                  <li><strong>Fairness:</strong> Clear point values mean everyone knows what tasks are worth</li>
                  <li><strong>Customization:</strong> Create rewards that match your family&apos;s values and your children&apos;s interests</li>
                  <li><strong>Positive Reinforcement:</strong> Focus on rewards rather than punishments for household participation</li>
                </ul>
                <div className="p-4 bg-amber-900/30 border border-amber-800 rounded-lg mt-6">
                  <p className="text-amber-200 text-sm">
                    <strong>Family Plan Feature:</strong> The Rewards Shop is available with the Family plan subscription, designed specifically for households with children who want to gamify chore completion.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Understanding Points */}
            <section id="understanding-points" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Understanding Points</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Points are the currency of the Rewards Shop. They&apos;re earned by completing assigned chores and tasks, then spent on rewards from the family catalog. Understanding how points work helps both kids and parents get the most from the system.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Key Point Concepts</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li><strong>Current Balance:</strong> Your spendable points, displayed prominently in the shop</li>
                  <li><strong>Lifetime Earned:</strong> Total points ever earned (shows overall contribution)</li>
                  <li><strong>Pending Points:</strong> Points from tasks awaiting verification (if enabled)</li>
                  <li><strong>Reserved Points:</strong> Points tied to pending redemption requests</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Point Visibility</h3>
                <p className="text-gray-400 leading-relaxed">
                  Your points are displayed at the top of the Rewards Shop page, showing current balance, recent earnings, and lifetime totals. The dashboard also shows a summary widget so you can track progress without visiting the full shop.
                </p>
                <div className="p-4 bg-amber-900/30 border border-amber-800 rounded-lg mt-6">
                  <p className="text-amber-200 text-sm">
                    <strong>Tip:</strong> Points are tied to your user account and persist across sessions. Even if you close the app, your balance is safe!
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Roles */}
            <section id="roles" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Roles: Kids vs Parents</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The Rewards Shop provides different interfaces depending on whether you&apos;re a family member (child) or a parent/admin. This ensures appropriate access controls while keeping the system fun and simple for everyone.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Family Members (Kids)</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>View their point balance and earning history</li>
                  <li>Browse available rewards in the catalog</li>
                  <li>Submit redemption requests</li>
                  <li>Track their pending redemptions</li>
                  <li>See the family leaderboard</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Parents/Admins</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>All family member capabilities, plus:</li>
                  <li>Create, edit, and delete rewards</li>
                  <li>Set point values for rewards</li>
                  <li>Manage stock and availability</li>
                  <li>Approve or deny redemption requests</li>
                  <li>View all family members&apos; point balances</li>
                </ul>
                <p className="text-gray-400 leading-relaxed mt-4">
                  Parents toggle between &quot;Shop View&quot; (the regular browsing experience) and &quot;Manage Rewards&quot; mode using the button in the top-right corner of the Rewards Shop.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Navigating */}
            <section id="navigating" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Navigating the Rewards Shop</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The Rewards Shop is designed to be intuitive and fun. Here&apos;s a quick tour of the main interface elements:
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Points Display</h3>
                <p className="text-gray-400 leading-relaxed">
                  At the top of the shop, you&apos;ll see your current point balance prominently displayed along with recent earnings and achievements. This section also shows your rank on the family leaderboard.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Rewards Catalog</h3>
                <p className="text-gray-400 leading-relaxed">
                  Below the points display is the main catalog showing all available rewards. Each reward card shows the name, description, point cost, and availability status. Cards are sorted by point cost from lowest to highest by default.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Leaderboard Widget</h3>
                <p className="text-gray-400 leading-relaxed">
                  A sidebar widget shows the family leaderboard ranking members by points earned. This adds a fun competitive element while celebrating everyone&apos;s contributions.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Quick Actions</h3>
                <p className="text-gray-400 leading-relaxed">
                  The &quot;Earn More Points&quot; button links directly to the Tasks page where you can find chores to complete. Parents also see a &quot;Manage Rewards&quot; toggle button.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Earning Chores */}
            <section id="earning-chores" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                  <ListChecks className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Completing Chores for Points</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The primary way to earn points is by completing assigned chores and tasks. When you mark a task as complete, points are automatically added to your balance (unless verification is required).
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How It Works</h3>
                <ol className="list-decimal list-inside text-gray-400 space-y-2">
                  <li>View your assigned tasks on the Tasks page</li>
                  <li>Complete the task in real life</li>
                  <li>Mark the task as &quot;Complete&quot; in the app</li>
                  <li>Points are credited to your account</li>
                  <li>Check your new balance in the Rewards Shop</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Task Assignment Matters</h3>
                <p className="text-gray-400 leading-relaxed">
                  Points are awarded to whoever is assigned to the task. If a task is unassigned, the person who completes it receives the points. If you complete someone else&apos;s task, you may need parent approval before points are credited.
                </p>
                <div className="p-4 bg-yellow-900/30 border border-yellow-800 rounded-lg mt-6">
                  <p className="text-yellow-200 text-sm">
                    <strong>Pro Tip:</strong> Look for tasks marked with bonus point indicators - these may offer extra points for early completion or are especially important to your family!
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Point Values */}
            <section id="point-values" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Point Values & Multipliers</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Not all tasks are created equal! Point values are typically assigned based on the difficulty, time required, and importance of each task. This creates a fair system where harder work is rewarded more.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Typical Point Ranges</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li><strong>Quick Tasks (5-10 pts):</strong> Making bed, putting away dishes, feeding pets</li>
                  <li><strong>Medium Tasks (15-25 pts):</strong> Vacuuming a room, cleaning bathroom, taking out trash</li>
                  <li><strong>Large Tasks (30-50 pts):</strong> Mowing lawn, deep cleaning, washing car</li>
                  <li><strong>Special Projects (50+ pts):</strong> Major organizing, helping with home projects</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Point Multipliers</h3>
                <p className="text-gray-400 leading-relaxed">
                  Some circumstances may multiply point earnings: completing tasks ahead of schedule, maintaining streaks, or tackling especially unpopular chores might earn bonus multipliers set by parents.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Bonus Points */}
            <section id="bonus-points" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Bonus Points & Streaks</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Beyond base task points, there are several ways to earn bonus points that accelerate your progress toward rewards.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Streak Bonuses</h3>
                <p className="text-gray-400 leading-relaxed">
                  Completing tasks consistently builds streaks. Daily completion streaks can unlock bonus point multipliers - the longer your streak, the bigger the bonus!
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Early Completion</h3>
                <p className="text-gray-400 leading-relaxed">
                  Finishing tasks before their deadline may award bonus points. Parents can configure early-bird bonuses to encourage proactive task completion.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Achievement Bonuses</h3>
                <p className="text-gray-400 leading-relaxed">
                  Special one-time bonuses may be awarded for achievements like &quot;First 100 points&quot;, &quot;7-day streak&quot;, or &quot;Completed 50 tasks&quot;.
                </p>
                <div className="p-4 bg-yellow-900/30 border border-yellow-800 rounded-lg mt-6">
                  <p className="text-yellow-200 text-sm">
                    <strong>Keep It Going:</strong> Streaks reset if you miss a day, so try to complete at least one task daily to maintain your bonus multiplier!
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Points History */}
            <section id="points-history" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Viewing Your Points History</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Tracking your point history helps you understand your earning patterns and celebrate your progress over time.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What&apos;s Tracked</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li><strong>Point Earnings:</strong> Each task completion with points awarded</li>
                  <li><strong>Redemptions:</strong> Points spent on rewards</li>
                  <li><strong>Bonuses:</strong> Extra points from streaks or achievements</li>
                  <li><strong>Running Balance:</strong> Your point total over time</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Viewing History</h3>
                <p className="text-gray-400 leading-relaxed">
                  Click on your point balance in the Rewards Shop to see a detailed breakdown of recent transactions. The display shows earnings, spending, and your current balance with timestamps for each activity.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Browsing Rewards */}
            <section id="browsing-rewards" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Browsing Available Rewards</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The rewards catalog is the heart of the shop - it&apos;s where you&apos;ll find all the prizes available for redemption. Browsing is designed to be fun and engaging!
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Reward Cards</h3>
                <p className="text-gray-400 leading-relaxed">
                  Each reward is displayed as a card showing the reward name, description, point cost, and availability status. Cards you can afford are highlighted, while those above your balance are shown with the points needed.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Sorting & Filtering</h3>
                <p className="text-gray-400 leading-relaxed">
                  Rewards can be sorted by point cost (low to high or high to low), name, or most recently added. You can also filter by category or show only rewards you can currently afford.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Reward Details</h3>
                <p className="text-gray-400 leading-relaxed">
                  Click on any reward card to see full details including the complete description, any restrictions or notes, stock availability, and the redeem button.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Reward Tiers */}
            <section id="reward-tiers" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Understanding Reward Tiers</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rewards typically fall into tiers based on point cost. This creates goals at every level - quick wins for immediate gratification and bigger prizes worth saving for.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Small Rewards (25-100 pts)</h3>
                <p className="text-gray-400 leading-relaxed">
                  Quick treats that can be earned in a few days: extra screen time, choosing dinner, small snacks, or staying up 15 minutes late.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Medium Rewards (100-300 pts)</h3>
                <p className="text-gray-400 leading-relaxed">
                  Worth saving up for a week or two: movie night with popcorn, new book or small toy, friend sleepover, or skip one chore day.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Large Rewards (300-1000 pts)</h3>
                <p className="text-gray-400 leading-relaxed">
                  Big prizes that require real commitment: day trip, larger toy or game, special experience, or significant privilege.
                </p>
                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Balance Tip:</strong> A good rewards catalog includes options at every tier so there&apos;s always something achievable while also providing aspirational goals.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Reward Categories */}
            <section id="reward-categories" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Reward Categories</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rewards can be organized into categories to help with browsing and to ensure variety in your family&apos;s catalog.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Common Categories</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li><strong>Screen Time:</strong> Extra TV, gaming, or device time</li>
                  <li><strong>Treats:</strong> Special snacks, desserts, or favorite foods</li>
                  <li><strong>Experiences:</strong> Outings, activities, or special events</li>
                  <li><strong>Privileges:</strong> Staying up late, choosing activities, skipping chores</li>
                  <li><strong>Items:</strong> Small toys, books, games, or other physical rewards</li>
                  <li><strong>Quality Time:</strong> One-on-one time with parents, special activities together</li>
                </ul>
                <p className="text-gray-400 leading-relaxed mt-4">
                  Parents can create custom categories that match your family&apos;s values and your children&apos;s interests.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Reward Availability */}
            <section id="reward-availability" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Checking Reward Availability</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Not all rewards are available all the time. Understanding availability helps you plan which rewards to save for.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Availability Types</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li><strong>Always Available:</strong> Can be redeemed anytime (most rewards)</li>
                  <li><strong>Limited Stock:</strong> Only a set number available (e.g., only 2 movie nights per month)</li>
                  <li><strong>Seasonal:</strong> Available only during certain times (summer activities, holiday treats)</li>
                  <li><strong>Temporarily Unavailable:</strong> Paused by parents (busy week, special circumstances)</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Availability Indicators</h3>
                <p className="text-gray-400 leading-relaxed">
                  Each reward card shows its availability status. Green indicates available, yellow means limited stock, and gray means currently unavailable. Hover or tap for details.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: How to Redeem */}
            <section id="how-to-redeem" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">How to Redeem a Reward</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  When you&apos;ve earned enough points for a reward you want, redeeming is straightforward. Here&apos;s the step-by-step process:
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Redemption Steps</h3>
                <ol className="list-decimal list-inside text-gray-400 space-y-2">
                  <li>Navigate to the Rewards Shop</li>
                  <li>Browse and find the reward you want</li>
                  <li>Ensure you have enough points (shown on the card)</li>
                  <li>Click the &quot;Redeem&quot; button on the reward card</li>
                  <li>Confirm your redemption in the popup</li>
                  <li>Your request is submitted for parent approval</li>
                  <li>Once approved, enjoy your reward!</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Points Reservation</h3>
                <p className="text-gray-400 leading-relaxed">
                  When you submit a redemption request, the points are &quot;reserved&quot; - they&apos;re deducted from your spendable balance but not permanently spent until approved. If denied, points are returned.
                </p>
                <div className="p-4 bg-pink-900/30 border border-pink-800 rounded-lg mt-6">
                  <p className="text-pink-200 text-sm">
                    <strong>Note:</strong> You can&apos;t cancel a redemption request once submitted. Make sure you really want the reward before confirming!
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Approval Process */}
            <section id="approval-process" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Redemption Approval Process</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Most redemptions require parent approval. This ensures rewards are claimed at appropriate times and gives parents oversight of the system.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Why Approval?</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>Ensures timing works for the family</li>
                  <li>Confirms tasks were actually completed properly</li>
                  <li>Allows parents to schedule experience-based rewards</li>
                  <li>Prevents accidental redemptions</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Approval Timeline</h3>
                <p className="text-gray-400 leading-relaxed">
                  Parents receive a notification when redemptions are submitted. They can approve, deny (with a reason), or mark as fulfilled from the Pending Redemptions section in management mode.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">If Denied</h3>
                <p className="text-gray-400 leading-relaxed">
                  If a redemption is denied, your reserved points are returned to your balance. The denial reason is shown so you understand why.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Tracking Redemptions */}
            <section id="tracking-redemptions" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Tracking Your Redemptions</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  After submitting a redemption request, you can track its status through the approval and fulfillment process.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Redemption Statuses</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li><strong>Pending:</strong> Awaiting parent review and approval</li>
                  <li><strong>Approved:</strong> Confirmed, awaiting fulfillment</li>
                  <li><strong>Fulfilled:</strong> Reward has been delivered/completed</li>
                  <li><strong>Denied:</strong> Request was declined with reason</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Where to Check</h3>
                <p className="text-gray-400 leading-relaxed">
                  Your active redemptions are shown in the Points Display section of the Rewards Shop. Click to see details on all pending and recent redemptions.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: After Approval */}
            <section id="after-approval" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">What Happens After Approval</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Once a parent approves your redemption, the reward moves to the fulfillment phase. What happens next depends on the type of reward.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Immediate Rewards</h3>
                <p className="text-gray-400 leading-relaxed">
                  Some rewards like screen time or privilege passes are available immediately after approval. You can claim them right away.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Scheduled Rewards</h3>
                <p className="text-gray-400 leading-relaxed">
                  Experience-based rewards like outings or special activities may need to be scheduled. Parents will coordinate timing with you.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Physical Rewards</h3>
                <p className="text-gray-400 leading-relaxed">
                  Items like toys or games may need to be purchased. Parents mark these as fulfilled once delivered to you.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Creating Rewards */}
            <section id="creating-rewards" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Creating Custom Rewards</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Parents can create custom rewards tailored to their children&apos;s interests and family values. A good reward catalog is key to keeping kids motivated!
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Creating a New Reward</h3>
                <ol className="list-decimal list-inside text-gray-400 space-y-2">
                  <li>Click &quot;Manage Rewards&quot; in the shop header</li>
                  <li>Click the &quot;Add Reward&quot; button</li>
                  <li>Enter a name that kids will understand</li>
                  <li>Add a description with any details or restrictions</li>
                  <li>Set the point cost</li>
                  <li>Choose a category (optional)</li>
                  <li>Set availability and stock limits (optional)</li>
                  <li>Save the reward</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Reward Ideas</h3>
                <p className="text-gray-400 leading-relaxed">
                  Get creative! Consider screen time, special treats, one-on-one activities, privilege passes (skip a chore, stay up late), small purchases, or experience-based rewards like choosing the weekend activity.
                </p>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Pro Tip:</strong> Include your kids in brainstorming rewards. They&apos;ll be more motivated to earn things they helped choose!
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Setting Values */}
            <section id="setting-values" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Setting Point Values</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Balancing reward costs is crucial for a successful system. Prices should encourage saving while remaining achievable.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Pricing Guidelines</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li><strong>Quick rewards (1-3 days):</strong> 25-75 points</li>
                  <li><strong>Weekly goals:</strong> 100-200 points</li>
                  <li><strong>Monthly goals:</strong> 300-500 points</li>
                  <li><strong>Special big-ticket items:</strong> 500-1000+ points</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Finding the Balance</h3>
                <p className="text-gray-400 leading-relaxed">
                  Consider how many points kids can reasonably earn per week from their assigned chores. Ensure at least some rewards are achievable within that timeframe for ongoing motivation.
                </p>
                <p className="text-gray-400 leading-relaxed mt-4">
                  You can always adjust prices later if rewards seem too easy or too hard to earn.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Managing Stock */}
            <section id="managing-stock" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Managing Stock & Availability</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Some rewards shouldn&apos;t be unlimited. Stock and availability controls help manage special rewards appropriately.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Stock Limits</h3>
                <p className="text-gray-400 leading-relaxed">
                  Set a maximum number of redemptions per time period. For example, &quot;Skip a chore&quot; might be limited to twice per month per child.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Temporary Unavailability</h3>
                <p className="text-gray-400 leading-relaxed">
                  Toggle rewards to unavailable during busy periods without deleting them. Perfect for managing seasonal rewards or pausing during special circumstances.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Editing Rewards</h3>
                <p className="text-gray-400 leading-relaxed">
                  You can edit any reward&apos;s name, description, price, or availability at any time. Changes don&apos;t affect pending redemptions.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Approving Redemptions */}
            <section id="approving-redemptions" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Approving Redemptions</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  When kids request rewards, parents review and approve or deny them from the management interface.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Reviewing Requests</h3>
                <ol className="list-decimal list-inside text-gray-400 space-y-2">
                  <li>Go to &quot;Manage Rewards&quot; mode</li>
                  <li>View the &quot;Pending Redemptions&quot; section</li>
                  <li>See who requested what and when</li>
                  <li>Verify tasks were completed properly</li>
                  <li>Click Approve or Deny</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">When to Deny</h3>
                <p className="text-gray-400 leading-relaxed">
                  Consider denying if tasks weren&apos;t actually completed properly, timing doesn&apos;t work (e.g., movie night during a busy week), or there are behavior issues that need addressing.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Marking as Fulfilled</h3>
                <p className="text-gray-400 leading-relaxed">
                  After delivering the reward, mark the redemption as &quot;Fulfilled&quot; to complete the cycle and clear it from pending items.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Leaderboard */}
            <section id="leaderboard" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Viewing Family Leaderboard</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The leaderboard adds a fun competitive element, showing who&apos;s earning the most points and encouraging everyone to contribute.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What&apos;s Shown</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>Family member rankings by points earned</li>
                  <li>Current point balances</li>
                  <li>Recent point activity</li>
                  <li>Achievement badges or streaks</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Healthy Competition</h3>
                <p className="text-gray-400 leading-relaxed">
                  The leaderboard is meant to encourage, not discourage. Consider celebrating improvements and personal bests rather than only focusing on who&apos;s #1.
                </p>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Tip:</strong> If competition becomes problematic, focus on personal goals instead. The real victory is building good habits, not beating siblings!
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: FAQ */}
            <section id="faq" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Common Questions</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-white">Can points expire?</h4>
                    <p className="text-gray-400">No, earned points don&apos;t expire. Kids can save as long as they want for bigger rewards.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Can kids transfer points to each other?</h4>
                    <p className="text-gray-400">Currently, points are personal and can&apos;t be transferred between family members.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">What happens if I delete a reward?</h4>
                    <p className="text-gray-400">Pending redemptions for that reward will need to be handled first. The reward can&apos;t be deleted while there are pending requests.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Can I adjust point values after kids have earned them?</h4>
                    <p className="text-gray-400">Changing task point values only affects future completions. Previously earned points remain unchanged.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Is the Rewards Shop available on the free plan?</h4>
                    <p className="text-gray-400">The Rewards Shop is a Family plan feature, designed specifically for households with children.</p>
                  </div>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Missing Points */}
            <section id="missing-points" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Points Not Showing Up</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  If points aren&apos;t appearing after completing tasks, here are some troubleshooting steps:
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Common Causes</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li><strong>Verification pending:</strong> If task verification is enabled, points may await parent confirmation</li>
                  <li><strong>Wrong assignment:</strong> Points go to whoever is assigned, not necessarily who marked complete</li>
                  <li><strong>Sync delay:</strong> Wait a few seconds and refresh the page</li>
                  <li><strong>Task not point-eligible:</strong> Some tasks may not have point values assigned</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What to Do</h3>
                <ol className="list-decimal list-inside text-gray-400 space-y-2">
                  <li>Refresh the Rewards Shop page</li>
                  <li>Check your points history for recent activity</li>
                  <li>Ask a parent to check if verification is pending</li>
                  <li>Verify the task had a point value assigned</li>
                </ol>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Redemption Issues */}
            <section id="redemption-issues" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Redemption Issues</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  If you&apos;re having trouble with redemptions, here&apos;s how to resolve common issues:
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Stuck in Pending</h3>
                <p className="text-gray-400 leading-relaxed">
                  If your redemption has been pending for a while, remind your parents to check the Pending Redemptions section. They may not have seen the notification.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Denied Redemption</h3>
                <p className="text-gray-400 leading-relaxed">
                  Check the denial reason in your redemption history. Your points are returned, and you can try again later or choose a different reward.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Can&apos;t Find Redeem Button</h3>
                <p className="text-gray-400 leading-relaxed">
                  The redeem button only appears when you have enough points and the reward is available. Check your balance and the reward&apos;s availability status.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* SECTION: Best Practices */}
            <section id="best-practices" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Best Practices for Families</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Make the rewards system work well for your whole family with these proven strategies:
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">For Parents</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>Include kids in creating the reward catalog - they&apos;ll be more motivated</li>
                  <li>Balance immediate gratification rewards with savings goals</li>
                  <li>Be consistent with approval timing - don&apos;t leave kids waiting</li>
                  <li>Celebrate effort, not just points earned</li>
                  <li>Adjust the system if it&apos;s not working - it should be fun, not stressful</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">For Kids</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>Set goals for specific rewards you want</li>
                  <li>Complete tasks thoroughly - quality work is more important than rushing</li>
                  <li>Save some points for bigger rewards instead of spending everything immediately</li>
                  <li>Suggest new rewards you&apos;d like to earn</li>
                </ul>
                <div className="p-4 bg-teal-900/30 border border-teal-800 rounded-lg mt-6">
                  <p className="text-teal-200 text-sm">
                    <strong>Remember:</strong> The goal is to make chores more engaging while teaching valuable life lessons about work, earning, and delayed gratification. Keep it positive and fun!
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

          </div>

        </div>
      </div>
  );
}
