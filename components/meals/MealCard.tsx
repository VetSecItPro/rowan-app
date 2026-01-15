'use client';

import { UtensilsCrossed, Clock, MoreVertical, CheckSquare } from 'lucide-react';
import { Meal } from '@/lib/services/meals-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { parseDateString } from '@/lib/utils/date';
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

  // Check if meal is in the past
  const mealDate = parseDateString(meal.scheduled_date);
  const now = new Date();
  const isPastMeal = mealDate < now;

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200 ${isPastMeal ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 ${typeColor} rounded-lg flex items-center justify-center flex-shrink-0 ${isPastMeal ? 'opacity-70' : ''}`}>
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-semibold text-white truncate ${isPastMeal ? 'line-through' : ''}`}>
                  {meal.name || meal.recipe?.name || 'Untitled Meal'}
                </h3>
                {isPastMeal && (
                  <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-400 capitalize">
                {meal.meal_type} • {formatTimestamp(meal.scheduled_date, 'MMM d, yyyy')}
                {isPastMeal && <span className="ml-2 text-green-400 text-xs font-medium">• Completed</span>}
              </p>
              {meal.assignee && (
                <div className="flex items-center gap-1.5 mt-1 px-2 py-0.5 bg-orange-900/30 rounded-full w-fit">
                  {meal.assignee.avatar_url ? (
                    <img src={meal.assignee.avatar_url} alt={meal.assignee.name} className="w-3 h-3 rounded-full object-cover" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gradient-meals flex items-center justify-center">
                      <span className="text-[6px] font-semibold text-white">
                        {meal.assignee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-[10px] text-orange-300 font-medium">{meal.assignee.name}</span>
                </div>
              )}
            </div>
          </div>
          {meal.recipe?.description && (
            <p className="text-sm text-gray-400 mb-2 break-words line-clamp-2">{meal.recipe.description}</p>
          )}
          {meal.notes && (
            <p className="text-sm text-gray-500 italic break-words line-clamp-2">{meal.notes}</p>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} aria-label="Meal options menu" className="p-2 text-gray-400 hover:text-gray-300 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-32 dropdown-mobile bg-gray-800 border border-gray-700 rounded-2xl shadow-xl z-20 overflow-hidden">
                <button onClick={() => { onEdit(meal); setShowMenu(false); }} className="btn-touch w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors">Edit</button>
                <button onClick={() => { onDelete(meal.id); setShowMenu(false); }} className="btn-touch w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-900/20 transition-colors">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
