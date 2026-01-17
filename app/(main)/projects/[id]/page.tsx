'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import {
  ArrowLeft,
  Folder,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Receipt,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import {
  getProject,
  getProjectExpenses,
  getProjectPhotos,
  deleteProject,
  type Project
} from '@/lib/services/project-tracking-service';
import type { Expense } from '@/lib/services/expense-service';
import type { ProjectPhoto } from '@/lib/services/project-tracking-service';

type TabType = 'overview' | 'expenses' | 'photos';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string | undefined;

  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const [projectData, expensesData, photosData] = await Promise.all([
        getProject(projectId),
        getProjectExpenses(projectId),
        getProjectPhotos(projectId)
      ]);

      setProject(projectData);
      setExpenses(expensesData);
      setPhotos(photosData);
    } catch (err) {
      logger.error('Error loading project:', err, { component: 'page', action: 'execution' });
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    if (!projectId) return;

    try {
      await deleteProject(projectId);
      router.push('/projects');
    } catch (err) {
      logger.error('Error deleting project:', err, { component: 'page', action: 'execution' });
      alert('Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-800 rounded w-1/3"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
            <p className="text-red-400">{error || 'Project not found'}</p>
            <Link href="/projects" className="text-red-400 underline mt-4 inline-block">
              ← Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = {
    planning: { label: 'Planning', color: 'bg-blue-100 bg-blue-900/30 text-blue-400' },
    'in-progress': { label: 'In Progress', color: 'bg-yellow-100 bg-yellow-900/30 text-yellow-400' },
    completed: { label: 'Completed', color: 'bg-green-100 bg-green-900/30 text-green-400' },
    'on-hold': { label: 'On Hold', color: 'bg-gray-900/30 text-gray-400' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 bg-red-900/30 text-red-400' },
  };

  const priorityConfig = {
    low: { label: 'Low', color: 'text-gray-500', icon: '⬇️' },
    medium: { label: 'Medium', color: 'text-blue-500', icon: '➡️' },
    high: { label: 'High', color: 'text-orange-500', icon: '⬆️' },
    urgent: { label: 'Urgent', color: 'text-red-500', icon: '🔥' },
  };

  const statusInfo = statusConfig[project.status];
  const priorityInfo = priorityConfig[project.priority];
  const budgetProgress = project.estimated_budget
    ? Math.min(100, (project.actual_cost / project.estimated_budget) * 100)
    : 0;
  const isOverBudget = project.budget_variance < 0;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/projects"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                  <Folder className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                    <span className={priorityInfo.color}>{priorityInfo.icon}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {project.location && (
                      <span className="text-sm text-gray-400">
                        📍 {project.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/projects/${projectId}/edit`)}
              className="px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Budget Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Estimated Budget</p>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              ${project.estimated_budget?.toLocaleString() || '0'}
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Actual Cost</p>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              ${project.actual_cost.toLocaleString()}
            </p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">Budget Used</span>
                <span className="font-medium">{budgetProgress.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isOverBudget ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-amber-600'
                  }`}
                  style={{ width: `${Math.min(100, budgetProgress)}%` }}
                />
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-6 ${
            isOverBudget
              ? 'bg-red-900/20 border border-red-800'
              : 'bg-green-900/20 border border-green-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-medium ${
                isOverBudget ? 'text-red-400' : 'text-green-400'
              }`}>
                Variance
              </p>
              {isOverBudget ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-green-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${
              isOverBudget ? 'text-red-400' : 'text-green-400'
            }`}>
              {isOverBudget ? '-' : '+'}${Math.abs(project.budget_variance).toLocaleString()}
            </p>
            <p className="text-xs mt-1">
              <span className={isOverBudget ? 'text-red-400' : 'text-green-400'}>
                {Math.abs(project.variance_percentage)}% {isOverBudget ? 'over' : 'under'} budget
              </span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <div className="flex gap-6">
            {[
              { id: 'overview' as TabType, label: 'Overview', icon: FileText },
              { id: 'expenses' as TabType, label: 'Expenses', icon: Receipt, count: expenses.length },
              { id: 'photos' as TabType, label: 'Photos', icon: ImageIcon, count: photos.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-800 text-xs font-medium">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {project.description && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h3 className="font-semibold text-white mb-3">Description</h3>
                  <p className="text-gray-400">{project.description}</p>
                </div>
              )}

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-4">Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {project.start_date && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Start Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-white">
                          {new Date(project.start_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {project.estimated_completion_date && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Estimated Completion</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-white">
                          {new Date(project.estimated_completion_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {project.actual_completion_date && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Actual Completion</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <p className="text-white">
                          {new Date(project.actual_completion_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {project.tags && project.tags.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                  <h3 className="font-semibold text-white mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full bg-gray-700 text-sm text-gray-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-4">
              {expenses.length === 0 ? (
                <div className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl p-12 text-center">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No expenses yet</h3>
                  <p className="text-sm text-gray-400">
                    Link expenses to this project to track costs
                  </p>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-xl divide-y divide-gray-700">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-white">{expense.description}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'} • {expense.category}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-white">
                          ${expense.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div>
              {photos.length === 0 ? (
                <div className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl p-12 text-center">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No photos yet</h3>
                  <p className="text-sm text-gray-400">
                    Add before/after photos to document your project
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                      <div className="aspect-video bg-gray-700">
                        {/* Photo image would go here */}
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      </div>
                      <div className="p-4">
                        {photo.title && (
                          <p className="font-medium text-white mb-1">{photo.title}</p>
                        )}
                        <p className="text-sm text-gray-400">
                          {photo.photo_type} • {new Date(photo.taken_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
