'use client';

import { useState, useEffect } from 'react';
import { CreateChoreInput } from '@/lib/services/chores-service';
import { Chore } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';

interface NewChoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chore: CreateChoreInput) => void;
  editChore?: Chore | null;
  spaceId: string;
  userId: string;
}

export function NewChoreModal({ isOpen, onClose, onSave, editChore, spaceId, userId }: NewChoreModalProps) {
  type ChoreFrequency = CreateChoreInput['frequency'];
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({ space_id: spaceId, title: editChore.title, description: editChore.description || '', frequency: editChore.frequency, status: editChore.status, due_date: editChore.due_date || '', created_by: userId });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({ space_id: spaceId, title: '', description: '', frequency: 'weekly', status: 'pending', due_date: '', created_by: userId });
    }
  }, [editChore, spaceId, userId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const footerContent = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="new-chore-form"
        className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full hover:from-amber-600 hover:to-amber-700 transition-colors font-medium"
      >
        {editChore ? 'Save' : 'Create'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editChore ? 'Edit Chore' : 'New Chore'}
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-amber-500 to-amber-600"
      footer={footerContent}
    >
      <form id="new-chore-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as ChoreFrequency })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="once">Once</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
