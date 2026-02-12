'use client';

import { useState } from 'react';
import { Sunrise, Sun, Moon, Cookie, ShoppingCart, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
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

  const footerContent = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={isPlanning}
        className="px-4 sm:px-6 py-2.5 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        onClick={handlePlan}
        disabled={isPlanning}
        className="px-4 sm:px-6 py-2.5 bg-gradient-meals hover:opacity-90 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
      >
        {isPlanning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Planning...</span>
          </>
        ) : (
          <>
            <Calendar className="w-4 h-4" />
            <span>Plan</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Plan Meal"
      maxWidth="md"
      headerGradient="bg-gradient-meals"
      footer={footerContent}
    >
      <div className="space-y-5">
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
    </Modal>
  );
}
