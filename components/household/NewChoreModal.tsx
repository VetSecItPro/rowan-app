'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CreateChoreInput } from '@/lib/services/chores-service';
import { Chore } from '@/lib/types';

interface NewChoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chore: CreateChoreInput) => void;
  editChore?: Chore | null;
  spaceId: string;
  userId: string;
}

export function NewChoreModal({ isOpen, onClose, onSave, editChore, spaceId, userId }: NewChoreModalProps) {
  const [formData, setFormData] = useState<CreateChoreInput>({
    space_id: spaceId,
    title: '',
    description: '',
    frequency: 'weekly',
    status: 'pending',
    due_date: '',
    created_by: userId,
  });

  useEffect(() => {
    if (editChore) {
      setFormData({ space_id: spaceId, title: editChore.title, description: editChore.description || '', frequency: editChore.frequency, status: editChore.status, due_date: editChore.due_date || '', created_by: userId });
    } else {
      setFormData({ space_id: spaceId, title: '', description: '', frequency: 'weekly', status: 'pending', due_date: '', created_by: userId });
    }
  }, [editChore, spaceId, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-amber-500 to-amber-600 rounded-t-xl">
          <h2 className="text-2xl font-bold text-white">{editChore ? 'Edit Chore' : 'New Chore'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-all"><X className="w-5 h-5 text-white" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); onClose(); }} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative z-50">
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <select value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg relative z-50" style={{ position: 'relative', zIndex: 9999 }}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="once">Once</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border rounded-lg" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Cancel</button>
            <button type="submit" className="flex-1 px-6 py-2 shimmer-bg text-white rounded-lg">{editChore ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
