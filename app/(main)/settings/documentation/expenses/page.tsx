'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Receipt, Camera, Scan, DollarSign, TrendingUp, PieChart, Calendar, Clock, AlertCircle, FileText } from 'lucide-react';

const guides = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of expense tracking and receipt scanning',
    articles: [
      {
        title: 'Understanding Expense Tracking',
        description: 'Learn how to track and categorize your expenses effectively',
        readTime: '4 min',
        href: '#understanding-expenses',
      },
      {
        title: 'Setting Up Receipt Scanning',
        description: 'Configure AI-powered receipt scanning for automatic expense creation',
        readTime: '5 min',
        href: '#setup-scanning',
      },
      {
        title: 'Creating Your First Expense',
        description: 'Manually add expenses and understand the expense fields',
        readTime: '3 min',
        href: '#first-expense',
      },
    ],
  },
  {
    title: 'Receipt Scanning (AI-Powered)',
    description: 'Master AI-powered receipt scanning and OCR technology',
    articles: [
      {
        title: 'Camera Receipt Scanning',
        description: 'Take photos of receipts for instant AI processing',
        readTime: '4 min',
        href: '#camera-scanning',
      },
      {
        title: 'File Upload Scanning',
        description: 'Upload receipt images from your device for processing',
        readTime: '3 min',
        href: '#file-upload',
      },
      {
        title: 'AI Data Extraction',
        description: 'How AI extracts merchant, amount, date, and items from receipts',
        readTime: '5 min',
        href: '#ai-extraction',
      },
      {
        title: 'Receipt Correction',
        description: 'Review and correct AI-extracted data before saving',
        readTime: '4 min',
        href: '#receipt-correction',
      },
      {
        title: 'Supported Receipt Types',
        description: 'Learn which receipt formats work best with AI scanning',
        readTime: '3 min',
        href: '#supported-receipts',
      },
    ],
  },
  {
    title: 'Expense Management',
    description: 'Organize and manage your expense records',
    articles: [
      {
        title: 'Expense Categories',
        description: 'Use and customize expense categories for better organization',
        readTime: '4 min',
        href: '#expense-categories',
      },
      {
        title: 'Manual Expense Entry',
        description: 'Add expenses manually when you don\'t have receipts',
        readTime: '3 min',
        href: '#manual-entry',
      },
      {
        title: 'Expense Editing & Deletion',
        description: 'Modify existing expenses and manage your expense history',
        readTime: '3 min',
        href: '#expense-editing',
      },
      {
        title: 'Expense Search & Filtering',
        description: 'Find specific expenses using search and filter options',
        readTime: '4 min',
        href: '#expense-search',
      },
      {
        title: 'Expense Attachments',
        description: 'Attach receipt images and documents to expense records',
        readTime: '3 min',
        href: '#expense-attachments',
      },
    ],
  },
  {
    title: 'Analytics & Reporting',
    description: 'Get insights into your spending patterns',
    articles: [
      {
        title: 'Spending Analytics Dashboard',
        description: 'View comprehensive spending analytics and trends',
        readTime: '5 min',
        href: '#spending-analytics',
      },
      {
        title: 'Category Breakdown',
        description: 'Analyze spending by category with visual charts',
        readTime: '4 min',
        href: '#category-breakdown',
      },
      {
        title: 'Monthly & Yearly Reports',
        description: 'Generate detailed spending reports for specific periods',
        readTime: '5 min',
        href: '#period-reports',
      },
      {
        title: 'Spending Trends',
        description: 'Track spending patterns and identify trends over time',
        readTime: '4 min',
        href: '#spending-trends',
      },
      {
        title: 'Budget Integration',
        description: 'Connect expenses to budgets for comprehensive financial tracking',
        readTime: '6 min',
        href: '#budget-integration',
      },
    ],
  },
  {
    title: 'Advanced Features',
    description: 'Unlock powerful expense tracking capabilities',
    articles: [
      {
        title: 'Bulk Expense Operations',
        description: 'Edit, delete, or categorize multiple expenses at once',
        readTime: '5 min',
        href: '#bulk-operations',
      },
      {
        title: 'Expense Export',
        description: 'Export expense data for tax purposes or external accounting',
        readTime: '4 min',
        href: '#expense-export',
      },
      {
        title: 'Receipt Storage & Organization',
        description: 'Organize receipt images and maintain digital records',
        readTime: '4 min',
        href: '#receipt-storage',
      },
      {
        title: 'Tax Preparation',
        description: 'Prepare expense data for tax filing and deduction tracking',
        readTime: '6 min',
        href: '#tax-preparation',
      },
    ],
  },
  {
    title: 'Collaboration & Sharing',
    description: 'Share expense tracking with family members',
    articles: [
      {
        title: 'Family Expense Tracking',
        description: 'Track expenses across all family members in shared spaces',
        readTime: '5 min',
        href: '#family-tracking',
      },
      {
        title: 'Expense Approval Workflow',
        description: 'Set up approval processes for large expenses',
        readTime: '4 min',
        href: '#expense-approval',
      },
      {
        title: 'Shared Receipt Scanning',
        description: 'Allow multiple family members to scan and categorize receipts',
        readTime: '3 min',
        href: '#shared-scanning',
      },
    ],
  },
];

