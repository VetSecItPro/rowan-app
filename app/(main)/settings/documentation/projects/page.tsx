'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { FolderOpen, Target, DollarSign, TrendingUp, Users, Calendar, FileText, BarChart3, Clock, CheckSquare } from 'lucide-react';

const guides = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of project management and budget tracking',
    articles: [
      {
        title: 'Understanding Project Management',
        description: 'Learn how to organize and track projects with budgets and timelines',
        readTime: '5 min',
        href: '#understanding-projects',
      },
      {
        title: 'Creating Your First Project',
        description: 'Set up a project with budget, timeline, and team members',
        readTime: '6 min',
        href: '#first-project',
      },
      {
        title: 'Project vs Budget Tracking',
        description: 'Understand the difference between project management and budget tracking',
        readTime: '4 min',
        href: '#project-vs-budget',
      },
    ],
  },
  {
    title: 'Project Setup & Management',
    description: 'Master project creation and organization',
    articles: [
      {
        title: 'Project Status Tracking',
        description: 'Use project statuses: planning, in-progress, completed, on-hold',
        readTime: '4 min',
        href: '#project-status',
      },
      {
        title: 'Project Categories',
        description: 'Organize projects with categories like home improvement, travel, events',
        readTime: '3 min',
        href: '#project-categories',
      },
      {
        title: 'Project Timeline Management',
        description: 'Set start dates, deadlines, and track project progress over time',
        readTime: '5 min',
        href: '#project-timeline',
      },
      {
        title: 'Project Description & Notes',
        description: 'Document project details, requirements, and ongoing notes',
        readTime: '3 min',
        href: '#project-documentation',
      },
    ],
  },
  {
    title: 'Budget Management',
    description: 'Track project budgets and financial performance',
    articles: [
      {
        title: 'Setting Project Budgets',
        description: 'Define initial project budgets and track spending against targets',
        readTime: '5 min',
        href: '#setting-budgets',
      },
      {
        title: 'Expense Tracking',
        description: 'Log project expenses and categorize spending',
        readTime: '4 min',
        href: '#expense-tracking',
      },
      {
        title: 'Budget vs Actual Analysis',
        description: 'Compare planned budgets with actual spending for insights',
        readTime: '6 min',
        href: '#budget-analysis',
      },
      {
        title: 'Cost Overrun Management',
        description: 'Handle budget overruns and adjust project scope',
        readTime: '5 min',
        href: '#cost-overruns',
      },
      {
        title: 'Multi-Category Budgets',
        description: 'Break down project budgets into multiple expense categories',
        readTime: '4 min',
        href: '#multi-category',
      },
    ],
  },
  {
    title: 'Vendor & Resource Management',
    description: 'Manage vendors, contractors, and project resources',
    articles: [
      {
        title: 'Vendor Database',
        description: 'Maintain a database of contractors, suppliers, and service providers',
        readTime: '4 min',
        href: '#vendor-database',
      },
      {
        title: 'Vendor Payment Tracking',
        description: 'Track payments to vendors and manage outstanding invoices',
        readTime: '5 min',
        href: '#vendor-payments',
      },
      {
        title: 'Resource Allocation',
        description: 'Allocate team members and resources to different project tasks',
        readTime: '4 min',
        href: '#resource-allocation',
      },
      {
        title: 'Vendor Performance',
        description: 'Rate and review vendor performance for future projects',
        readTime: '3 min',
        href: '#vendor-performance',
      },
    ],
  },
  {
    title: 'Project Analytics & Reporting',
    description: 'Get insights into project performance and financial health',
    articles: [
      {
        title: 'Project Dashboard',
        description: 'Overview of all projects with status, budget, and timeline information',
        readTime: '4 min',
        href: '#project-dashboard',
      },
      {
        title: 'Financial Reports',
        description: 'Generate detailed financial reports for projects and portfolios',
        readTime: '6 min',
        href: '#financial-reports',
      },
      {
        title: 'Progress Tracking',
        description: 'Track project completion and milestone achievements',
        readTime: '5 min',
        href: '#progress-tracking',
      },
      {
        title: 'Budget Utilization',
        description: 'Analyze budget utilization and spending patterns across projects',
        readTime: '5 min',
        href: '#budget-utilization',
      },
      {
        title: 'ROI Analysis',
        description: 'Calculate return on investment for completed projects',
        readTime: '6 min',
        href: '#roi-analysis',
      },
    ],
  },
  {
    title: 'Collaboration Features',
    description: 'Work with family members and teams on projects',
    articles: [
      {
        title: 'Team Project Management',
        description: 'Assign team members to projects and track individual contributions',
        readTime: '5 min',
        href: '#team-projects',
      },
      {
        title: 'Project Sharing',
        description: 'Share project details and budgets with family members or partners',
        readTime: '3 min',
        href: '#project-sharing',
      },
      {
        title: 'Approval Workflows',
        description: 'Set up approval processes for project expenses and changes',
        readTime: '4 min',
        href: '#approval-workflows',
      },
      {
        title: 'Communication & Updates',
        description: 'Keep team members informed about project progress and changes',
        readTime: '4 min',
        href: '#project-communication',
      },
    ],
  },
  {
    title: 'Advanced Features',
    description: 'Unlock powerful project management capabilities',
    articles: [
      {
        title: 'Project Templates',
        description: 'Create reusable project templates for common project types',
        readTime: '5 min',
        href: '#project-templates',
      },
      {
        title: 'Receipt Scanning Integration',
        description: 'Link receipt scanning directly to project expense tracking',
        readTime: '4 min',
        href: '#receipt-integration',
      },
      {
        title: 'Project Archives',
        description: 'Archive completed projects while maintaining historical data',
        readTime: '3 min',
        href: '#project-archives',
      },
      {
        title: 'Export & Reporting',
        description: 'Export project data for external accounting and analysis',
        readTime: '4 min',
        href: '#export-reporting',
      },
    ],
  },
];

