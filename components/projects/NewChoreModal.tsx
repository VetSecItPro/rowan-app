'use client';

import { useState } from 'react';
import { Smile, ChevronDown } from 'lucide-react';
import { CreateChoreInput } from '@/lib/services/chores-service';
import { Chore } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';

// 20 family-friendly universal emojis
const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👏', '🤝', '💪', '🌟', '✨', '🎈', '🌸', '🌈', '☀️', '🍕', '☕', '📅', '✅', '🏠'];

// Chore category configuration with colors and emojis
export const CHORE_CATEGORIES = {
  cleaning: { emoji: '🧹', label: 'Cleaning', color: 'bg-cyan-500', textColor: 'text-cyan-600', lightBg: 'bg-cyan-900/30' },
  laundry: { emoji: '👕', label: 'Laundry', color: 'bg-blue-500', textColor: 'text-blue-600', lightBg: 'bg-blue-900/30' },
  dishes: { emoji: '🍽️', label: 'Dishes', color: 'bg-teal-500', textColor: 'text-teal-600', lightBg: 'bg-teal-900/30' },
  cooking: { emoji: '🍳', label: 'Cooking', color: 'bg-orange-500', textColor: 'text-orange-600', lightBg: 'bg-orange-900/30' },
  yard_work: { emoji: '🌿', label: 'Yard Work', color: 'bg-green-500', textColor: 'text-green-600', lightBg: 'bg-green-900/30' },
  maintenance: { emoji: '🔧', label: 'Maintenance', color: 'bg-gray-500', textColor: 'text-gray-400', lightBg: 'bg-gray-900/30' },
  pet_care: { emoji: '🐾', label: 'Pet Care', color: 'bg-amber-500', textColor: 'text-amber-600', lightBg: 'bg-amber-900/30' },
  organizing: { emoji: '📦', label: 'Organizing', color: 'bg-purple-500', textColor: 'text-purple-600', lightBg: 'bg-purple-900/30' },
  trash: { emoji: '🗑️', label: 'Trash/Recycling', color: 'bg-emerald-500', textColor: 'text-emerald-600', lightBg: 'bg-emerald-900/30' },
  other: { emoji: '🏠', label: 'Other', color: 'bg-indigo-500', textColor: 'text-indigo-600', lightBg: 'bg-indigo-900/30' },
};

interface NewChoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chore: CreateChoreInput) => void;
  editChore?: Chore | null;
  spaceId: string;
  userId: string;
}

const buildInitialFormData = (editChore: Chore | null | undefined, spaceId: string, userId: string): CreateChoreInput => {
  if (editChore) {
    return {
      space_id: spaceId,
      title: editChore.title,
      description: editChore.description || '',
      frequency: editChore.frequency,
      status: editChore.status,
      due_date: editChore.due_date || '',
      created_by: userId,
    };
  }

  return {
    space_id: spaceId,
    title: '',
    description: '',
    frequency: 'weekly',
    status: 'pending',
    due_date: '',
    created_by: userId,
  };
};