export default function ExpensesDocumentationPage() {
  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Documentation', href: '/settings/documentation' },
        { label: 'Expenses & Receipt Scanning' },
      ]}
    >
      {/* Page Header */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Receipt className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Expenses & Receipt Scanning
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Master AI-powered expense tracking with receipt scanning and comprehensive analytics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-12 p-8 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl border border-red-200 dark:border-red-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto mb-3">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">AI Receipt Scanning</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Automatic data extraction from receipt photos</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Spending Analytics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track patterns and categorize expenses</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-3">
              <PieChart className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Budget Integration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Connect expenses to budget tracking</p>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Camera className="w-8 h-8 text-red-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Camera Receipt Scanning</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Take photos to instantly extract expense data</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Scan className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">OCR Technology</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered text recognition for accurate data extraction</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <DollarSign className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Automatic Categorization</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Smart category suggestions based on merchant data</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <TrendingUp className="w-8 h-8 text-purple-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Spending Analytics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Detailed insights into spending patterns</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Calendar className="w-8 h-8 text-indigo-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Date Recognition</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Automatically extract and parse receipt dates</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <FileText className="w-8 h-8 text-yellow-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Export & Reporting</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Export data for taxes and accounting purposes</p>
          </div>
        </div>
      </div>

      {/* AI Technology Spotlight */}
      <div className="mb-12 p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Scan className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">🤖 AI-Powered Receipt Processing</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              Our advanced AI technology uses Optical Character Recognition (OCR) to extract key information from receipt images including:
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span><strong>Merchant Name:</strong> Store or restaurant identification</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span><strong>Total Amount:</strong> Precise currency extraction</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span><strong>Date & Time:</strong> Transaction timestamp parsing</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span><strong>Item Details:</strong> Individual line items (when available)</span>
          </div>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="space-y-12">
        {guides.map((guide) => (
          <section key={guide.title} className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 text-white" />
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
                  className="group p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-red-300 dark:hover:border-red-600 hover:shadow-lg transition-all"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-red-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{article.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-600 dark:text-red-400">{article.readTime}</span>
                    <Clock className="w-3 h-3 text-gray-400" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Pro Tips */}
      <div className="mt-12 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 Pro Tips</h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <p><strong>Good lighting:</strong> Take receipt photos in well-lit areas for better AI recognition</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <p><strong>Flat surface:</strong> Place receipts on flat surfaces to avoid shadows and distortion</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <p><strong>Review AI data:</strong> Always review extracted data before saving to ensure accuracy</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <p><strong>Categorize consistently:</strong> Use consistent categories for better analytics and reporting</p>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}