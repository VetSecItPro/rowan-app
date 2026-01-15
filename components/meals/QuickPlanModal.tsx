'use client';

import { useState } from 'react';
import { X, Sunrise, Sun, Moon, Cookie, ShoppingCart, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

interface QuickPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlan: (date: string, mealType: string, createShoppingList: boolean) => Promise<void>;
  recipeName: string;
}

const mealTypeOptions = [
  { value: 'breakfast', label: 'Breakfast', icon: Sunrise, color: 'text-orange-500', bg: 'bg-orange-900/20' },
  { value: 'lunch', label: 'Lunch', icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-900/20' },
  { value: 'dinner', label: 'Dinner', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-900/20' },
  { value: 'snack', label: 'Snack', icon: Cookie, color: 'text-amber-500', bg: 'bg-amber-900/20' },
];

export function QuickPlanModal({ isOpen, onClose, onPlan, recipeName }: QuickPlanModalProps) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMealType, setSelectedMealType] = useState('dinner');
  const [createShoppingList, setCreateShoppingList] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);

  const handlePlan = async () => {
    setIsPlanning(true);
    try {
      await onPlan(selectedDate, selectedMealType, createShoppingList);
      onClose();
    } catch (error) {
      logger.error('Failed to plan meal:', error, { component: 'QuickPlanModal', action: 'component_action' });
    } finally {
      setIsPlanning(false);
    }
  };

  if (!isOpen) return null;

  const selectedOption = mealTypeOptions.find(opt => opt.value === selectedMealType) || mealTypeOptions[2];
  const Icon = selectedOption.icon;

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-800 sm:w-auto sm:rounded-xl sm:max-w-md sm:max-h-[90vh] overflow-hidden overscroll-contain shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Plan Meal</h2>
                <p className="text-orange-100 text-sm mt-0.5">Quick add to meal plan</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isPlanning}
              aria-label="Close modal"
              className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto space-y-5">
          {/* Recipe Name Display */}
          <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Recipe</p>
            <p className="font-semibold text-white">{recipeName}</p>
          </div>

          {/* Date Selection */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              When do you want this meal?
            </label>
            <input
              type="date"
              value={selectedDate}
              id="field-1"
              onChange={(e) =>  setSelectedDate(e.target.value)}
              disabled={isPlanning}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-white disabled:opacity-50"
            />
          </div>

          {/* Meal Type Selection */}
          <div>
            <label htmlFor="field-2" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Meal Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {mealTypeOptions.map((option) => {
                const OptionIcon = option.icon;
                const isSelected = selectedMealType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedMealType(option.value)}
                    disabled={isPlanning}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `border-orange-500 ${option.bg}`
                        : 'border-gray-700 hover:border-orange-700'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-2">
                      <OptionIcon className={`w-5 h-5 ${option.color}`} />
                      <span className="font-medium text-white">
                        {option.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shopping List Option */}
          <div className="flex items-center gap-3 p-4 bg-emerald-900/20 border border-emerald-800 rounded-lg">
            <input
              type="checkbox"
              id="quickCreateShoppingList"
              checked={createShoppingList}
              onChange={(e) => setCreateShoppingList(e.target.checked)}
              disabled={isPlanning}
              className="w-5 h-5 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-600 ring-offset-gray-800 bg-gray-700 border-gray-600 disabled:opacity-50"
            />
            <label
              htmlFor="quickCreateShoppingList"
              className="flex items-center gap-2 text-sm text-white cursor-pointer flex-1"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Add ingredients to Shopping List</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPlanning}
            className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePlan}
            disabled={isPlanning}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPlanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Planning...
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                Plan Meal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
