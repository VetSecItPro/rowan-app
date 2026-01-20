'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { logger } from '@/lib/logger';
import {
  Hammer,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Camera,
  FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  getProject,
  getProjectLineItems,
  getProjectPhotos,
  getProjectCostBreakdown,
  getProjectExpenses,
  type Project,
  type ProjectLineItem,
  type ProjectPhoto,
} from '@/lib/services/project-tracking-service';
import type { Expense } from '@/lib/services/expense-service';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { ProjectDashboard } from '@/components/budget/ProjectDashboard';
import { ProjectLineItems } from '@/components/budget/ProjectLineItems';
import { ProjectPhotoGallery } from '@/components/budget/ProjectPhotoGallery';
import { BudgetVarianceCard } from '@/components/budget/BudgetVarianceCard';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';

type CostBreakdownItem = {
  category: string;
  item_count: number;
  total_estimated: number;
  total_actual: number;
};

export default function ProjectTrackingPage() {
  const params = useParams();
  const projectId = params?.id;
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [project, setProject] = useState<Project | null>(null);
  const [lineItems, setLineItems] = useState<ProjectLineItem[]>([]);
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'costs' | 'photos' | 'expenses'>('overview');

  useEffect(() => {
    async function loadProjectData() {
      if (!projectId || typeof projectId !== 'string') return;

      try {
        setLoading(true);
        setError(null);

        const [
          projectData,
          lineItemsData,
          photosData,
          costBreakdownData,
          expensesData,
        ] = await Promise.all([
          getProject(projectId),
          getProjectLineItems(projectId),
          getProjectPhotos(projectId),
          getProjectCostBreakdown(projectId),
          getProjectExpenses(projectId),
        ]);

        setProject(projectData);
        setLineItems(lineItemsData);
        setPhotos(photosData);
        setCostBreakdown(costBreakdownData as unknown as CostBreakdownItem[]);
        setExpenses(expensesData as unknown as Expense[]);
      } catch (err) {
        logger.error('Failed to load project data:', err, { component: 'page', action: 'execution' });
        setError('Failed to load project information');
      } finally {
        setLoading(false);
      }
    }

    loadProjectData();
  }, [projectId]);

  if (!spaceId) {
    return <SpacesLoadingState />;
  }

  if (loading) {
    return (
      <FeatureLayout
        breadcrumbItems={[
          { label: 'Budget', href: '/budget' },
          { label: 'Projects', href: '/budget/projects' },
          { label: 'Loading...' },
        ]}
      >
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          <span className="ml-3 text-gray-400">Loading project data...</span>
        </div>
      </FeatureLayout>
    );
  }

  if (error || !project) {
    return (
      <FeatureLayout
        breadcrumbItems={[
          { label: 'Budget', href: '/budget' },
          { label: 'Projects', href: '/budget/projects' },
          { label: 'Error' },
        ]}
      >
        <div className="text-center py-16">
          <div className="text-red-400 mb-2">
            {error || 'Project not found'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </FeatureLayout>
    );
  }

  // Calculate project status indicators
  const isOverBudget = project.budget_variance < 0;
  const progressPercentage = project.estimated_budget
    ? Math.min(100, (project.actual_cost / project.estimated_budget) * 100)
    : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Hammer },
    { id: 'costs', label: 'Cost Breakdown', icon: DollarSign },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'expenses', label: 'Expenses', icon: FileText },
  ] as const;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-900/30 text-blue-200';
      case 'in-progress': return 'bg-green-900/30 text-green-200';
      case 'on-hold': return 'bg-yellow-900/30 text-yellow-200';
      case 'completed': return 'bg-emerald-900/30 text-emerald-200';
      case 'cancelled': return 'bg-red-900/30 text-red-200';
      default: return 'bg-gray-900/30 text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-900/30 text-red-200';
      case 'high': return 'bg-orange-900/30 text-orange-200';
      case 'medium': return 'bg-yellow-900/30 text-yellow-200';
      case 'low': return 'bg-green-900/30 text-green-200';
      default: return 'bg-gray-900/30 text-gray-200';
    }
  };

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Budget', href: '/budget' },
        { label: 'Projects', href: '/budget/projects' },
        { label: project.name },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Hammer className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-amber-400">
                  {project.name}
                </h1>
              </div>
              {project.description && (
                <p className="text-gray-400 mb-3">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                  {project.status.replace('-', ' ')}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(project.priority)}`}>
                  {project.priority} priority
                </span>
                {project.location && (
                  <span className="text-sm text-gray-400">
                    📍 {project.location}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Progress</div>
              <div className="text-2xl font-bold text-amber-400">
                {progressPercentage.toFixed(1)}%
              </div>
              <div className="w-24 bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-gray-300">Budget</span>
              </div>
              <p className="text-xl font-bold text-white">
                ${project.estimated_budget?.toLocaleString() || 'Not set'}
              </p>
              <p className="text-xs text-gray-400">
                Spent: ${project.actual_cost.toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {isOverBudget ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
                <span className="text-sm font-medium text-gray-300">Variance</span>
              </div>
              <p className={`text-xl font-bold ${
                isOverBudget
                  ? 'text-red-400'
                  : 'text-green-400'
              }`}>
                {isOverBudget ? '-' : '+'}${Math.abs(project.budget_variance).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">
                {project.variance_percentage.toFixed(1)}% {isOverBudget ? 'over' : 'under'}
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">Timeline</span>
              </div>
              <p className="text-xl font-bold text-white">
                {project.estimated_completion_date
                  ? format(parseISO(project.estimated_completion_date), 'MMM d')
                  : 'Not set'}
              </p>
              <p className="text-xs text-gray-400">
                {project.start_date
                  ? `Started ${format(parseISO(project.start_date), 'MMM d')}`
                  : 'Start date TBD'}
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Items</span>
              </div>
              <p className="text-xl font-bold text-white">
                {lineItems.length}
              </p>
              <p className="text-xs text-gray-400">
                {lineItems.filter(item => item.is_paid).length} paid
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'photos' && photos.length > 0 && (
                  <span className="bg-amber-900/30 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                    {photos.length}
                  </span>
                )}
                {tab.id === 'expenses' && expenses.length > 0 && (
                  <span className="bg-amber-900/30 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                    {expenses.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <ProjectDashboard
              project={project}
              lineItems={lineItems}
              costBreakdown={costBreakdown}
              expenses={expenses}
              onRefresh={() => window.location.reload()}
            />
          )}

          {activeTab === 'costs' && (
            <ProjectLineItems
              projectId={project.id}
              lineItems={lineItems}
              costBreakdown={costBreakdown}
              onRefresh={() => window.location.reload()}
            />
          )}

          {activeTab === 'photos' && (
            <ProjectPhotoGallery
              projectId={project.id}
              photos={photos}
              onRefresh={() => window.location.reload()}
            />
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Linked Expenses
                </h3>
                <span className="text-sm text-gray-400">
                  {expenses.length} expense{expenses.length !== 1 ? 's' : ''} linked
                </span>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No expenses linked yet</p>
                  <p className="text-sm text-gray-500">
                    Link expenses to this project from the main expenses page
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">
                          {expense.description}
                        </h4>
                        <span className="text-lg font-bold text-amber-400">
                          ${expense.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        {expense.date && <span>{format(parseISO(expense.date), 'MMM d, yyyy')}</span>}
                        {expense.category && (
                          <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                            {expense.category}
                          </span>
                        )}
                        {expense.vendor_id && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Vendor linked
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Budget Variance Alert */}
        {isOverBudget && (
          <div className="mt-6">
            <BudgetVarianceCard
              project={project}
              lineItems={lineItems}
            />
          </div>
        )}
      </div>
    </FeatureLayout>
  );
}