export default function ProjectsDocumentationPage() {
  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Documentation', href: '/settings/documentation' },
        { label: 'Projects & Budgets' },
      ]}
    >
      {/* Page Header */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <FolderOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Projects & Budgets
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Master project management with comprehensive budget tracking and vendor management
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-12 p-8 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-2xl border border-cyan-200 dark:border-cyan-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto mb-3">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Project Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Organize projects with timelines and status tracking</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Budget vs Actual</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track spending against planned budgets</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Vendor Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track vendors, contractors, and suppliers</p>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Target className="w-8 h-8 text-cyan-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Project Status Tracking</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track projects from planning to completion</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <BarChart3 className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Budget Analytics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Detailed budget vs actual analysis with insights</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="w-8 h-8 text-purple-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Vendor Database</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Maintain contractor and supplier information</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Calendar className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Timeline Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Set deadlines and track project progress</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <TrendingUp className="w-8 h-8 text-red-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Financial Reporting</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Generate comprehensive financial reports</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <CheckSquare className="w-8 h-8 text-indigo-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Project Templates</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Reusable templates for common project types</p>
          </div>
        </div>
      </div>

      {/* Project Lifecycle */}
      <div className="mb-12 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Project Lifecycle Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold">1</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Planning</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Define scope, budget, and timeline</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold">2</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">In Progress</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Execute tasks and track expenses</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold">3</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">On Hold</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Pause for issues or resource constraints</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold">4</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Completed</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Finalize and analyze results</p>
          </div>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="space-y-12">
        {guides.map((guide) => (
          <section key={guide.title} className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5 text-white" />
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
                  className="group p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-cyan-300 dark:hover:border-cyan-600 hover:shadow-lg transition-all"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-cyan-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{article.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cyan-600 dark:text-cyan-400">{article.readTime}</span>
                    <Clock className="w-3 h-3 text-gray-400" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Pro Tips */}
      <div className="mt-12 p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 Pro Tips</h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
            <p><strong>Start with planning:</strong> Spend time in the planning phase to define clear scope and realistic budgets</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
            <p><strong>Add buffer to budgets:</strong> Include a 10-20% contingency for unexpected costs</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
            <p><strong>Track expenses regularly:</strong> Update project expenses weekly for accurate budget monitoring</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
            <p><strong>Use templates:</strong> Create templates for recurring project types like home renovations or events</p>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}