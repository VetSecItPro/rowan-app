'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle, GripVertical, Target } from 'lucide-react';
import type { Project } from '@/lib/services/project-tracking-service';
import type { CreateProjectInput } from '@/lib/services/projects-service';
import { projectMilestonesService, type ProjectMilestone } from '@/lib/services/project-milestones-service';
import { logger } from '@/lib/logger';

interface MilestoneItem {
  id?: string;
  title: string;
  is_completed: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateProjectInput) => Promise<Project | null>;
  editProject?: Project | null;
  spaceId: string;
}

export function NewProjectModal({ isOpen, onClose, onSave, editProject, spaceId }: NewProjectModalProps) {
  const [formData, setFormData] = useState<CreateProjectInput>({
    space_id: spaceId,
    name: '',
    description: '',
    status: 'planning',
    start_date: '',
    target_date: '',
    budget_amount: undefined,
  });
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMilestones, setLoadingMilestones] = useState(false);

  // Helper function to format date for HTML input (yyyy-MM-dd)
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    // Extract just the date portion (yyyy-MM-dd) from timestamp
    return dateString.split('T')[0];
  };

  useEffect(() => {
    if (editProject) {
      setFormData({
        space_id: spaceId,
        name: editProject.name,
        description: editProject.description || '',
        status: editProject.status as 'planning' | 'in_progress' | 'completed' | 'on_hold',
        start_date: formatDateForInput(editProject.start_date),
        target_date: formatDateForInput(editProject.estimated_completion_date),
        budget_amount: editProject.estimated_budget || undefined,
      });

      // Load existing milestones
      loadMilestones(editProject.id);
    } else {
      setFormData({
        space_id: spaceId,
        name: '',
        description: '',
        status: 'planning',
        start_date: '',
        target_date: '',
        budget_amount: undefined,
      });
      setMilestones([]);
    }
  }, [editProject, spaceId, isOpen]);

  const loadMilestones = async (projectId: string) => {
    try {
      setLoadingMilestones(true);
      const data = await projectMilestonesService.getMilestones(projectId);
      setMilestones(data.map(m => ({
        id: m.id,
        title: m.title,
        is_completed: m.is_completed,
      })));
    } catch (error) {
      logger.error('Failed to load milestones:', error, { component: 'NewProjectModal', action: 'component_action' });
    } finally {
      setLoadingMilestones(false);
    }
  };

  const handleAddMilestone = () => {
    if (!newMilestoneTitle.trim()) return;

    setMilestones([
      ...milestones,
      {
        title: newMilestoneTitle.trim(),
        is_completed: false,
        isNew: true,
      },
    ]);
    setNewMilestoneTitle('');
  };

  const handleToggleMilestone = async (index: number) => {
    const milestone = milestones[index];
    const updated = [...milestones];
    updated[index] = { ...milestone, is_completed: !milestone.is_completed };
    setMilestones(updated);

    // If this is an existing milestone, update it in the database immediately
    if (milestone.id && !milestone.isNew) {
      try {
        await projectMilestonesService.toggleMilestone(milestone.id);
      } catch (error) {
        logger.error('Failed to toggle milestone:', error, { component: 'NewProjectModal', action: 'component_action' });
        // Revert on error
        updated[index] = milestone;
        setMilestones(updated);
      }
    }
  };

  const handleDeleteMilestone = async (index: number) => {
    const milestone = milestones[index];

    if (milestone.id && !milestone.isNew) {
      // Mark for deletion (will be deleted on save)
      const updated = [...milestones];
      updated[index] = { ...milestone, isDeleted: true };
      setMilestones(updated);
    } else {
      // Just remove from list if it's new
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const savedProject = await onSave(formData);

      // Get the project ID (either from edit or newly created)
      const projectId = editProject?.id || savedProject?.id;

      if (projectId) {
        // Delete marked milestones (only for existing milestones)
        const toDelete = milestones.filter(m => m.isDeleted && m.id);
        for (const m of toDelete) {
          await projectMilestonesService.deleteMilestone(m.id!);
        }

        // Create new milestones
        const toCreate = milestones.filter(m => m.isNew && !m.isDeleted);
        if (toCreate.length > 0) {
          await projectMilestonesService.createManyMilestones(
            toCreate.map((m, index) => ({
              project_id: projectId,
              space_id: spaceId,
              title: m.title,
              sort_order: index,
            }))
          );
        }
      }

      onClose();
    } catch (error) {
      logger.error('Failed to save project:', error, { component: 'NewProjectModal', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate milestone progress
  const activeMilestones = milestones.filter(m => !m.isDeleted);
  const completedCount = activeMilestones.filter(m => m.is_completed).length;
  const progressPercentage = activeMilestones.length > 0
    ? Math.round((completedCount / activeMilestones.length) * 100)
    : 0;

  if (!isOpen) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-lg sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold">
              {editProject ? 'Edit Project' : 'Create New Project'}
            </h2>
            <button onClick={onClose} aria-label="Close modal" className="p-2 flex items-center justify-center hover:bg-white/20 rounded-full transition-all">
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="relative z-50">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'planning' | 'in_progress' | 'completed' | 'on_hold' })}
              className="w-full pl-1 pr-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white relative z-50"
              style={{ position: 'relative', zIndex: 9999 }}
            >
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                Target Date
              </label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              Budget Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.budget_amount || ''}
              onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="$0.00"
            />
          </div>

          {/* Steps Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Steps
                </h3>
              </div>
              {activeMilestones.length > 0 && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {completedCount}/{activeMilestones.length} completed ({progressPercentage}%)
                </span>
              )}
            </div>

            {/* Progress bar */}
            {activeMilestones.length > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            )}

            {/* Milestones list */}
            {loadingMilestones ? (
              <div className="animate-pulse space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {activeMilestones.map((milestone, index) => {
                  const actualIndex = milestones.findIndex(m => m === milestone);
                  return (
                    <div
                      key={milestone.id || index}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        milestone.is_completed
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleMilestone(actualIndex)}
                        className="flex-shrink-0"
                      >
                        {milestone.is_completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 hover:text-amber-500 transition-colors" />
                        )}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          milestone.is_completed
                            ? 'text-gray-500 dark:text-gray-400 line-through'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {milestone.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMilestone(actualIndex)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new milestone */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMilestone();
                  }
                }}
                placeholder="Add a step..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={handleAddMilestone}
                disabled={!newMilestoneTitle.trim()}
                className="p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {activeMilestones.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Break your project into steps to track progress
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl transition-all shadow-lg shadow-amber-500/25 font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : editProject ? 'Save Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
