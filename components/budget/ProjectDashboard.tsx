'use client';

import {
  Calendar,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Users,
  MapPin,
  Edit3,
  Plus
} from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { DynamicPieChart, DynamicBarChart } from '@/components/charts/DynamicCharts';
import type { Project, ProjectLineItem } from '@/lib/services/project-tracking-service';

type CostBreakdownItem = {
  category: string;
  total_estimated: number;
  total_actual: number;
};

type ProjectExpense = {
  id?: string;
  amount: number;
  date: string;
  category?: string;
  description?: string;
  vendor?: string;
};

interface ProjectDashboardProps {
  project: Project;
  lineItems: ProjectLineItem[];
  costBreakdown: CostBreakdownItem[];
  expenses: ProjectExpense[];
  onRefresh: () => void;
}

export function ProjectDashboard({
  project,
  lineItems,
  costBreakdown,
}: ProjectDashboardProps) {
  // Calculate metrics
  const totalEstimated = lineItems.reduce((sum, item) => sum + item.estimated_cost, 0);
  const totalActual = lineItems.reduce((sum, item) => sum + item.actual_cost, 0);
  const totalPaid = lineItems.filter(item => item.is_paid).reduce((sum, item) => sum + item.actual_cost, 0);

  const completedItems = lineItems.filter(item => item.is_paid).length;
  const pendingItems = lineItems.filter(item => !item.is_paid).length;

  const progressPercentage = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0;
  const paymentPercentage = totalEstimated > 0 ? (totalPaid / totalEstimated) * 100 : 0;

  // Timeline calculations
  const isOverdue = project.estimated_completion_date && project.status !== 'completed'
    ? isAfter(new Date(), parseISO(project.estimated_completion_date))
    : false;

  const daysRemaining = project.estimated_completion_date && project.status !== 'completed'
    ? Math.ceil((parseISO(project.estimated_completion_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Chart data
  const categoryData = costBreakdown.map((item, index) => ({
    name: item.category,
    estimated: item.total_estimated,
    actual: item.total_actual,
    color: [
      '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6',
      '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6b7280'
    ][index % 10],
  }));

  const statusData = [
    { name: 'Paid', value: completedItems, color: '#10b981' },
    { name: 'Pending', value: pendingItems, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Financial Summary */}
        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-green-400">
              {project.variance_percentage > 0 ? 'Under Budget' : 'Over Budget'}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-green-100 mb-1">
            ${totalActual.toLocaleString()}
          </h3>
          <p className="text-sm text-green-300">
            of ${totalEstimated.toLocaleString()} estimated
          </p>
          <div className="w-full bg-green-800 rounded-full h-2 mt-3">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-blue-400">
              {completedItems} of {lineItems.length}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-blue-100 mb-1">
            ${totalPaid.toLocaleString()}
          </h3>
          <p className="text-sm text-blue-300">
            Paid ({paymentPercentage.toFixed(1)}%)
          </p>
          <div className="w-full bg-blue-800 rounded-full h-2 mt-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${paymentPercentage}%` }}
            />
          </div>
        </div>

        {/* Timeline Status */}
        <div className={`bg-gradient-to-br ${
          isOverdue
            ? 'from-red-900/20 to-orange-900/20 border-red-800'
            : 'from-purple-900/20 to-indigo-900/20 border-purple-800'
        } border rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${
              isOverdue
                ? 'from-red-500 to-red-600'
                : 'from-purple-500 to-purple-600'
            } shadow-lg`}>
              {isOverdue ? (
                <AlertTriangle className="w-6 h-6 text-white" />
              ) : (
                <Calendar className="w-6 h-6 text-white" />
              )}
            </div>
            <span className={`text-sm font-medium ${
              isOverdue
                ? 'text-red-400'
                : 'text-purple-400'
            }`}>
              {isOverdue ? 'Overdue' : 'On Track'}
            </span>
          </div>
          <h3 className={`text-2xl font-bold mb-1 ${
            isOverdue
              ? 'text-red-100'
              : 'text-purple-100'
          }`}>
            {daysRemaining !== null
              ? `${Math.abs(daysRemaining)} days`
              : 'No deadline'}
          </h3>
          <p className={`text-sm ${
            isOverdue
              ? 'text-red-300'
              : 'text-purple-300'
          }`}>
            {daysRemaining !== null
              ? (daysRemaining >= 0 ? 'remaining' : 'overdue')
              : 'set completion date'}
          </p>
        </div>

        {/* Items Status */}
        <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 border border-amber-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-amber-400">
              {lineItems.length} total
            </span>
          </div>
          <h3 className="text-2xl font-bold text-amber-100 mb-1">
            {completedItems}
          </h3>
          <p className="text-sm text-amber-300">
            Items completed
          </p>
          <div className="w-full bg-amber-800 rounded-full h-2 mt-3">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${lineItems.length > 0 ? (completedItems / lineItems.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost Breakdown by Category */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              Cost by Category
            </h3>
            <span className="text-sm text-gray-400">
              {costBreakdown.length} categories
            </span>
          </div>

          {costBreakdown.length > 0 ? (
            <DynamicBarChart
              data={categoryData}
              xDataKey="name"
              yDataKey="estimated"
              barColor="#f59e0b"
              height={300}
              showGrid={true}
              showLegend={true}
            />
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No cost data available</p>
            </div>
          )}
        </div>

        {/* Payment Status Pie Chart */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              Payment Status
            </h3>
            <span className="text-sm text-gray-400">
              {lineItems.length} items
            </span>
          </div>

          {lineItems.length > 0 ? (
            <DynamicPieChart
              data={statusData}
              colors={statusData.map(item => item.color)}
              height={300}
            />
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No items to track</p>
            </div>
          )}
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-amber-100">
            Project Details
          </h3>
          <button
            onClick={() => setShowEditProject(true)}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors text-sm font-medium"
          >
            <Edit3 className="w-4 h-4" />
            Edit Project
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Timeline</span>
            </div>
            <div className="space-y-2 text-sm">
              {project.start_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Started:</span>
                  <span className="text-white">
                    {format(parseISO(project.start_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              {project.estimated_completion_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Target:</span>
                  <span className="text-white">
                    {format(parseISO(project.estimated_completion_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              {project.actual_completion_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed:</span>
                  <span className="text-white">
                    {format(parseISO(project.actual_completion_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Location & Tags</span>
            </div>
            <div className="space-y-2 text-sm">
              {project.location && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Location:</span>
                  <span className="text-white">{project.location}</span>
                </div>
              )}
              {project.tags && project.tags.length > 0 && (
                <div className="space-y-1">
                  <span className="text-gray-400">Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {project.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-amber-900/30 text-amber-300 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Budget Summary</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Estimated:</span>
                <span className="text-white">
                  ${project.estimated_budget?.toLocaleString() || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Actual:</span>
                <span className="text-white">
                  ${project.actual_cost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Variance:</span>
                <span className={`font-medium ${
                  project.budget_variance >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {project.budget_variance >= 0 ? '+' : ''}${project.budget_variance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="flex items-center gap-3 p-4 bg-gray-800 border border-gray-700 rounded-full hover:bg-gray-700 transition-colors">
          <Plus className="w-5 h-5 text-amber-400" />
          <div className="text-left">
            <p className="font-medium text-white">Add Line Item</p>
            <p className="text-sm text-gray-400">Track new project expense</p>
          </div>
        </button>

        <button className="flex items-center gap-3 p-4 bg-gray-800 border border-gray-700 rounded-full hover:bg-gray-700 transition-colors">
          <Users className="w-5 h-5 text-amber-400" />
          <div className="text-left">
            <p className="font-medium text-white">Manage Vendors</p>
            <p className="text-sm text-gray-400">Add or update vendor info</p>
          </div>
        </button>

        <button className="flex items-center gap-3 p-4 bg-gray-800 border border-gray-700 rounded-full hover:bg-gray-700 transition-colors">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <div className="text-left">
            <p className="font-medium text-white">View Reports</p>
            <p className="text-sm text-gray-400">Generate cost analysis</p>
          </div>
        </button>
      </div>
    </div>
  );
}
