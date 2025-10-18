'use client';

import { memo, useState } from 'react';
import { Folder, Calendar, DollarSign, MoreVertical, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import type { Project } from '@/lib/services/project-tracking-service';
import { pdfExportService } from '@/lib/services/pdf-export-service';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  showLink?: boolean;
}

const statusConfig = {
  planning: { label: 'Planning', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  'in-progress': { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  'on-hold': { label: 'On Hold', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-500', icon: '⬇️' },
  medium: { label: 'Medium', color: 'text-blue-500', icon: '➡️' },
  high: { label: 'High', color: 'text-orange-500', icon: '⬆️' },
  urgent: { label: 'Urgent', color: 'text-red-500', icon: '🔥' },
};

export const ProjectCard = memo(({ project, onEdit, onDelete, showLink = false }: ProjectCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate budget progress percentage
  const budgetProgress = project.estimated_budget
    ? Math.min(100, (project.actual_cost / project.estimated_budget) * 100)
    : 0;

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      setShowMenu(false);
      await pdfExportService.exportProjectCostReport(project.id);
    } catch (error) {
      console.error('Failed to export project report:', error);
      alert('Failed to export project report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const isOverBudget = project.budget_variance < 0;
  const isUnderBudget = project.budget_variance > 0 && project.estimated_budget;

  const statusInfo = statusConfig[project.status] || statusConfig.planning;
  const priorityInfo = priorityConfig[project.priority] || priorityConfig.medium;

  const CardContent = () => (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Folder className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
              <span className={`text-xs ${priorityInfo.color}`}>
                {priorityInfo.icon}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {project.location && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  📍 {project.location}
                </span>
              )}
            </div>
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Project options menu"
              className="btn-touch w-12 h-12 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95 hover-lift shimmer-amber active-press"
            >
              <MoreVertical className="w-5 h-5 md:w-4 md:h-4 text-gray-500 dark:text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-40 dropdown-mobile bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                  {onEdit && (
                    <button
                      onClick={() => { onEdit(project); setShowMenu(false); }}
                      className="btn-touch w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg text-gray-900 dark:text-white active:scale-[0.98] hover-lift shimmer-amber active-press"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="btn-touch w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 hover-lift shimmer-amber active-press"
                  >
                    <FileText className="w-4 h-4" />
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => { onDelete(project.id); setShowMenu(false); }}
                      className="btn-touch w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg active:scale-[0.98] hover-lift shimmer-red active-press"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Budget Info */}
      {project.estimated_budget && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Estimated</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              ${project.estimated_budget.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Actual</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              ${project.actual_cost.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Budget Variance */}
      {isOverBudget && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-xs font-medium text-red-600 dark:text-red-400">
            Over budget by ${Math.abs(project.budget_variance).toLocaleString()} ({Math.abs(project.variance_percentage)}%)
          </span>
        </div>
      )}

      {isUnderBudget && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            Under budget by ${project.budget_variance.toLocaleString()} ({project.variance_percentage}%)
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
        {project.start_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(project.start_date).toLocaleDateString()}</span>
          </div>
        )}
        {project.estimated_completion_date && (
          <div className="flex items-center gap-1">
            <span className="text-xs">→</span>
            <span>{new Date(project.estimated_completion_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              #{tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              +{project.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Budget Progress Bar */}
      {project.estimated_budget && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget Used</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{budgetProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isOverBudget ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-amber-600'
              }`}
              style={{ width: `${Math.min(100, budgetProgress)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return showLink ? (
    <Link href={`/projects/${project.id}`}>
      <CardContent />
    </Link>
  ) : (
    <CardContent />
  );
});

ProjectCard.displayName = 'ProjectCard';
