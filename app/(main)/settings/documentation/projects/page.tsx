'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { FolderOpen, Target, DollarSign, TrendingUp, Users, Calendar, FileText, BarChart3, Clock, CheckSquare, ArrowLeft } from 'lucide-react';

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
    description: 'Learn the basics of project management and budget tracking',
    icon: FolderOpen,
    color: 'from-cyan-500 to-cyan-600',
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
    icon: Target,
    color: 'from-blue-500 to-blue-600',
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
    icon: DollarSign,
    color: 'from-green-500 to-green-600',
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
    icon: Users,
    color: 'from-purple-500 to-purple-600',
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
    icon: BarChart3,
    color: 'from-indigo-500 to-indigo-600',
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
    icon: Users,
    color: 'from-pink-500 to-pink-600',
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
    icon: CheckSquare,
    color: 'from-orange-500 to-orange-600',
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
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-cyan-50/30 to-blue-50/30 dark:from-gray-950 dark:via-cyan-950/20 dark:to-blue-950/20">
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
                          className="group p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-cyan-300 dark:hover:border-cyan-600 transition-all duration-200 hover:-translate-y-1"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            {article.description}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-cyan-600 dark:text-cyan-400 font-medium">
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
        </div>
      </div>
    </>
  );
}