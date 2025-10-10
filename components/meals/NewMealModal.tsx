'use client';

import { useState, useEffect } from 'react';
import { X, Sunrise, Sun, Moon, Cookie } from 'lucide-react';
import { CreateMealInput, Meal } from '@/lib/services/meals-service';

interface NewMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: CreateMealInput) => void;
  editMeal?: Meal | null;
  spaceId: string;
}

export function NewMealModal({ isOpen, onClose, onSave, editMeal, spaceId }: NewMealModalProps) {
  const [formData, setFormData] = useState<CreateMealInput>({
    space_id: spaceId,
    meal_type: 'dinner',
    scheduled_date: '',
    notes: '',
  });
  const [isMealTypeOpen, setIsMealTypeOpen] = useState(false);

  const mealTypeOptions = [
    { value: 'breakfast', label: 'Breakfast', icon: Sunrise, color: 'text-orange-500' },
    { value: 'lunch', label: 'Lunch', icon: Sun, color: 'text-yellow-500' },
    { value: 'dinner', label: 'Dinner', icon: Moon, color: 'text-indigo-500' },
    { value: 'snack', label: 'Snack', icon: Cookie, color: 'text-amber-500' },
  ];

  useEffect(() => {
    if (editMeal) {
      setFormData({
        space_id: spaceId,
        recipe_id: editMeal.recipe_id,
        meal_type: editMeal.meal_type,
        scheduled_date: editMeal.scheduled_date,
        notes: editMeal.notes || '',
      });
    } else {
      setFormData({
        space_id: spaceId,
        meal_type: 'dinner',
        scheduled_date: '',
        notes: '',
      });
    }
  }, [editMeal, spaceId]);

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editMeal ? 'Edit Meal' : 'New Meal'}</h2>
          <button onClick={onClose} aria-label="Close modal" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-2">Meal Type *</label>
            <button
              type="button"
              onClick={() => setIsMealTypeOpen(!isMealTypeOpen)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {(() => {
                  const selected = mealTypeOptions.find(opt => opt.value === formData.meal_type);
                  const Icon = selected?.icon || Moon;
                  return (
                    <>
                      <Icon className={`w-4 h-4 ${selected?.color || 'text-gray-500'}`} />
                      <span>{selected?.label || 'Select meal type'}</span>
                    </>
                  );
                })()}
              </div>
              <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isMealTypeOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                {mealTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, meal_type: option.value as any });
                        setIsMealTypeOpen(false);
                      }}
                      className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <Icon className={`w-4 h-4 ${option.color}`} />
                      <span className="text-gray-900 dark:text-white">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date *</label>
            <input type="date" required value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white resize-none" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg">Cancel</button>
            <button type="submit" className="px-6 py-2 shimmer-bg text-white rounded-lg">{editMeal ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
