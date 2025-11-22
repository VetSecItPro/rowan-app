'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Home, CheckSquare, DollarSign, Calendar, TrendingUp, AlertCircle, Receipt, Target, Clock, Users, ArrowLeft } from 'lucide-react';

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
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/30 to-orange-50/30 dark:from-gray-950 dark:via-amber-950/20 dark:to-orange-950/20">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings/documentation"
              className="inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Documentation
            </Link>
            <div className="text-center mb-8">
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
          </div>

          {/* Guide Sections */}
          <div className="space-y-12">
            {guideSections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-3xl overflow-hidden shadow-lg">
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
                          className="group p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-200 hover:-translate-y-1"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            {article.description}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
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
          <div className="mt-12 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
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
        </div>
      </div>
    </>
  );
}