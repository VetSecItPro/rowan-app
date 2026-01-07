'use client';

import Link from 'next/link';

import { Receipt, Camera, Scan, DollarSign, TrendingUp, PieChart, Calendar, Clock, AlertCircle, FileText, ArrowLeft } from 'lucide-react';

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
    description: 'Learn the basics of expense tracking and receipt scanning',
    icon: Receipt,
    color: 'from-red-500 to-red-600',
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
    icon: Scan,
    color: 'from-blue-500 to-blue-600',
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
    icon: DollarSign,
    color: 'from-green-500 to-green-600',
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
    icon: TrendingUp,
    color: 'from-purple-500 to-purple-600',
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
    icon: FileText,
    color: 'from-indigo-500 to-indigo-600',
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
    icon: Camera,
    color: 'from-cyan-500 to-cyan-600',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50/30 to-orange-50/30 dark:from-gray-950 dark:via-red-950/20 dark:to-orange-950/20">
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
                          className="group p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-red-300 dark:hover:border-red-600 transition-all duration-200 hover:-translate-y-1"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            {article.description}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-red-600 dark:text-red-400 font-medium">
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

          {/* ==================== ARTICLE CONTENT SECTIONS ==================== */}
          <div className="mt-16 space-y-16">

            {/* Getting Started Section */}
            <section id="understanding-expenses" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Understanding Expense Tracking</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Expense tracking in Rowan helps you maintain complete visibility over your household spending. Whether you're tracking everyday purchases, monitoring budget categories, or preparing for tax season, our expense system provides the tools you need.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">What Makes Rowan's Expense Tracking Special</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>AI-Powered Receipt Scanning:</strong> Take a photo of any receipt and let AI extract the merchant, amount, date, and even individual items</li>
                  <li><strong>Smart Categorization:</strong> Automatic category suggestions based on merchant data and your past spending patterns</li>
                  <li><strong>Real-time Sync:</strong> All expenses sync instantly across family members' devices</li>
                  <li><strong>Budget Integration:</strong> Expenses automatically update your budget tracking and analytics</li>
                  <li><strong>Historical Records:</strong> Maintain a complete digital archive of all receipts and spending</li>
                </ul>
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Pro Tip:</strong> Start by scanning receipts for your largest regular expenses (groceries, utilities, subscriptions) to quickly build a picture of your spending patterns.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="setup-scanning" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Scan className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Setting Up Receipt Scanning</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Our AI receipt scanning uses Google Gemini to extract information from your receipts. Here's how to get the best results from the start.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Step-by-Step Setup</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-600 dark:text-gray-400">
                  <li>Navigate to the <strong>Expenses</strong> page from the main navigation</li>
                  <li>Tap the <strong>+ Add Expense</strong> button</li>
                  <li>Select <strong>Scan Receipt</strong> to use the camera or <strong>Upload Image</strong> for existing photos</li>
                  <li>Grant camera permissions when prompted (required for scanning)</li>
                  <li>Review the AI-extracted data and make any necessary corrections</li>
                  <li>Add category and any notes, then save the expense</li>
                </ol>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Camera Permissions</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  For the best scanning experience, ensure Rowan has camera access in your device settings. The camera is only used when you actively choose to scan a receipt - we never access your camera in the background.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="first-expense" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Creating Your First Expense</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  You can create expenses manually when you don't have a receipt, or want to quickly log a purchase without scanning.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Expense Fields Explained</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>Merchant/Description:</strong> Where you made the purchase or what it was for</li>
                  <li><strong>Amount:</strong> The total spent (including tax and tip if applicable)</li>
                  <li><strong>Date:</strong> When the purchase was made (defaults to today)</li>
                  <li><strong>Category:</strong> Organize by type (groceries, dining, transportation, etc.)</li>
                  <li><strong>Notes:</strong> Optional additional details for your records</li>
                  <li><strong>Receipt Image:</strong> Attach a photo for your records (optional but recommended)</li>
                </ul>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Quick Tip:</strong> Use consistent merchant names for the same stores. This helps with analytics and makes searching easier. For example, always use "Costco" instead of varying between "Costco Wholesale" and "COSTCO #123".
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Receipt Scanning Section */}
            <section id="camera-scanning" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Camera Receipt Scanning</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  The camera scanner lets you capture receipts instantly. Here's how to get the clearest scans for accurate AI extraction.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Best Practices for Scanning</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>Good Lighting:</strong> Natural daylight or bright indoor lighting works best</li>
                  <li><strong>Flat Surface:</strong> Place the receipt on a flat, contrasting background (dark receipt on light surface or vice versa)</li>
                  <li><strong>Full Frame:</strong> Capture the entire receipt in frame without cutting off edges</li>
                  <li><strong>Steady Hands:</strong> Hold still while the camera focuses to avoid blur</li>
                  <li><strong>Avoid Shadows:</strong> Position yourself so you don't cast shadows on the receipt</li>
                </ul>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Troubleshooting Scans</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  If a scan doesn't extract data correctly, try these steps:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 mt-2">
                  <li>Re-scan with better lighting conditions</li>
                  <li>Flatten any creases or folds in the receipt</li>
                  <li>Ensure the receipt text is sharp and readable</li>
                  <li>For thermal receipts (that fade), scan them as soon as possible</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="file-upload" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">File Upload Scanning</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Already have receipt photos saved on your device? Upload them directly for AI processing without taking a new photo.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Supported File Types</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>JPEG/JPG:</strong> Most common format from phone cameras</li>
                  <li><strong>PNG:</strong> Screenshots or edited images</li>
                  <li><strong>HEIC:</strong> iPhone high-efficiency format (automatically converted)</li>
                  <li><strong>WebP:</strong> Web-optimized images</li>
                </ul>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">File Size Limits</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Images up to 10MB are supported. For larger files, the image will be automatically compressed before processing. Very high resolution images don't improve extraction accuracy - a clear, readable image is more important than maximum resolution.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="ai-extraction" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Scan className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Data Extraction</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Our AI system, powered by Google Gemini, analyzes receipt images to extract key information automatically.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">What Gets Extracted</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>Merchant Name:</strong> The store or restaurant name from the receipt header</li>
                  <li><strong>Total Amount:</strong> The final total including tax, tips, and fees</li>
                  <li><strong>Date & Time:</strong> Transaction date parsed into a standard format</li>
                  <li><strong>Individual Items:</strong> Line items with descriptions and prices (when available)</li>
                  <li><strong>Category Suggestion:</strong> AI suggests a category based on merchant type</li>
                </ul>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">How AI Processing Works</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Image is securely sent to Google Gemini's vision API</li>
                  <li>AI analyzes the image and identifies receipt structure</li>
                  <li>Key data points are extracted and structured</li>
                  <li>Results are returned and displayed for your review</li>
                  <li>You confirm or edit the data before saving</li>
                </ol>
                <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    <strong>Privacy Note:</strong> Receipt images are processed in real-time and not stored by the AI service. Only the extracted data you save is stored in your Rowan account.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="receipt-correction" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Receipt Correction</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  AI extraction is very accurate but not perfect. Always review and correct extracted data before saving.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Common Corrections</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>Merchant Name:</strong> AI might capture abbreviated names - expand to full names for consistency</li>
                  <li><strong>Amount:</strong> Verify the total matches your receipt, especially if there were discounts or split payments</li>
                  <li><strong>Date:</strong> Check that the date was parsed correctly, especially for international date formats</li>
                  <li><strong>Category:</strong> Override the suggested category if it doesn't match your organizational system</li>
                </ul>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">When AI Might Struggle</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Receipt extraction works best with standard printed receipts. You may need manual corrections for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 mt-2">
                  <li>Handwritten receipts or notes</li>
                  <li>Heavily faded thermal paper</li>
                  <li>Receipts in non-Latin character sets</li>
                  <li>Very long receipts with many line items</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="supported-receipts" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Supported Receipt Types</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Our AI works with a wide variety of receipt formats from around the world.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Works Best With</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Standard retail receipts (grocery stores, pharmacies, retail)</li>
                  <li>Restaurant checks and bills</li>
                  <li>Gas station receipts</li>
                  <li>Digital/email receipts (screenshot or saved image)</li>
                  <li>Credit card statements (individual transactions)</li>
                </ul>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Limited Support</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Handwritten receipts (may require manual entry)</li>
                  <li>Multi-page invoices (scan pages separately)</li>
                  <li>Very faded or damaged receipts</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Expense Management Section */}
            <section id="expense-categories" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Categories</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Categories help you organize expenses and generate meaningful spending reports.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Default Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-gray-600 dark:text-gray-400">
                  <div>• Groceries</div>
                  <div>• Dining Out</div>
                  <div>• Transportation</div>
                  <div>• Utilities</div>
                  <div>• Entertainment</div>
                  <div>• Shopping</div>
                  <div>• Healthcare</div>
                  <div>• Personal Care</div>
                  <div>• Home & Garden</div>
                  <div>• Subscriptions</div>
                  <div>• Education</div>
                  <div>• Other</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Category Tips</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Be consistent - always use the same category for similar purchases</li>
                  <li>Don't over-categorize - too many categories makes analysis harder</li>
                  <li>Use "Other" sparingly - try to fit expenses into standard categories when possible</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="manual-entry" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manual Expense Entry</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Not every expense comes with a receipt. Manual entry is quick and easy for cash purchases, online transactions, or when you simply don't have a receipt handy.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">When to Use Manual Entry</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Cash purchases without receipts</li>
                  <li>Online purchases (though you can screenshot email receipts)</li>
                  <li>Recurring expenses you know the amount of</li>
                  <li>Quick logging when you don't have time to scan</li>
                  <li>Expenses from bank statements you want to track</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="expense-editing" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Editing & Deletion</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Made a mistake or need to update an expense? Editing is simple and changes sync immediately.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">How to Edit</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Find the expense in your expense list</li>
                  <li>Tap or click on the expense to open details</li>
                  <li>Tap the Edit button</li>
                  <li>Make your changes and save</li>
                </ol>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Deleting Expenses</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  To delete an expense, open the expense details and tap Delete. You'll be asked to confirm before the expense is permanently removed. Deleted expenses cannot be recovered, so make sure you want to remove it permanently.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="expense-search" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Search & Filtering</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  As your expense history grows, powerful search and filtering helps you find exactly what you need.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Search Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>Text Search:</strong> Search by merchant name or notes</li>
                  <li><strong>Date Range:</strong> Filter to specific time periods</li>
                  <li><strong>Category:</strong> View expenses by category</li>
                  <li><strong>Amount Range:</strong> Find expenses within a price range</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="expense-attachments" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Attachments</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Keep your receipt images attached to expenses for easy reference and tax documentation.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Why Attach Receipts</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Digital backup in case physical receipts fade or get lost</li>
                  <li>Quick reference when you need to verify a purchase</li>
                  <li>Ready documentation for tax purposes or expense reports</li>
                  <li>Warranty tracking - keep receipts for big purchases</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Analytics Section */}
            <section id="spending-analytics" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Spending Analytics Dashboard</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Your spending analytics dashboard gives you a comprehensive view of where your money goes.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Dashboard Metrics</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>Total Spending:</strong> Sum of all expenses for the selected period</li>
                  <li><strong>Daily Average:</strong> Your average daily spending</li>
                  <li><strong>Top Categories:</strong> Where you spend the most</li>
                  <li><strong>Spending Trend:</strong> Whether spending is up or down vs. previous period</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="category-breakdown" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Category Breakdown</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Visual charts show exactly how your spending breaks down across categories.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Understanding the Charts</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>Pie Chart:</strong> Visual representation of category proportions</li>
                  <li><strong>Percentages:</strong> What portion each category takes of total spending</li>
                  <li><strong>Amounts:</strong> Actual dollar amounts per category</li>
                  <li><strong>Comparison:</strong> How categories changed vs. previous periods</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="period-reports" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly & Yearly Reports</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Generate detailed reports for any time period to review spending patterns and prepare for budgeting.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Report Types</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>Monthly Summary:</strong> Complete breakdown of a single month</li>
                  <li><strong>Yearly Overview:</strong> Full year spending patterns and totals</li>
                  <li><strong>Custom Period:</strong> Any date range you specify</li>
                  <li><strong>Comparison:</strong> Compare two periods side by side</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="spending-trends" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Spending Trends</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Trend analysis helps you identify patterns in your spending over time.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">What Trends Reveal</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Seasonal spending patterns (holidays, back-to-school, etc.)</li>
                  <li>Categories where spending is increasing or decreasing</li>
                  <li>Impact of lifestyle changes on spending</li>
                  <li>Progress toward spending reduction goals</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="budget-integration" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Integration</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Connect your expenses to budget tracking for comprehensive financial management.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">How Integration Works</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Expenses automatically count toward category budgets</li>
                  <li>Real-time budget remaining calculations</li>
                  <li>Alerts when approaching or exceeding budget limits</li>
                  <li>Budget vs. actual comparisons in reports</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Advanced Features Section */}
            <section id="bulk-operations" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Expense Operations</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Save time by editing or organizing multiple expenses at once.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Bulk Actions Available</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>Bulk Categorize:</strong> Change category for multiple expenses</li>
                  <li><strong>Bulk Delete:</strong> Remove multiple expenses at once</li>
                  <li><strong>Bulk Export:</strong> Export selected expenses to a file</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="expense-export" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Export</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Export your expense data for tax preparation, accounting software, or personal records.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Export Formats</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li><strong>CSV:</strong> Universal format for spreadsheets and accounting software</li>
                  <li><strong>PDF:</strong> Formatted report for printing or sharing</li>
                </ul>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">What's Included</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Exports include date, merchant, amount, category, notes, and receipt attachment status for all selected expenses.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="receipt-storage" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Receipt Storage & Organization</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  All your receipt images are securely stored and organized alongside your expense records.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Storage Benefits</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Never lose a receipt again - digital copies are safe in the cloud</li>
                  <li>Receipts are linked to their expense records for easy access</li>
                  <li>Search and find receipts by expense details</li>
                  <li>Download original images when needed</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="tax-preparation" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tax Preparation</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Rowan's expense tracking makes tax preparation much easier with organized records and exports.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Tax-Ready Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Export expenses by category for deduction tracking</li>
                  <li>Filter by date range for specific tax years</li>
                  <li>Receipt images serve as documentation</li>
                  <li>Category totals for Schedule C or other tax forms</li>
                </ul>
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> Rowan is not tax software. Consult a tax professional for advice on deductions and filing. Our exports help organize your data for tax preparation.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Collaboration Section */}
            <section id="family-tracking" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Family Expense Tracking</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Track expenses across all family members in your shared space for complete financial visibility.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">How Family Tracking Works</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>All space members can add expenses to the shared record</li>
                  <li>See who added each expense for accountability</li>
                  <li>Combined analytics show total household spending</li>
                  <li>Real-time sync keeps everyone on the same page</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="expense-approval" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Approval Workflow</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Set up approval workflows to review large expenses before they're recorded, helping maintain budget discipline.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Coming Soon</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Approval workflows are an upcoming feature. Currently, all space members can add expenses directly. Stay tuned for updates!
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="shared-scanning" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <Scan className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shared Receipt Scanning</h2>
              </div>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                  Any family member can scan receipts that get added to the shared expense record.
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Family Scanning Benefits</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>Everyone can contribute to expense tracking</li>
                  <li>No single person is responsible for all receipt scanning</li>
                  <li>Expenses are recorded faster when anyone can add them</li>
                  <li>Complete household spending picture</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-red-600 dark:text-red-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

          </div>
        </div>
      </div>
  );
}