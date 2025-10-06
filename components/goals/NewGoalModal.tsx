'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CreateGoalInput, Goal } from '@/lib/services/goals-service';

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: CreateGoalInput) => void;
  editGoal?: Goal | null;
  spaceId: string;
}

export function NewGoalModal({ isOpen, onClose, onSave, editGoal, spaceId }: NewGoalModalProps) {
  const [formData, setFormData] = useState<CreateGoalInput>({
    space_id: spaceId,
    title: '',
    description: '',
    category: '',
    status: 'active',
    progress: 0,
    target_date: '',
  });

  useEffect(() => {
    if (editGoal) {
      setFormData({
        space_id: spaceId,
        title: editGoal.title,
        description: editGoal.description || '',
        category: editGoal.category || '',
        status: editGoal.status,
        progress: editGoal.progress,
        target_date: editGoal.target_date || '',
      });
    } else {
      setFormData({
        space_id: spaceId,
        title: '',
        description: '',
        category: '',
        status: 'active',
        progress: 0,
        target_date: '',
      });
    }
  }, [editGoal, spaceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editGoal ? 'Edit Goal' : 'New Goal'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Progress (%)</label>
              <input type="number" min="0" max="100" value={formData.progress} onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Target Date</label>
            <input type="date" value={formData.target_date} onChange={(e) => setFormData({ ...formData, target_date: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancel</button>
            <button type="submit" className="px-6 py-2 shimmer-bg text-white rounded-lg">{editGoal ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
