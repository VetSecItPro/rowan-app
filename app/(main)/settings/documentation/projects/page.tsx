import Link from 'next/link';

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
    <div className="min-h-screen bg-black">
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <FolderOpen className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Projects & Budgets
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Master project management with comprehensive budget tracking and vendor management
              </p>
            </div>
          </div>

          {/* Guide Sections */}
          <div className="space-y-12">
            {guideSections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="bg-gray-800/80 border border-gray-700/60 rounded-3xl overflow-hidden shadow-lg">
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
                          className="group p-6 bg-gray-800 rounded-2xl border border-gray-700 hover:shadow-lg hover:border-cyan-600 transition-all duration-200 hover:-translate-y-1"
                        >
                          <h3 className="font-semibold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                            {article.description}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-cyan-400 font-medium">
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
          <div className="mt-12 p-6 bg-gradient-to-br from-green-900/20 to-green-800/20 rounded-2xl border border-green-800">
            <h3 className="text-lg font-semibold text-white mb-4">💡 Pro Tips</h3>
            <div className="space-y-3 text-sm text-gray-300">
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

          {/* ==================== ARTICLE CONTENT SECTIONS ==================== */}
          <div className="mt-16 space-y-16">

            {/* Getting Started Section */}
            <section id="understanding-projects" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Understanding Project Management</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Projects in Rowan help you manage large undertakings that have defined budgets, timelines, and multiple expenses. Unlike simple expense tracking, projects give you a comprehensive view of your spending against planned budgets.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">When to Use Projects</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Home Renovations:</strong> Kitchen remodels, bathroom upgrades, landscaping</li>
                  <li><strong>Events:</strong> Weddings, birthday parties, holiday gatherings</li>
                  <li><strong>Travel:</strong> Vacation planning with flights, hotels, activities</li>
                  <li><strong>Large Purchases:</strong> New car, furniture, appliances</li>
                  <li><strong>Home Improvement:</strong> DIY projects, repairs, upgrades</li>
                </ul>
                <div className="mt-6 p-4 bg-cyan-900/20 rounded-xl border border-cyan-800">
                  <p className="text-sm text-cyan-200">
                    <strong>Pro Tip:</strong> If something has a budget and multiple expenses spread over time, it&apos;s a good candidate for a project rather than just expense tracking.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="first-project" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Creating Your First Project</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Setting up your first project is straightforward. Here&apos;s what you need to get started.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Step-by-Step Guide</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-400">
                  <li>Navigate to <strong>Projects</strong> from the main navigation</li>
                  <li>Tap <strong>+ New Project</strong></li>
                  <li>Enter a descriptive project name (e.g., &quot;Kitchen Renovation 2024&quot;)</li>
                  <li>Set your total budget amount</li>
                  <li>Choose a category (Home, Travel, Event, etc.)</li>
                  <li>Set start and target completion dates</li>
                  <li>Add any initial notes or description</li>
                  <li>Tap <strong>Create Project</strong></li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Essential Project Fields</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Project Name:</strong> Make it specific and searchable</li>
                  <li><strong>Budget:</strong> Your total planned spending</li>
                  <li><strong>Timeline:</strong> Start and end dates</li>
                  <li><strong>Category:</strong> For organization and reporting</li>
                  <li><strong>Status:</strong> Planning, In Progress, Completed, On Hold</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="project-vs-budget" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Project vs Budget Tracking</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Understanding when to use Projects versus regular budget tracking helps you get the most out of Rowan.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Use Projects When:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>You have a specific, time-bound goal with a defined budget</li>
                  <li>Multiple expenses will contribute to one objective</li>
                  <li>You need to track budget vs actual spending in real-time</li>
                  <li>You&apos;re working with vendors or contractors</li>
                  <li>You want to archive completed work for future reference</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Use Regular Budgets When:</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Tracking ongoing monthly expenses (groceries, utilities)</li>
                  <li>Managing recurring spending without a specific end goal</li>
                  <li>You want category-based spending limits</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Project Setup Section */}
            <section id="project-status" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Project Status Tracking</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Project statuses help you track progress and filter your project list effectively.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Available Statuses</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Planning:</strong> Project is being defined, budget not yet finalized</li>
                  <li><strong>In Progress:</strong> Active work is happening, expenses being tracked</li>
                  <li><strong>On Hold:</strong> Temporarily paused, budget frozen</li>
                  <li><strong>Completed:</strong> Project finished, archived for records</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">When to Change Status</h3>
                <p className="text-gray-400">
                  Update status as your project progresses. This helps with filtering, reporting, and understanding which projects need attention. Completed projects are archived but still accessible for budget analysis.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="project-categories" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Project Categories</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Organize projects by category to make filtering and reporting easier.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Default Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-gray-400">
                  <div>• Home Improvement</div>
                  <div>• Renovation</div>
                  <div>• Travel & Vacation</div>
                  <div>• Events & Parties</div>
                  <div>• Auto & Vehicle</div>
                  <div>• Garden & Outdoor</div>
                  <div>• Technology</div>
                  <div>• Education</div>
                  <div>• Other</div>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="project-timeline" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Project Timeline Management</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Setting realistic timelines helps you plan expenses and track progress effectively.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Timeline Elements</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Start Date:</strong> When the project begins (can be in the future for planning)</li>
                  <li><strong>Target End Date:</strong> Your goal completion date</li>
                  <li><strong>Actual End Date:</strong> When the project was actually completed</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Timeline Best Practices</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Add buffer time for unexpected delays</li>
                  <li>Consider vendor lead times and scheduling</li>
                  <li>Account for decision-making time</li>
                  <li>Update timelines as reality changes</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="project-documentation" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Project Description & Notes</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Good documentation helps you remember project details and share context with family members.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What to Document</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Project goals and scope</li>
                  <li>Key decisions and reasoning</li>
                  <li>Vendor contact information</li>
                  <li>Important dates and milestones</li>
                  <li>Lessons learned during the project</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Budget Management Section */}
            <section id="setting-budgets" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Setting Project Budgets</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  A well-defined budget is the foundation of successful project management.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Budget Setting Tips</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Research First:</strong> Get quotes and estimates before setting your budget</li>
                  <li><strong>Include Everything:</strong> Materials, labor, permits, taxes, delivery</li>
                  <li><strong>Add Contingency:</strong> 10-20% buffer for unexpected costs</li>
                  <li><strong>Be Realistic:</strong> Quality work costs money - don&apos;t underbudget</li>
                </ul>
                <div className="mt-6 p-4 bg-green-900/20 rounded-xl border border-green-800">
                  <p className="text-sm text-green-200">
                    <strong>Budget Formula:</strong> Estimated costs + 15% contingency = Project budget. This gives you breathing room without excessive padding.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="expense-tracking" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Expense Tracking</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Track every expense against your project budget to maintain control over spending.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Adding Project Expenses</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Open your project</li>
                  <li>Tap <strong>Add Expense</strong></li>
                  <li>Enter the expense details (amount, description, date)</li>
                  <li>Optionally attach a receipt image</li>
                  <li>Save - the expense is linked to your project</li>
                </ol>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What to Track</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>All purchases related to the project</li>
                  <li>Vendor payments and deposits</li>
                  <li>Permits and fees</li>
                  <li>Delivery and shipping costs</li>
                  <li>Tools or equipment rental</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="budget-analysis" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Budget vs Actual Analysis</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Real-time budget vs actual tracking helps you stay on target and make informed decisions.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Key Metrics</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Budget:</strong> Your planned total spending</li>
                  <li><strong>Actual:</strong> What you&apos;ve spent so far</li>
                  <li><strong>Remaining:</strong> Budget minus actual</li>
                  <li><strong>Percentage Used:</strong> How much of budget is consumed</li>
                </ul>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Warning Signs</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Spending faster than timeline progress</li>
                  <li>Approaching 80% budget before 80% complete</li>
                  <li>Multiple unexpected expenses</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="cost-overruns" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Cost Overrun Management</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  When projects go over budget, you have options for how to handle it.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Options for Overruns</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Adjust Budget:</strong> Increase the budget if you have funds available</li>
                  <li><strong>Reduce Scope:</strong> Cut back on non-essential items</li>
                  <li><strong>Pause Project:</strong> Put on hold until more funds are available</li>
                  <li><strong>Document & Continue:</strong> Accept the overrun and complete the project</li>
                </ul>
                <div className="mt-6 p-4 bg-yellow-900/20 rounded-xl border border-yellow-800">
                  <p className="text-sm text-yellow-200">
                    <strong>Learning Opportunity:</strong> Track why overruns happened. This data helps you budget more accurately for future projects.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="multi-category" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Multi-Category Budgets</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Large projects benefit from breaking the budget into categories for better tracking.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Example: Kitchen Renovation</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Cabinets: $5,000</li>
                  <li>Countertops: $3,000</li>
                  <li>Appliances: $4,000</li>
                  <li>Flooring: $2,000</li>
                  <li>Labor: $5,000</li>
                  <li>Contingency: $2,000</li>
                  <li><strong>Total: $21,000</strong></li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Vendor Management Section */}
            <section id="vendor-database" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Vendor Database</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Keep track of contractors, suppliers, and service providers you work with across projects.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Vendor Information to Track</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Business name and contact person</li>
                  <li>Phone, email, website</li>
                  <li>Service type (contractor, supplier, etc.)</li>
                  <li>Notes on quality and reliability</li>
                  <li>Payment terms and methods</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="vendor-payments" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Vendor Payment Tracking</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Track payments to vendors to ensure you&apos;re staying on budget and meeting payment schedules.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Payment Best Practices</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Never pay 100% upfront - use milestone payments</li>
                  <li>Keep records of all payments with receipts</li>
                  <li>Document what each payment was for</li>
                  <li>Hold final payment until work is complete and inspected</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="resource-allocation" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Resource Allocation</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Assign family members to project tasks for clear accountability.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Benefits of Assignment</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Clear responsibility for each aspect</li>
                  <li>Better coordination on larger projects</li>
                  <li>Track who made purchases</li>
                  <li>Distribute workload fairly</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="vendor-performance" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Vendor Performance</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Track vendor performance to make better decisions on future projects.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What to Evaluate</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Quality of work</li>
                  <li>On-time delivery</li>
                  <li>Communication</li>
                  <li>Price vs. value</li>
                  <li>Would you hire them again?</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Analytics Section */}
            <section id="project-dashboard" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Project Dashboard</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Your project dashboard provides an at-a-glance view of all active projects.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Dashboard Information</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Active projects with status indicators</li>
                  <li>Budget utilization summary</li>
                  <li>Projects approaching deadline</li>
                  <li>Recent project activity</li>
                  <li>Total portfolio value</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="financial-reports" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Financial Reports</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Generate detailed reports on project spending and budget performance.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Available Reports</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Individual project budget vs actual</li>
                  <li>Expense breakdown by category</li>
                  <li>Vendor payment summary</li>
                  <li>Cross-project spending analysis</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="progress-tracking" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Progress Tracking</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Track project completion alongside budget consumption to ensure they stay aligned.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Progress Indicators</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Timeline progress (% of time elapsed)</li>
                  <li>Budget consumption (% spent)</li>
                  <li>Ideally these should align - 50% time = ~50% budget</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="budget-utilization" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Budget Utilization</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Understand how efficiently you&apos;re using your project budgets.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Utilization Insights</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Under-utilized budgets may indicate over-estimation</li>
                  <li>Over-utilized budgets signal scope creep or underestimation</li>
                  <li>Historical data helps with future budgeting</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="roi-analysis" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">ROI Analysis</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  For investment-type projects, track return on investment to understand value created.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">ROI Considerations</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Home Improvements:</strong> Estimated increase in home value</li>
                  <li><strong>Energy Efficiency:</strong> Monthly savings on utilities</li>
                  <li><strong>Quality of Life:</strong> Not all value is monetary</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Collaboration Section */}
            <section id="team-projects" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Team Project Management</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Work together on projects with your family members or partner.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Collaboration Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>All space members can view project details</li>
                  <li>Any member can add expenses to projects</li>
                  <li>Real-time updates across all devices</li>
                  <li>Shared vendor database</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="project-sharing" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Project Sharing</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Projects are automatically shared with all members of your space.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What&apos;s Shared</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Project details and budget</li>
                  <li>All expenses and receipts</li>
                  <li>Timeline and status</li>
                  <li>Notes and documentation</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="approval-workflows" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Approval Workflows</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  For larger purchases, discuss with your partner before committing.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Informal Approval Process</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Use project notes to discuss major decisions</li>
                  <li>Set spending thresholds that require discussion</li>
                  <li>Check budget remaining before large purchases</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="project-communication" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Communication & Updates</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Keep everyone informed about project progress.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Staying Connected</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Real-time updates show new expenses</li>
                  <li>Use project notes for important updates</li>
                  <li>Review project status together regularly</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Advanced Section */}
            <section id="project-templates" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Project Templates</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Create templates for project types you do frequently to speed up setup.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Template Ideas</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Annual vacation planning</li>
                  <li>Birthday party organization</li>
                  <li>Seasonal home maintenance</li>
                  <li>Holiday gift budgeting</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="receipt-integration" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Receipt Scanning Integration</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Use AI receipt scanning to quickly add project expenses with all details extracted automatically.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Integration Benefits</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Scan receipts directly to projects</li>
                  <li>AI extracts merchant, amount, and date</li>
                  <li>Receipt images attached for records</li>
                  <li>Saves time on manual data entry</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="project-archives" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Project Archives</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Completed projects are archived but remain accessible for future reference.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Archive Benefits</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Historical record of all spending</li>
                  <li>Reference for future similar projects</li>
                  <li>Vendor performance history</li>
                  <li>Budget accuracy analysis</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            <section id="export-reporting" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Export & Reporting</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Export project data for external use in accounting software, spreadsheets, or tax preparation.
                </p>
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Export Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>CSV:</strong> All expenses with project details</li>
                  <li><strong>PDF Summary:</strong> Formatted project report</li>
                  <li><strong>Receipt Package:</strong> All attached receipt images</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-cyan-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

          </div>
        </div>
      </div>
  );
}