function ChoreForm({
  isOpen,
  onClose,
  onSave,
  editChore,
  spaceId,
  userId
}: NewChoreModalProps) {
  const [formData, setFormData] = useState<CreateChoreInput>({
    ...buildInitialFormData(editChore, spaceId, userId),
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [category, setCategory] = useState<string>(editChore?.category || '');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [selectedDaysOfMonth, setSelectedDaysOfMonth] = useState<number[]>([]);
  const [dateError, setDateError] = useState<string>('');

  const handleEmojiClick = (emoji: string) => {
    setFormData({ ...formData, title: formData.title + emoji });
    setShowEmojiPicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate due date is not in the past
    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        setDateError('Due date is in the past');
        return;
      }
    }

    // Clear any previous errors
    setDateError('');

    // Clean up form data - remove empty strings for optional fields
    const cleanedData: CreateChoreInput = {
      ...formData,
      description: formData.description || undefined,
      due_date: formData.due_date || undefined,
    };

    onSave(cleanedData);
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
        disabled={!!dateError}
        className={`flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full transition-all shadow-lg font-medium ${
          dateError ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
        }`}
      >
        {editChore ? 'Update Chore' : 'Create Chore'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editChore ? 'Edit Chore' : 'New Chore'}
      maxWidth="2xl"
      headerGradient="bg-gradient-to-r from-amber-500 to-amber-600"
      footer={footerContent}
    >
      <form id="new-chore-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Chore Title *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.title}
                id="field-1"
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Clean the kitchen"
                className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
              />

              {/* Emoji Picker Button */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Add emoji"
                  className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-400" />
                </button>

                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 z-10 w-full sm:w-80 max-w-[calc(100vw-2rem)]">
                    <h4 className="text-base sm:text-sm font-medium text-gray-300 mb-3">Select an emoji</h4>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-1.5">
                      {EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-12 h-12 sm:w-10 sm:h-10 text-2xl flex items-center justify-center hover:bg-gray-700 rounded-lg transition-colors"
                          title="Click to add emoji"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="field-2" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Description
            </label>
            <textarea
              value={formData.description}
              id="field-2"
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this chore..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
            />
          </div>

          {/* Category & Frequency Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="relative z-50">
              <label htmlFor="field-3" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  id="field-3"
              onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white appearance-none relative z-50"
                  style={{ paddingRight: '2.5rem' }}
                >
                  <option value="">Select category...</option>
                  <option value="cleaning">🧹 Cleaning</option>
                  <option value="laundry">👕 Laundry</option>
                  <option value="dishes">🍽️ Dishes</option>
                  <option value="cooking">🍳 Cooking</option>
                  <option value="yard_work">🌿 Yard Work</option>
                  <option value="maintenance">🔧 Maintenance</option>
                  <option value="pet_care">🐾 Pet Care</option>
                  <option value="organizing">📦 Organizing</option>
                  <option value="trash">🗑️ Trash/Recycling</option>
                  <option value="other">🏠 Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>

            {/* Frequency */}
            <div className="relative z-50">
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Frequency
              </label>
              <div className="relative">
                <select
                  value={formData.frequency}
                  id="field-4"
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as CreateChoreInput['frequency'] })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white appearance-none relative z-50"
                  style={{ paddingRight: '2.5rem' }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="once">One-time</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>
          </div>

          {/* Day Selection for Weekly and Biweekly */}
          {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Days of Week {formData.frequency === 'biweekly' && '(Every Other Week)'}
              </label>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSelectedDaysOfWeek(prev =>
                        prev.includes(index)
                          ? prev.filter(d => d !== index)
                          : [...prev, index]
                      );
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDaysOfWeek.includes(index)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {formData.frequency === 'biweekly' && (
                <p className="mt-2 text-sm text-gray-400">
                  This chore will repeat every two weeks on the selected days.
                </p>
              )}
            </div>
          )}

          {/* Day Selection for Monthly */}
          {formData.frequency === 'monthly' && (
            <div>
              <label htmlFor="field-6" className="block text-sm font-medium text-gray-300 mb-3 cursor-pointer">
                Select Days of Month
              </label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelectedDaysOfMonth(prev =>
                        prev.includes(day)
                          ? prev.filter(d => d !== day)
                          : [...prev, day]
                      );
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDaysOfMonth.includes(day)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="relative z-50">
              <label htmlFor="field-7" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Status
              </label>
              <div className="relative">
                <select
                  value={formData.status}
                  id="field-7"
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CreateChoreInput['status'] })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white appearance-none relative z-50"
                  style={{ paddingRight: '2.5rem' }}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="field-8" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                id="field-8"
              onChange={(e) => {
                  setFormData({ ...formData, due_date: e.target.value });

                  // Validate on change
                  if (e.target.value) {
                    const dueDate = new Date(e.target.value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (dueDate < today) {
                      setDateError('Due date is in the past');
                    } else {
                      setDateError('');
                    }
                  } else {
                    setDateError('');
                  }
                }}
                className={`w-full px-4 py-3 bg-gray-800/80 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white ${
                  dateError ? 'border-red-500' : 'border-gray-700/50'
                }`}
              />
              {dateError && (
                <p className="mt-2 text-base md:text-sm text-red-400 flex items-center gap-1">
                  <span className="font-medium">⚠</span>
                  {dateError}
                </p>
              )}
            </div>
          </div>

      </form>
    </Modal>
  );
}

export function NewChoreModal(props: NewChoreModalProps) {
  const { editChore, isOpen, spaceId, userId } = props;
  const formKey = `${editChore?.id ?? 'new'}-${isOpen ? 'open' : 'closed'}-${spaceId}-${userId}`;
  return <ChoreForm key={formKey} {...props} />;
}
