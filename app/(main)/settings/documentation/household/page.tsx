'use client';

import Link from 'next/link';

import { Home, CheckSquare, DollarSign, Calendar, TrendingUp, AlertCircle, Receipt, Target, Clock, Users, ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface GuideSection {
  title: string;
  description: string;
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
    description: 'Learn the basics of household and budget management',
    icon: Home,
    color: 'from-amber-500 to-amber-600',
    articles: [
      {
        title: 'Understanding Household Management',
        description: 'Learn how to organize your household with chores, bills, and budget tracking',
        readTime: '3 min',
        href: '#understanding-household',
      },
      {
        title: 'Setting Up Your First Budget',
        description: 'Create your household budget and expense categories',
        readTime: '5 min',
        href: '#first-budget',
      },
      {
        title: 'Creating Household Chores',
        description: 'Set up recurring chores and assign them to family members',
        readTime: '4 min',
        href: '#creating-chores',
      },
    ],
  },
  {
    title: 'Chore Management',
    description: 'Master household chore organization and tracking',
    icon: CheckSquare,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Chore Status System',
        description: 'Understand chore statuses: pending, in-progress, blocked, on-hold, completed',
        readTime: '3 min',
        href: '#chore-status',
      },
      {
        title: 'Chore Assignment & Rotation',
        description: 'Assign chores to family members and set up rotation schedules',
        readTime: '5 min',
        href: '#chore-assignment',
      },
      {
        title: 'Recurring Chores',
        description: 'Set up daily, weekly, monthly, and yearly recurring chores',
        readTime: '4 min',
        href: '#recurring-chores',
      },
      {
        title: 'Chore Calendar Integration',
        description: 'Sync chores with your calendar and set reminders',
        readTime: '3 min',
        href: '#chore-calendar',
      },
    ],
  },
  {
    title: 'Budget & Expense Tracking',
    description: 'Track household expenses and manage your budget',
    icon: DollarSign,
    color: 'from-green-500 to-green-600',
    articles: [
      {
        title: 'Expense Categories',
        description: 'Organize expenses with categories like groceries, utilities, entertainment',
        readTime: '4 min',
        href: '#expense-categories',
      },
      {
        title: 'Monthly Budget Planning',
        description: 'Set monthly budgets and track spending against targets',
        readTime: '6 min',
        href: '#budget-planning',
      },
      {
        title: 'Expense Analytics',
        description: 'View spending trends, category breakdowns, and financial insights',
        readTime: '5 min',
        href: '#expense-analytics',
      },
      {
        title: 'Budget Alerts',
        description: 'Set up notifications when approaching budget limits',
        readTime: '3 min',
        href: '#budget-alerts',
      },
    ],
  },
  {
    title: 'Bills & Payments',
    description: 'Never miss a payment with bill tracking',
    icon: Receipt,
    color: 'from-red-500 to-red-600',
    articles: [
      {
        title: 'Adding Bills',
        description: 'Set up recurring bills with due dates and amounts',
        readTime: '4 min',
        href: '#adding-bills',
      },
      {
        title: 'Bill Payment Tracking',
        description: 'Mark bills as paid and track payment history',
        readTime: '3 min',
        href: '#payment-tracking',
      },
      {
        title: 'Bill Reminders',
        description: 'Get notified before bills are due',
        readTime: '2 min',
        href: '#bill-reminders',
      },
      {
        title: 'Auto-Expense Creation',
        description: 'Automatically create expenses when marking bills as paid',
        readTime: '4 min',
        href: '#auto-expenses',
      },
    ],
  },
  {
    title: 'Analytics & Reporting',
    description: 'Get insights into your household management',
    icon: TrendingUp,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Chore Analytics',
        description: 'Track completion rates, overdue chores, and assignment balance',
        readTime: '4 min',
        href: '#chore-analytics',
      },
      {
        title: 'Budget Reports',
        description: 'Monthly and yearly budget vs actual spending reports',
        readTime: '5 min',
        href: '#budget-reports',
      },
      {
        title: 'Household Dashboard',
        description: 'Overview of chores, bills, and expenses in one place',
        readTime: '3 min',
        href: '#household-dashboard',
      },
    ],
  },
  {
    title: 'Collaboration Features',
    description: 'Work together on household management',
    icon: Users,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Shared Responsibility',
        description: 'Assign chores and bills to different family members',
        readTime: '4 min',
        href: '#shared-responsibility',
      },
      {
        title: 'Partner Notifications',
        description: 'Keep everyone informed about chore completions and bill payments',
        readTime: '3 min',
        href: '#partner-notifications',
      },
      {
        title: 'Family Meetings',
        description: 'Use analytics to discuss household management during family meetings',
        readTime: '5 min',
        href: '#family-meetings',
      },
    ],
  },
  {
    title: 'Advanced Features & Automation',
    description: 'Leverage advanced features for streamlined household management',
    icon: Target,
    color: 'from-indigo-500 to-indigo-600',
    articles: [
      {
        title: 'Smart Home Integration',
        description: 'Connect with smart home devices and IoT sensors for automated tracking',
        readTime: '6 min',
        href: '#smart-home',
      },
      {
        title: 'Seasonal Planning',
        description: 'Set up seasonal chores, budget adjustments, and holiday planning',
        readTime: '5 min',
        href: '#seasonal-planning',
      },
      {
        title: 'Emergency Fund Tracking',
        description: 'Monitor emergency savings and unexpected expense handling',
        readTime: '4 min',
        href: '#emergency-fund',
      },
      {
        title: 'Multi-Property Management',
        description: 'Manage chores and budgets across multiple properties or rental units',
        readTime: '7 min',
        href: '#multi-property',
      },
    ],
  },
  {
    title: 'Troubleshooting & Tips',
    description: 'Common questions and solutions for household management',
    icon: AlertCircle,
    color: 'from-orange-500 to-orange-600',
    articles: [
      {
        title: 'Handling Irregular Income',
        description: 'Budget strategies for freelancers and variable income households',
        readTime: '5 min',
        href: '#irregular-income',
      },
      {
        title: 'Motivating Family Members',
        description: 'Tips for encouraging chore completion and budget compliance',
        readTime: '4 min',
        href: '#family-motivation',
      },
      {
        title: 'Data Recovery & Backup',
        description: 'Protecting your household data and recovering lost information',
        readTime: '3 min',
        href: '#data-backup',
      },
      {
        title: 'Performance Optimization',
        description: 'Keep your household management system running smoothly',
        readTime: '4 min',
        href: '#performance-tips',
      },
    ],
  },
];

