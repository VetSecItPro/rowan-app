'use client';

import { memo, useState, useEffect } from 'react';
import { Folder, Calendar, MoreVertical, AlertTriangle, CheckCircle, FileText, Target } from 'lucide-react';
import Link from 'next/link';
import type { Project } from '@/lib/services/project-tracking-service';
import { pdfExportService } from '@/lib/services/pdf-export-service';
import { projectMilestonesService } from '@/lib/services/project-milestones-service';
import { logger } from '@/lib/logger';
import { showError } from '@/lib/utils/toast';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  showLink?: boolean;
}

const statusConfig = {
  planning: { label: 'Planning', color: 'bg-blue-100 bg-blue-900/30 text-blue-400' },
  'in-progress': { label: 'In Progress', color: 'bg-yellow-100 bg-yellow-900/30 text-yellow-400' },
  completed: { label: 'Completed', color: 'bg-green-100 bg-green-900/30 text-green-400' },
  'on-hold': { label: 'On Hold', color: 'bg-gray-900/30 text-gray-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 bg-red-900/30 text-red-400' },
};

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-400', icon: '⬇️' },
  medium: { label: 'Medium', color: 'text-blue-500', icon: '➡️' },
  high: { label: 'High', color: 'text-orange-500', icon: '⬆️' },
  urgent: { label: 'Urgent', color: 'text-red-500', icon: '🔥' },
};

/** Renders a project overview card with progress, budget, and member info. */
export const ProjectCard = memo(({ project, onEdit, onDelete, showLink = false }: ProjectCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [milestoneProgress, setMilestoneProgress] = useState<{ total: number; completed: number; percentage: number } | null>(null);

  // Load milestone progress
  useEffect(() => {
    async function loadProgress() {
      try {
        const progress = await projectMilestonesService.getMilestoneProgress(project.id);
        if (progress.total > 0) {
          setMilestoneProgress(progress);
        }
      } catch {
        // Silently fail - milestones are optional
      }
    }
    loadProgress();
  }, [project.id]);

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
      logger.error('Failed to export project report:', error, { component: 'ProjectCard', action: 'component_action' });
      showError('Failed to export project report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger edit if clicking on menu button or menu items
    const target = e.target as HTMLElement;
    if (target.closest('[data-menu-area]')) return;

    if (onEdit) {
      onEdit(project);
    }
  };

  const isOverBudget = project.budget_variance < 0;
  const isUnderBudget = project.budget_variance > 0 && project.estimated_budget;

  const statusInfo = statusConfig[project.status] || statusConfig.planning;
  const priorityInfo = priorityConfig[project.priority] || priorityConfig.medium;

  const CardContent = () => (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow ${onEdit ? 'cursor-pointer hover:border-amber-600' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Folder className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{project.name}</h3>
              <span className={`text-xs ${priorityInfo.color}`}>
                {priorityInfo.icon}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {project.location && (
                <span className="text-xs text-gray-400">
                  📍 {project.location}
                </span>
              )}
            </div>
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="relative" data-menu-area>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              aria-label="Project options menu"
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} aria-hidden="true" />
                <div className="absolute right-0 mt-1 w-40 dropdown-mobile bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20" onClick={(e) => e.stopPropagation()}>
                  {onEdit && (
                    <button
                      onClick={() => { onEdit(project); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 rounded-t-lg text-white transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => { onDelete(project.id); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 rounded-b-lg transition-colors"
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
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Budget Info */}
      {project.estimated_budget && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400">Estimated</p>
            <p className="text-sm font-semibold text-white">
              ${project.estimated_budget.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Actual</p>
            <p className="text-sm font-semibold text-white">
              ${project.actual_cost.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Budget Variance */}
      {isOverBudget && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-900/20 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-xs font-medium text-red-400">
            Over budget by ${Math.abs(project.budget_variance).toLocaleString()} ({Math.abs(project.variance_percentage)}%)
          </span>
        </div>
      )}

      {isUnderBudget && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-900/20 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-xs font-medium text-green-400">
            Under budget by ${project.budget_variance.toLocaleString()} ({project.variance_percentage}%)
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
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

      {/* Steps Progress */}
      {milestoneProgress && (
        <div className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-300">
                Steps
              </span>
            </div>
            <span className="text-xs font-semibold text-amber-400">
              {milestoneProgress.completed}/{milestoneProgress.total}
            </span>
          </div>
          <div className="w-full bg-amber-900/50 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                milestoneProgress.percentage === 100
                  ? 'bg-green-500'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600'
              }`}
              style={{ width: `${milestoneProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2 py-0.5 text-xs bg-gray-700 text-gray-300"
            >
              #{tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="rounded-full px-2 py-0.5 text-xs bg-gray-700 text-gray-300">
              +{project.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Budget Progress Bar */}
      {project.estimated_budget && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Budget Used</span>
            <span className="text-sm font-medium text-white">{budgetProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
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
