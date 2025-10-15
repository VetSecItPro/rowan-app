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
    <div onClick={onClose} className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-md sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold">
              {editProject ? 'Edit Project' : 'Create New Project'}
            </h2>
            <button onClick={onClose} aria-label="Close modal" className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-95">
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-4">
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
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
            <label htmlFor="field-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="field-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full pl-1 pr-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
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
              <label htmlFor="field-5" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-6" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 cursor-pointer">
                Budget Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.budget_amount || ''}
                onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
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
