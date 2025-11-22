'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Home, CheckSquare, DollarSign, Calendar, TrendingUp, AlertCircle, Receipt, Target, Clock, Users } from 'lucide-react';

const guides = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of household and budget management',
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
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Documentation', href: '/settings/documentation' },
        { label: 'Household & Budget' },
      ]}
    >
      {/* Page Header */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Home className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Household & Budget
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Master household management with chore tracking, budget management, and bill organization
        </p>
      </div>
      {/* Quick Stats */}
      <div className="mb-12 p-8 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl border border-amber-200 dark:border-amber-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-3">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Chore Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Organize household chores with smart scheduling</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Budget Tracking</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Monitor expenses and stay within budget</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Bill Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Never miss a payment with bill tracking</p>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <CheckSquare className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Chore Scheduling</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Set up recurring chores with flexible scheduling options</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Family Assignment</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Assign chores and bills to family members</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Calendar className="w-8 h-8 text-purple-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Calendar Integration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sync chores and bills with your calendar</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <TrendingUp className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Budget Analytics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track spending trends and budget performance</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Alerts</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get notified about overdue chores and upcoming bills</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Target className="w-8 h-8 text-indigo-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Goal Tracking</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Set and track household management goals</p>
          </div>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="space-y-12">
        {guides.map((guide) => (
          <section key={guide.title} className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{guide.title}</h2>
                <p className="text-gray-600 dark:text-gray-400">{guide.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guide.articles.map((article) => (
                <a
                  key={article.title}
                  href={article.href}
                  className="group p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-lg transition-all"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-amber-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{article.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-600 dark:text-amber-400">{article.readTime}</span>
                    <Clock className="w-3 h-3 text-gray-400" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Frequently Asked Questions */}
      <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h3>
        <div className="space-y-6">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How do I handle chores that don't get done on time?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use the chore status system to mark items as "blocked" or "on-hold" with notes explaining delays. Set up escalation rules to reassign overdue chores automatically, or use the family meeting feature to discuss recurring issues.
            </p>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I set different budget limits for different family members?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! Create individual budget categories for each family member (e.g., "John's Allowance", "Sarah's School Expenses") and set spending limits. Use the expense tracking to monitor individual spending against these budgets.
            </p>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">What happens if I go over budget in a category?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You'll receive notifications when approaching budget limits (90% threshold). If you exceed the budget, the system will flag it in red on your dashboard and suggest adjustments for next month or moving funds from other categories.
            </p>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How do recurring chores work with family rotation?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Set up rotation patterns (weekly, monthly, or custom cycles). For example, "Taking out trash" can rotate between family members each week. The system automatically assigns the next person in rotation when marking chores complete.
            </p>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I import expenses from my bank account?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              While direct bank integration isn't available, you can use the receipt scanning feature or manually import CSV exports from your bank. The AI can help categorize imported transactions automatically.
            </p>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How do I handle seasonal or irregular expenses in my budget?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create specific categories for seasonal expenses (e.g., "Holiday Gifts", "Summer Vacation"). Use the seasonal planning feature to set aside money monthly for these larger annual expenses.
            </p>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">What's the difference between chores and tasks?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Chores are recurring household maintenance activities (cleaning, laundry, yard work) while tasks are typically one-time or project-specific items. Chores have built-in rotation and scheduling features that tasks don't have.
            </p>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Can I set up automatic bill payments tracking?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! Mark bills as "auto-pay" and set up automatic expense creation when the bill is due. The system will create the expense entry and mark the bill as paid automatically on the due date.
            </p>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How can I motivate kids to complete their chores?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use the gamification features: set up reward points for completed chores, create family challenges, and use the analytics to show progress. Consider linking chore completion to allowance payments tracked in the budget system.
            </p>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">What analytics are available for household management?</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View completion rates by family member, spending trends by category, overdue items, budget vs. actual comparisons, and seasonal patterns. Export data as CSV or PDF reports for detailed analysis or tax purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 Pro Tips</h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <p><strong>Set realistic schedules:</strong> Don't overwhelm yourself with too many chores on the same day</p>
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
    </FeatureLayout>
  );
}