export default function HouseholdDocumentationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/30 to-orange-950/20">
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Home className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Household & Budget
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Master household management with chore tracking, budget management, and bill organization
              </p>
            </div>
          </div>

          {/* Guide Sections */}
          <div className="space-y-12">
            {guideSections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 rounded-3xl overflow-hidden shadow-lg">
                  {/* Section Header */}
                  <div className={`p-8 bg-gradient-to-r ${section.color} text-white`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold mb-2">{section.title}</h2>
                        <p className="text-white/90">{section.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Articles Grid */}
                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {section.articles.map((article) => (
                        <a
                          key={article.title}
                          href={article.href}
                          className="group p-6 bg-gray-800 rounded-2xl border border-gray-700 hover:shadow-lg hover:border-amber-600 transition-all duration-200 hover:-translate-y-1"
                        >
                          <h3 className="font-semibold text-white mb-3 group-hover:text-amber-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                            {article.description}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-400 font-medium">
                              {article.readTime}
                            </span>
                            <Clock className="w-3 h-3 text-gray-400" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pro Tips */}
          <div className="mt-12 p-6 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-2xl border border-blue-800">
            <h3 className="text-lg font-semibold text-white mb-4">💡 Pro Tips</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Set realistic schedules:</strong> Don&apos;t overwhelm yourself with too many chores on the same day</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Use the rotation feature:</strong> Automatically rotate chores between family members to keep things fair</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Track everything:</strong> Log all expenses to get accurate budget insights and identify spending patterns</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Review monthly:</strong> Check your household analytics monthly to optimize chores and budget allocation</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Plan for seasonality:</strong> Use seasonal planning to budget for holidays, vacations, and weather-related expenses</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Involve everyone:</strong> Hold weekly family meetings to discuss chores, budget progress, and upcoming expenses</p>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* ARTICLE CONTENT SECTIONS */}
          {/* ============================================================ */}
          <div className="mt-16 space-y-16">

            {/* ============================================================ */}
            {/* GETTING STARTED */}
            {/* ============================================================ */}

            {/* Understanding Household Management */}
            <section id="understanding-household" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Understanding Household Management</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan&apos;s Household Management feature brings all aspects of running a home into one unified system. From daily chores to monthly bills, from grocery budgets to utility expenses, everything is organized, tracked, and shareable with your household members.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Key Components</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Chore Tracking:</strong> Create, assign, and track household chores with recurring schedules</li>
                  <li><strong>Budget Management:</strong> Set spending limits by category and monitor your household finances</li>
                  <li><strong>Bill Organization:</strong> Never miss a payment with due date tracking and reminders</li>
                  <li><strong>Expense Logging:</strong> Record every purchase and see where your money goes</li>
                  <li><strong>Analytics Dashboard:</strong> Visualize your household efficiency with charts and insights</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Why Use Household Management?</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Managing a household involves countless moving parts. Without a system, it&apos;s easy for chores to pile up, bills to slip through the cracks, and budgets to go off track. Rowan centralizes everything so your entire household stays organized and accountable.
                </p>
                <div className="p-4 bg-amber-900/30 border border-amber-800 rounded-lg mt-6">
                  <p className="text-amber-200 text-sm">
                    <strong>Start Simple:</strong> You don&apos;t need to use every feature at once. Start with chores or bills, then gradually add budget tracking as you get comfortable with the system.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Setting Up Your First Budget */}
            <section id="first-budget" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Setting Up Your First Budget</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Creating a household budget is the foundation of financial awareness. Rowan makes it easy to set up budgets by category, track spending in real-time, and adjust as needed throughout the month.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Step-by-Step Budget Setup</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-400">
                  <li><strong>Navigate to Household:</strong> Go to the Household page from the main navigation</li>
                  <li><strong>Select Budget tab:</strong> Click on the Budget section to view budget settings</li>
                  <li><strong>Add categories:</strong> Create budget categories like Groceries, Utilities, Entertainment</li>
                  <li><strong>Set amounts:</strong> Assign a monthly budget amount to each category</li>
                  <li><strong>Review total:</strong> Ensure your total budget aligns with your household income</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Common Budget Categories</h3>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <ul className="list-disc list-inside space-y-2 text-gray-400">
                    <li>Groceries & Food</li>
                    <li>Utilities (Electric, Gas, Water)</li>
                    <li>Internet & Phone</li>
                    <li>Transportation</li>
                    <li>Healthcare</li>
                  </ul>
                  <ul className="list-disc list-inside space-y-2 text-gray-400">
                    <li>Entertainment</li>
                    <li>Subscriptions</li>
                    <li>Home Maintenance</li>
                    <li>Personal Care</li>
                    <li>Miscellaneous</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg mt-6">
                  <p className="text-green-200 text-sm">
                    <strong>Pro Tip:</strong> Review your bank statements from the past 3 months before setting budget amounts. This gives you realistic baselines for each category.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Creating Household Chores */}
            <section id="creating-chores" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Creating Household Chores</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Household chores are recurring tasks that keep your home running smoothly. Unlike one-time tasks, chores are designed to repeat on schedules you define, ensuring nothing gets forgotten.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Creating a New Chore</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-400">
                  <li><strong>Open Chores section:</strong> Navigate to Household and select the Chores tab</li>
                  <li><strong>Click &quot;Add Chore&quot;:</strong> Use the + button to create a new chore</li>
                  <li><strong>Enter details:</strong> Add a name, description, and estimated duration</li>
                  <li><strong>Set recurrence:</strong> Choose daily, weekly, monthly, or custom schedule</li>
                  <li><strong>Assign (optional):</strong> Assign to a specific household member or leave unassigned</li>
                  <li><strong>Save:</strong> Your chore will appear in the chore list and calendar</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Example Chores to Track</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Daily:</strong> Dishes, making beds, taking out trash</li>
                  <li><strong>Weekly:</strong> Vacuuming, laundry, bathroom cleaning, grocery shopping</li>
                  <li><strong>Monthly:</strong> Deep cleaning, changing air filters, checking smoke detectors</li>
                  <li><strong>Yearly:</strong> Gutter cleaning, HVAC maintenance, window washing</li>
                </ul>
                <div className="p-4 bg-amber-900/30 border border-amber-800 rounded-lg mt-6">
                  <p className="text-amber-200 text-sm">
                    <strong>Keep it Manageable:</strong> Start with essential chores and add more over time. An overwhelming chore list can be discouraging rather than helpful.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* CHORE MANAGEMENT */}
            {/* ============================================================ */}

            {/* Chore Status System */}
            <section id="chore-status" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Chore Status System</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Every chore in Rowan has a status that indicates its current state. Understanding these statuses helps you and your household track what needs attention and what&apos;s been accomplished.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Available Statuses</h3>
                <ul className="list-disc list-inside space-y-3 text-gray-400">
                  <li><strong>Pending:</strong> The chore is due and waiting to be started. This is the default status for scheduled chores.</li>
                  <li><strong>In Progress:</strong> Someone has started working on this chore but hasn&apos;t finished yet.</li>
                  <li><strong>Blocked:</strong> The chore can&apos;t be completed right now due to an external dependency (e.g., waiting for supplies).</li>
                  <li><strong>On Hold:</strong> The chore is temporarily postponed but not blocked by anything specific.</li>
                  <li><strong>Completed:</strong> The chore has been finished. For recurring chores, this triggers the next occurrence.</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Changing Status</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Click on any chore to open its detail view, then use the status dropdown or quick-action buttons to change its status. Status changes are logged for analytics purposes.
                </p>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Status Colors:</strong> Each status has a distinct color in the interface so you can quickly scan your chore list and see what needs attention.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Chore Assignment & Rotation */}
            <section id="chore-assignment" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Chore Assignment & Rotation</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Fair distribution of household work is essential for a harmonious home. Rowan lets you assign chores to specific family members and even rotate assignments automatically.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Manual Assignment</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Open a chore and click on the &quot;Assignee&quot; field</li>
                  <li>Select a household member from the dropdown</li>
                  <li>The assigned person will see this chore in their personal dashboard</li>
                  <li>Unassigned chores appear in a shared queue for anyone to claim</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Automatic Rotation</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  For recurring chores, you can enable automatic rotation. This ensures the same person doesn&apos;t always get stuck with the same tasks.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Open a recurring chore&apos;s settings</li>
                  <li>Enable &quot;Rotate Assignee&quot;</li>
                  <li>Select which household members to include in the rotation</li>
                  <li>Each time the chore recurs, it will be assigned to the next person</li>
                </ol>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Fairness Tracking:</strong> Check the Chore Analytics section to see how chores are distributed across family members and ensure everyone is contributing equally.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Recurring Chores */}
            <section id="recurring-chores" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recurring Chores</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Most household tasks happen on a regular schedule. Rowan&apos;s recurring chore system automatically creates new instances so you never have to remember to add them manually.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Recurrence Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Daily:</strong> Repeats every day (e.g., dishes, making beds)</li>
                  <li><strong>Weekly:</strong> Repeats on selected days (e.g., vacuum on Saturdays)</li>
                  <li><strong>Bi-weekly:</strong> Repeats every two weeks</li>
                  <li><strong>Monthly:</strong> Repeats on a specific day of the month</li>
                  <li><strong>Yearly:</strong> Repeats annually (e.g., spring cleaning, HVAC service)</li>
                  <li><strong>Custom:</strong> Set your own interval (e.g., every 3 days)</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How Recurring Chores Work</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>When you complete a recurring chore, the next occurrence is automatically scheduled</li>
                  <li>If you skip a chore, it will show as overdue until completed</li>
                  <li>You can pause recurring chores during vacations or temporary situations</li>
                  <li>The original schedule remains intact and resumes when unpaused</li>
                </ol>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Flexible Schedules:</strong> Weekly chores can be set to specific days (e.g., Monday and Thursday) or just &quot;twice a week&quot; with flexible timing.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Chore Calendar Integration */}
            <section id="chore-calendar" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Chore Calendar Integration</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Your household chores integrate seamlessly with Rowan&apos;s calendar system, giving you a complete view of what&apos;s happening in your home each day.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Calendar Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Visual Overview:</strong> See all chores scheduled for each day in the calendar view</li>
                  <li><strong>Drag and Drop:</strong> Reschedule chores by dragging them to different days</li>
                  <li><strong>Color Coding:</strong> Chores appear in distinct colors alongside events and tasks</li>
                  <li><strong>Filter by Person:</strong> View only your assigned chores or see everyone&apos;s</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Setting Chore Reminders</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Open a chore and navigate to the Reminders section</li>
                  <li>Choose when to be reminded (morning of, day before, etc.)</li>
                  <li>Select notification method (push notification, email, or both)</li>
                  <li>Reminders are sent to the assigned person, or all members if unassigned</li>
                </ol>
                <div className="p-4 bg-blue-900/30 border border-blue-800 rounded-lg mt-6">
                  <p className="text-blue-200 text-sm">
                    <strong>Weekly Planning:</strong> Use the weekly calendar view to balance chores throughout the week and avoid overloading any single day.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* BUDGET & EXPENSE TRACKING */}
            {/* ============================================================ */}

            {/* Expense Categories */}
            <section id="expense-categories" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Expense Categories</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Organizing expenses by category is essential for understanding where your money goes. Rowan provides default categories and lets you create custom ones to match your household&apos;s spending patterns.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Default Categories</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Groceries:</strong> Food and household supplies from grocery stores</li>
                  <li><strong>Utilities:</strong> Electric, gas, water, and sewer bills</li>
                  <li><strong>Transportation:</strong> Gas, car maintenance, public transit, rideshare</li>
                  <li><strong>Entertainment:</strong> Streaming services, outings, hobbies</li>
                  <li><strong>Healthcare:</strong> Doctor visits, medications, health insurance</li>
                  <li><strong>Home Maintenance:</strong> Repairs, improvements, cleaning supplies</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Creating Custom Categories</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Household Settings</li>
                  <li>Select &quot;Expense Categories&quot;</li>
                  <li>Click &quot;Add Category&quot;</li>
                  <li>Enter a name and select a color/icon</li>
                  <li>Optionally set a default budget for this category</li>
                </ol>
                <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg mt-6">
                  <p className="text-green-200 text-sm">
                    <strong>Be Specific:</strong> Instead of one &quot;Shopping&quot; category, consider separate categories like &quot;Groceries,&quot; &quot;Household Supplies,&quot; and &quot;Clothing&quot; for better insights.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Monthly Budget Planning */}
            <section id="budget-planning" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Monthly Budget Planning</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  A monthly budget gives you control over your household finances. Rowan helps you set realistic targets, track progress throughout the month, and make adjustments as needed.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Creating a Monthly Budget</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li><strong>Review income:</strong> Start with your total household income for the month</li>
                  <li><strong>Fixed expenses first:</strong> Allocate money for rent/mortgage, insurance, loan payments</li>
                  <li><strong>Variable necessities:</strong> Budget for groceries, utilities, transportation</li>
                  <li><strong>Discretionary spending:</strong> Entertainment, dining out, shopping</li>
                  <li><strong>Savings goal:</strong> Always include savings as a budget category</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Budget vs. Actual Tracking</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  As you log expenses throughout the month, Rowan compares your actual spending to your budget. You&apos;ll see progress bars showing how much of each budget you&apos;ve used, with color indicators for on-track (green), warning (yellow), and over-budget (red).
                </p>
                <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg mt-6">
                  <p className="text-green-200 text-sm">
                    <strong>The 50/30/20 Rule:</strong> A popular budgeting approach allocates 50% to needs, 30% to wants, and 20% to savings. Rowan can help you implement this framework.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Expense Analytics */}
            <section id="expense-analytics" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Expense Analytics</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Raw numbers only tell part of the story. Rowan&apos;s expense analytics transform your spending data into visual insights that reveal patterns, trends, and opportunities for savings.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Available Analytics</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Category Breakdown:</strong> Pie charts showing where your money goes</li>
                  <li><strong>Monthly Trends:</strong> Line graphs comparing spending month-over-month</li>
                  <li><strong>Top Expenses:</strong> Your largest individual purchases</li>
                  <li><strong>Daily Average:</strong> Your average daily spending rate</li>
                  <li><strong>Projection:</strong> Estimated month-end totals based on current pace</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Using Analytics Effectively</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Check your analytics weekly to stay informed. Look for categories that consistently exceed their budget, and identify areas where you&apos;re under-spending that could be reallocated to other priorities.
                </p>
                <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg mt-6">
                  <p className="text-green-200 text-sm">
                    <strong>Export Reports:</strong> Download your expense data as CSV for tax preparation, financial planning, or sharing with a financial advisor.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Budget Alerts */}
            <section id="budget-alerts" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Budget Alerts</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Stay on top of your spending with automated alerts. Rowan can notify you when you&apos;re approaching or exceeding budget limits, so you can adjust before it&apos;s too late.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Alert Types</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Warning Alert (75%):</strong> Notifies when you&apos;ve used 75% of a category budget</li>
                  <li><strong>Limit Alert (100%):</strong> Notifies when you&apos;ve reached the budget limit</li>
                  <li><strong>Over-Budget Alert:</strong> Notifies when spending exceeds the budget</li>
                  <li><strong>Mid-Month Check:</strong> Summary notification on the 15th of each month</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Configuring Alerts</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Notifications → Budget Alerts</li>
                  <li>Enable or disable each alert type</li>
                  <li>Customize threshold percentages if desired</li>
                  <li>Choose notification method (push, email, or both)</li>
                  <li>Select which household members receive alerts</li>
                </ol>
                <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg mt-6">
                  <p className="text-green-200 text-sm">
                    <strong>Avoid Alert Fatigue:</strong> If you&apos;re getting too many alerts, consider raising thresholds or only alerting on over-budget situations for non-essential categories.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* BILLS & PAYMENTS */}
            {/* ============================================================ */}

            {/* Adding Bills */}
            <section id="adding-bills" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Adding Bills</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Track all your recurring bills in one place. From rent and utilities to subscriptions and insurance, never miss a payment again with Rowan&apos;s bill tracking.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Creating a New Bill</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li><strong>Navigate to Bills:</strong> Go to Household → Bills tab</li>
                  <li><strong>Click &quot;Add Bill&quot;:</strong> Open the bill creation form</li>
                  <li><strong>Enter details:</strong> Name, amount, due date, and payee</li>
                  <li><strong>Set recurrence:</strong> Monthly, quarterly, annually, or one-time</li>
                  <li><strong>Assign category:</strong> Link to a budget category for tracking</li>
                  <li><strong>Add notes:</strong> Account numbers, payment links, or other details</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Bill Details to Track</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Company/Payee name</li>
                  <li>Amount (fixed or estimated)</li>
                  <li>Due date each month</li>
                  <li>Payment method (auto-pay, manual)</li>
                  <li>Account number (stored securely)</li>
                  <li>Website or app for payment</li>
                </ul>
                <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg mt-6">
                  <p className="text-red-200 text-sm">
                    <strong>Variable Bills:</strong> For bills that vary (like utilities), enter an estimated amount. Update it each month when you receive the actual bill.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Bill Payment Tracking */}
            <section id="payment-tracking" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Bill Payment Tracking</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Keep a complete history of your bill payments. Know exactly when each bill was paid and maintain records for reference or dispute resolution.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Marking Bills as Paid</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Find the bill in your Bills list</li>
                  <li>Click the &quot;Mark as Paid&quot; button or checkbox</li>
                  <li>Enter the actual payment amount if different from expected</li>
                  <li>Optionally add a confirmation number or note</li>
                  <li>The bill moves to payment history and the next occurrence is scheduled</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Payment History</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Access your complete payment history for each bill. See payment dates, amounts, and any notes you&apos;ve added. This history is invaluable for tracking spending patterns and resolving any billing disputes.
                </p>
                <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg mt-6">
                  <p className="text-red-200 text-sm">
                    <strong>Auto-Pay Bills:</strong> Even for auto-pay bills, mark them as paid in Rowan to maintain accurate records and budget tracking.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Bill Reminders */}
            <section id="bill-reminders" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Bill Reminders</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Late payments can result in fees and credit score damage. Rowan&apos;s bill reminders ensure you never forget an upcoming payment.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Reminder Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Week before:</strong> Advance notice for bills requiring preparation</li>
                  <li><strong>3 days before:</strong> Standard reminder for most bills</li>
                  <li><strong>Day before:</strong> Last-minute reminder</li>
                  <li><strong>Day of:</strong> Final reminder on the due date</li>
                  <li><strong>Overdue:</strong> Alert if a bill passes due without being marked paid</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Setting Up Reminders</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Open a bill and click on &quot;Reminders&quot;</li>
                  <li>Select which reminder intervals you want</li>
                  <li>Choose notification method (push, email, or both)</li>
                  <li>Set a preferred time of day for reminders</li>
                </ol>
                <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg mt-6">
                  <p className="text-red-200 text-sm">
                    <strong>Smart Timing:</strong> Set reminders earlier for bills you pay manually, and simpler reminders for auto-pay bills (just to verify the payment went through).
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Auto-Expense Creation */}
            <section id="auto-expenses" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Auto-Expense Creation</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Save time by automatically creating expense entries when you mark bills as paid. This ensures your budget tracking stays accurate without duplicate data entry.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How It Works</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Enable &quot;Auto-create expense&quot; in a bill&apos;s settings</li>
                  <li>Select the expense category to use</li>
                  <li>When you mark the bill as paid, an expense is automatically created</li>
                  <li>The expense includes the bill name, amount, and date</li>
                  <li>Your budget analytics update immediately</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Configuration Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Category mapping:</strong> Link each bill to a specific expense category</li>
                  <li><strong>Amount handling:</strong> Use actual payment amount or the bill&apos;s expected amount</li>
                  <li><strong>Notes transfer:</strong> Copy confirmation numbers to the expense</li>
                  <li><strong>Skip prompt:</strong> Create expense automatically or ask for confirmation</li>
                </ul>
                <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg mt-6">
                  <p className="text-red-200 text-sm">
                    <strong>Avoid Duplicates:</strong> If you manually track expenses from bank imports, you may want to disable auto-expense creation to prevent duplicate entries.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* ANALYTICS & REPORTING */}
            {/* ============================================================ */}

            {/* Chore Analytics */}
            <section id="chore-analytics" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Chore Analytics</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Understand your household&apos;s chore performance with detailed analytics. Track completion rates, identify bottlenecks, and ensure fair distribution of responsibilities.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Key Metrics</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Completion Rate:</strong> Percentage of chores completed on time</li>
                  <li><strong>Overdue Count:</strong> Number of chores past their due date</li>
                  <li><strong>Average Completion Time:</strong> How long chores typically take</li>
                  <li><strong>Distribution by Person:</strong> Who&apos;s doing what share of the work</li>
                  <li><strong>Most Skipped:</strong> Chores that frequently go uncompleted</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Using Analytics for Improvement</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Review chore analytics weekly to spot problems early. If completion rates are dropping, consider whether chores are realistic. If one person is overloaded, redistribute tasks. If certain chores are always skipped, discuss whether they&apos;re necessary or need to be rescheduled.
                </p>
                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Historical View:</strong> Compare this month&apos;s performance to previous months to see if your household is improving over time.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Budget Reports */}
            <section id="budget-reports" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Budget Reports</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Generate comprehensive reports comparing your budgeted amounts to actual spending. These reports provide the foundation for informed financial decisions.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Report Types</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Monthly Summary:</strong> Budget vs. actual for the current or past months</li>
                  <li><strong>Category Deep Dive:</strong> Detailed breakdown of a single category over time</li>
                  <li><strong>Year-to-Date:</strong> Cumulative spending and budgeting performance</li>
                  <li><strong>Trend Analysis:</strong> How your spending has changed over multiple months</li>
                  <li><strong>Custom Range:</strong> Reports for any date range you specify</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Generating Reports</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Household → Analytics → Reports</li>
                  <li>Select the report type</li>
                  <li>Choose the time period</li>
                  <li>Filter by category if desired</li>
                  <li>View on screen or export as PDF/CSV</li>
                </ol>
                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Monthly Review:</strong> Schedule a monthly budget review to go over reports with your household. This keeps everyone aligned and accountable.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Household Dashboard */}
            <section id="household-dashboard" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Household Dashboard</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The Household Dashboard is your command center for home management. See everything at a glance: upcoming chores, pending bills, budget status, and recent activity.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Dashboard Widgets</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Today&apos;s Chores:</strong> What needs to be done today</li>
                  <li><strong>Upcoming Bills:</strong> Bills due in the next 7 days</li>
                  <li><strong>Budget Snapshot:</strong> Overall spending vs. budget this month</li>
                  <li><strong>Overdue Items:</strong> Any chores or bills past their due date</li>
                  <li><strong>Recent Activity:</strong> Latest completions and payments</li>
                  <li><strong>Quick Stats:</strong> Key metrics like completion rate and savings</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Customizing Your Dashboard</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Arrange widgets to prioritize what matters most to you. Drag and drop to reorder, collapse sections you don&apos;t need frequently, and expand those you check often. Your layout preferences are saved automatically.
                </p>
                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Morning Routine:</strong> Start your day by checking the Household Dashboard. A quick scan shows you what needs attention today.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* COLLABORATION FEATURES */}
            {/* ============================================================ */}

            {/* Shared Responsibility */}
            <section id="shared-responsibility" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Shared Responsibility</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Running a household is a team effort. Rowan helps distribute responsibilities fairly among all household members, ensuring no one person carries an unfair burden.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Distribution Strategies</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>By Preference:</strong> Assign chores based on what each person prefers</li>
                  <li><strong>By Availability:</strong> Consider work schedules and commitments</li>
                  <li><strong>By Ability:</strong> Match tasks to skills (e.g., cooking, repairs)</li>
                  <li><strong>Rotating:</strong> Take turns on less desirable tasks</li>
                  <li><strong>Equal Time:</strong> Aim for similar total time commitment</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Bill Responsibility</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Assign specific bills to household members who are responsible for ensuring they get paid. This doesn&apos;t mean they pay from their personal funds, but that they&apos;re accountable for the payment happening on time.
                </p>
                <div className="p-4 bg-pink-900/30 border border-pink-800 rounded-lg mt-6">
                  <p className="text-pink-200 text-sm">
                    <strong>Fairness Check:</strong> Use Chore Analytics to periodically review if the workload is truly balanced. Perceptions of fairness often differ from reality.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Partner Notifications */}
            <section id="partner-notifications" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Partner Notifications</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Keep your household in sync with shared notifications. Everyone stays informed about completions, payments, and important updates without constant check-ins.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Notification Types</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Chore Completed:</strong> When someone marks a shared chore done</li>
                  <li><strong>Bill Paid:</strong> Confirmation when bills are paid</li>
                  <li><strong>Budget Alert:</strong> When spending approaches limits</li>
                  <li><strong>New Assignment:</strong> When a task is assigned to you</li>
                  <li><strong>Overdue Warning:</strong> When items become overdue</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Notification Preferences</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Each household member can customize their notification preferences. Some may want real-time alerts for everything, while others prefer daily summaries. Find the balance that keeps everyone informed without overwhelming them.
                </p>
                <div className="p-4 bg-pink-900/30 border border-pink-800 rounded-lg mt-6">
                  <p className="text-pink-200 text-sm">
                    <strong>Daily Digest:</strong> If real-time notifications feel like too much, try the daily digest option that summarizes the day&apos;s household activity in one message.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Family Meetings */}
            <section id="family-meetings" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Family Meetings</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Regular family meetings are the cornerstone of effective household management. Use Rowan&apos;s data to drive productive conversations about chores, budgets, and household goals.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Meeting Agenda Template</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li><strong>Review Last Week:</strong> Check chore completion rates and any issues</li>
                  <li><strong>Budget Check:</strong> Review spending vs. budget for the month</li>
                  <li><strong>Upcoming Bills:</strong> Confirm payment plans for due bills</li>
                  <li><strong>Redistribute Tasks:</strong> Adjust assignments if needed</li>
                  <li><strong>Plan Ahead:</strong> Discuss upcoming events, purchases, or projects</li>
                  <li><strong>Appreciation:</strong> Acknowledge contributions and improvements</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Using Rowan in Meetings</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Pull up the Household Dashboard during your meeting. Show analytics on the big screen or share your screen. Having concrete data prevents arguments about who&apos;s doing what and grounds discussions in facts.
                </p>
                <div className="p-4 bg-pink-900/30 border border-pink-800 rounded-lg mt-6">
                  <p className="text-pink-200 text-sm">
                    <strong>Keep It Short:</strong> Aim for 15-20 minute meetings weekly rather than hour-long monthly sessions. Frequent short check-ins prevent issues from festering.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* ADVANCED FEATURES & AUTOMATION */}
            {/* ============================================================ */}

            {/* Smart Home Integration */}
            <section id="smart-home" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Smart Home Integration</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Connect Rowan with your smart home devices for automated tracking and intelligent reminders. This is an advanced feature for households with IoT devices.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Potential Integrations</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Smart Vacuums:</strong> Automatically mark vacuuming as done when robot runs</li>
                  <li><strong>Smart Locks:</strong> Track when household members come and go</li>
                  <li><strong>Smart Thermostats:</strong> Monitor energy usage for utility budgeting</li>
                  <li><strong>Smart Appliances:</strong> Track dishwasher or laundry cycles</li>
                  <li><strong>Voice Assistants:</strong> Mark chores complete via voice command</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Future Possibilities</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Smart home integration is an evolving feature. We&apos;re continually exploring new connections to make household management more automatic and less manual.
                </p>
                <div className="p-4 bg-indigo-900/30 border border-indigo-800 rounded-lg mt-6">
                  <p className="text-indigo-200 text-sm">
                    <strong>Coming Soon:</strong> Check our roadmap for upcoming smart home integrations. We prioritize based on user requests, so let us know what you&apos;d find most valuable.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Seasonal Planning */}
            <section id="seasonal-planning" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Seasonal Planning</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Different seasons bring different needs. Plan ahead for seasonal chores, budget adjustments, and holiday expenses to avoid last-minute scrambles.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Seasonal Chores</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Spring:</strong> Deep cleaning, garden prep, AC maintenance</li>
                  <li><strong>Summer:</strong> Lawn care, pool maintenance, pest control</li>
                  <li><strong>Fall:</strong> Gutter cleaning, leaf removal, winterizing</li>
                  <li><strong>Winter:</strong> Snow removal, heating system check, holiday prep</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Budget Adjustments</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Utility costs vary by season. Holiday months often have higher entertainment and gift spending. Adjust your budget categories seasonally to reflect these predictable changes.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Review last year&apos;s spending for the upcoming season</li>
                  <li>Identify categories that need adjustment</li>
                  <li>Update budget allocations before the season begins</li>
                  <li>Set reminders to review again next year</li>
                </ol>
                <div className="p-4 bg-indigo-900/30 border border-indigo-800 rounded-lg mt-6">
                  <p className="text-indigo-200 text-sm">
                    <strong>Holiday Planning:</strong> Create a &quot;Holiday&quot; budget category during gift-giving seasons to track that spending separately from regular entertainment.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Emergency Fund Tracking */}
            <section id="emergency-fund" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Emergency Fund Tracking</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Financial experts recommend having 3-6 months of expenses in an emergency fund. Rowan can help you track progress toward this goal and monitor your safety net.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Setting Up Emergency Fund Tracking</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Calculate your target (monthly expenses × months of coverage)</li>
                  <li>Create an &quot;Emergency Fund&quot; savings goal</li>
                  <li>Set monthly contribution amount</li>
                  <li>Track current balance</li>
                  <li>Monitor progress toward your target</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Using Your Emergency Fund</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  When you need to use emergency funds, log it in Rowan as a special expense. This helps you track what emergencies cost and plan for replenishing the fund afterward.
                </p>
                <div className="p-4 bg-indigo-900/30 border border-indigo-800 rounded-lg mt-6">
                  <p className="text-indigo-200 text-sm">
                    <strong>True Emergencies:</strong> Define what counts as an emergency (job loss, medical bills, major repairs) vs. what doesn&apos;t (sales, vacations, upgrades). Stick to your definition.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Multi-Property Management */}
            <section id="multi-property" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Multi-Property Management</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  If you manage multiple properties—a primary home and vacation house, rental properties, or care for a family member&apos;s home—Rowan can help you organize each one separately.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Using Spaces for Properties</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Create a separate Space for each property</li>
                  <li>Set up property-specific chores and bills</li>
                  <li>Track budgets independently for each location</li>
                  <li>Invite different people to different property Spaces</li>
                  <li>Switch between properties easily in the app</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Rental Property Considerations</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  For rental properties, track maintenance chores, rent collection dates, and property-specific expenses. Use the analytics to understand profitability and maintenance costs per property.
                </p>
                <div className="p-4 bg-indigo-900/30 border border-indigo-800 rounded-lg mt-6">
                  <p className="text-indigo-200 text-sm">
                    <strong>Consolidated View:</strong> While each property has its own Space, you can view aggregate analytics across all properties for a complete financial picture.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* TROUBLESHOOTING & TIPS */}
            {/* ============================================================ */}

            {/* Handling Irregular Income */}
            <section id="irregular-income" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Handling Irregular Income</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Freelancers, gig workers, and those with variable income face unique budgeting challenges. Traditional monthly budgets don&apos;t always fit, but Rowan can adapt to your situation.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Strategies for Variable Income</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Base Budget:</strong> Budget based on your lowest typical month, not your best</li>
                  <li><strong>Priority Categories:</strong> Rank categories by necessity; cut from bottom up</li>
                  <li><strong>Buffer Account:</strong> Keep extra savings to smooth out income swings</li>
                  <li><strong>Rolling Average:</strong> Base budgets on 3-month income averages</li>
                  <li><strong>Quarterly Review:</strong> Adjust budgets quarterly rather than monthly</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Implementation in Rowan</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Set conservative baseline budgets</li>
                  <li>Use budget alerts at lower thresholds (50%, 75%)</li>
                  <li>Check analytics weekly rather than monthly</li>
                  <li>Adjust category amounts month-to-month based on actual income</li>
                </ol>
                <div className="p-4 bg-orange-900/30 border border-orange-800 rounded-lg mt-6">
                  <p className="text-orange-200 text-sm">
                    <strong>Good Months:</strong> When income exceeds expectations, prioritize savings and debt payoff rather than lifestyle inflation.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Motivating Family Members */}
            <section id="family-motivation" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Motivating Family Members</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Getting everyone on board with household management can be challenging. Here are strategies for encouraging participation without creating conflict.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">For Partners</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Start Together:</strong> Set up the system together rather than presenting it as fait accompli</li>
                  <li><strong>Share the Why:</strong> Explain how this helps your shared goals</li>
                  <li><strong>Respect Preferences:</strong> Let each person choose some of their tasks</li>
                  <li><strong>Celebrate Wins:</strong> Acknowledge when budgets are met or chores completed</li>
                  <li><strong>Don&apos;t Nag:</strong> Let the app send reminders; don&apos;t add personal reminders on top</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">For Children</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Age-Appropriate Tasks:</strong> Assign chores matching their abilities</li>
                  <li><strong>Gamification:</strong> Use completion streaks and the Rewards system</li>
                  <li><strong>Choices:</strong> Let kids choose between equivalent chores</li>
                  <li><strong>Consistency:</strong> Same expectations every week builds habits</li>
                  <li><strong>Connect to Allowance:</strong> Link chore completion to earning money</li>
                </ul>
                <div className="p-4 bg-orange-900/30 border border-orange-800 rounded-lg mt-6">
                  <p className="text-orange-200 text-sm">
                    <strong>Lead by Example:</strong> When family members see you consistently completing your own tasks and following the budget, they&apos;re more likely to do the same.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Data Recovery & Backup */}
            <section id="data-backup" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Data Recovery & Backup</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Your household data is valuable. Understanding how Rowan protects your data and what options you have for backup and recovery ensures peace of mind.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Automatic Protection</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Cloud Storage:</strong> All data is stored securely in the cloud</li>
                  <li><strong>Regular Backups:</strong> Automatic backups occur daily</li>
                  <li><strong>Redundancy:</strong> Data is stored in multiple locations</li>
                  <li><strong>Version History:</strong> Recent changes can be reviewed</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Exporting Your Data</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Go to Settings → Privacy → Export Data</li>
                  <li>Select what data to include (chores, expenses, bills, etc.)</li>
                  <li>Choose export format (CSV, JSON)</li>
                  <li>Download the export file</li>
                  <li>Store securely on your own backup system</li>
                </ol>
                <div className="p-4 bg-orange-900/30 border border-orange-800 rounded-lg mt-6">
                  <p className="text-orange-200 text-sm">
                    <strong>Periodic Exports:</strong> Consider exporting your data quarterly as an additional personal backup, especially for financial records you may need for taxes.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-amber-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Performance Optimization */}
            <section id="performance-tips" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Performance Optimization</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  As your household data grows, keeping things running smoothly ensures the best experience. Here are tips for maintaining optimal performance.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Data Management</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Archive Old Data:</strong> Move completed chores older than a year to archive</li>
                  <li><strong>Clean Up Categories:</strong> Remove unused expense categories</li>
                  <li><strong>Delete Obsolete Bills:</strong> Remove bills you no longer pay</li>
                  <li><strong>Consolidate Duplicates:</strong> Merge similar categories or chores</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">App Performance</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Update Regularly:</strong> Keep the app updated to the latest version</li>
                  <li><strong>Clear Cache:</strong> Occasionally clear the app cache if things slow down</li>
                  <li><strong>Stable Connection:</strong> Use Wi-Fi when syncing large amounts of data</li>
                  <li><strong>Limit Notifications:</strong> Too many notifications can impact battery</li>
                </ul>
                <div className="p-4 bg-orange-900/30 border border-orange-800 rounded-lg mt-6">
                  <p className="text-orange-200 text-sm">
                    <strong>Annual Review:</strong> Once a year, review your entire Rowan setup. Remove things you no longer use, update outdated information, and refresh your approach.
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