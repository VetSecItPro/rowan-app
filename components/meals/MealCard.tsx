'use client';

import { UtensilsCrossed, Clock, MoreVertical } from 'lucide-react';
import { Meal } from '@/lib/services/meals-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState } from 'react';

interface MealCardProps {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (mealId: string) => void;
}

const mealTypeColors = {
  breakfast: 'bg-yellow-500',
  lunch: 'bg-green-500',
  dinner: 'bg-blue-500',
  snack: 'bg-purple-500',
};

export function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const typeColor = mealTypeColors[meal.meal_type] || 'bg-gray-500';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 ${typeColor} rounded-lg flex items-center justify-center`}>
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {meal.recipe?.name || 'Custom Meal'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {meal.meal_type} • {formatTimestamp(meal.scheduled_date, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          {meal.recipe?.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{meal.recipe.description}</p>
          )}
          {meal.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-500 italic">{meal.notes}</p>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                <button onClick={() => { onEdit(meal); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg">Edit</button>
                <button onClick={() => { onDelete(meal.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
