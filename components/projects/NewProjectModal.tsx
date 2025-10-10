'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Project } from '@/lib/types';
import type { CreateProjectInput } from '@/lib/services/projects-service';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateProjectInput) => Promise<void>;
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
    progress_percentage: undefined,
  });
  const [loading, setLoading] = useState(false);

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
        status: editProject.status as any,
        start_date: formatDateForInput(editProject.start_date),
        target_date: formatDateForInput(editProject.target_date),
        budget_amount: editProject.budget_amount || undefined,
        progress_percentage: editProject.progress_percentage || undefined,
      });
    } else {
      setFormData({
        space_id: spaceId,
        name: '',
        description: '',
        status: 'planning',
        start_date: '',
        target_date: '',
        budget_amount: undefined,
        progress_percentage: undefined,
      });
    }
  }, [editProject, spaceId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full overflow-hidden">
        <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {editProject ? 'Edit Project' : 'Create New Project'}
            </h2>
            <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full pl-1 pr-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.budget_amount || ''}
                onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Progress %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress_percentage || ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  setFormData({
                    ...formData,
                    progress_percentage: value,
                    status: value === 100 ? 'completed' : formData.status
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="0-100"
              />
            </div>
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl transition-all shadow-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editProject ? 'Save Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
