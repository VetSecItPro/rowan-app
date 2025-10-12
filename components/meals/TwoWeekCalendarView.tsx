'use client';

import { useMemo, memo, useState, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Sunrise, Sun, Moon, Cookie, CheckSquare, Square, Trash2, ShoppingBag } from 'lucide-react';
import { Meal } from '@/lib/services/meals-service';

interface TwoWeekCalendarViewProps {
  currentWeek: Date;
  meals: Meal[];
  onWeekChange: (newWeek: Date) => void;
  onMealClick: (meal: Meal) => void;
  onAddMeal: (date: Date, mealType?: string) => void;
  onBulkDelete?: (mealIds: string[]) => void;
  onBulkGenerateList?: (mealIds: string[]) => void;
}

const MEAL_TYPE_CONFIG = {
  breakfast: { icon: Sunrise, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700' },
  lunch: { icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700' },
  dinner: { icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-700' },
  snack: { icon: Cookie, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700' },
};

export const TwoWeekCalendarView = memo(function TwoWeekCalendarView({
  currentWeek,
  meals,
  onWeekChange,
  onMealClick,
  onAddMeal,
  onBulkDelete,
  onBulkGenerateList
}: TwoWeekCalendarViewProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMealIds, setSelectedMealIds] = useState<Set<string>>(new Set());
  // Calculate first week start and second week end
  const firstWeekStart = useMemo(() => startOfWeek(currentWeek), [currentWeek]);
  const secondWeekEnd = useMemo(() => endOfWeek(addWeeks(currentWeek, 1)), [currentWeek]);

  // Get all days for two weeks
  const twoWeekDays = useMemo(() => {
    return eachDayOfInterval({ start: firstWeekStart, end: secondWeekEnd });
  }, [firstWeekStart, secondWeekEnd]);

  // Group meals by date
  const mealsByDate = useMemo(() => {
    const grouped = new Map<string, Meal[]>();
    meals.forEach(meal => {
      const dateKey = format(new Date(meal.scheduled_date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(meal);
    });
    return grouped;
  }, [meals]);

  // Get meals for a specific date
  const getMealsForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dateMeals = mealsByDate.get(dateKey) || [];

    // Sort by meal type order
    const typeOrder = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
    return dateMeals.sort((a, b) => typeOrder[a.meal_type] - typeOrder[b.meal_type]);
  };

  const handlePreviousWeek = () => onWeekChange(subWeeks(currentWeek, 2));
  const handleNextWeek = () => onWeekChange(addWeeks(currentWeek, 2));
  const handleToday = () => onWeekChange(new Date());

  const isCurrentWeek = isSameDay(firstWeekStart, startOfWeek(new Date()));

  // Selection handlers
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    setSelectedMealIds(new Set());
  }, []);

  const toggleMealSelection = useCallback((mealId: string) => {
    setSelectedMealIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedMealIds.size > 0 && onBulkDelete) {
      onBulkDelete(Array.from(selectedMealIds));
      setSelectedMealIds(new Set());
      setSelectionMode(false);
    }
  }, [selectedMealIds, onBulkDelete]);

  const handleBulkGenerateList = useCallback(() => {
    if (selectedMealIds.size > 0 && onBulkGenerateList) {
      onBulkGenerateList(Array.from(selectedMealIds));
      setSelectedMealIds(new Set());
      setSelectionMode(false);
    }
  }, [selectedMealIds, onBulkGenerateList]);

  return (
    <div className="space-y-4">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousWeek}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Previous 2 weeks"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {format(firstWeekStart, 'MMM d')} - {format(secondWeekEnd, 'MMM d, yyyy')}
          </h3>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Next 2 weeks"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectionMode}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${
              selectionMode
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {selectionMode ? 'Cancel' : 'Select'}
          </button>

          {!isCurrentWeek && !selectionMode && (
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <CalendarIcon className="w-4 h-4" />
              Jump to Today
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectionMode && selectedMealIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 border border-orange-200 dark:border-orange-700 rounded-lg">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {selectedMealIds.size} meal{selectedMealIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkGenerateList}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <ShoppingBag className="w-4 h-4" />
              Generate List
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Two Week Grid - 14 columns */}
      <div className="grid grid-cols-7 gap-2 lg:gap-3">
        {twoWeekDays.map((day) => {
          const dayMeals = getMealsForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[250px] rounded-lg border-2 p-2 transition-all ${
                isToday
                  ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Day Header */}
              <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className={`text-xs font-medium ${
                  isToday ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg font-bold ${
                  isToday ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {format(day, 'd')}
                </div>
              </div>

              {/* Meals */}
              <div className="space-y-1.5">
                {dayMeals.length > 0 ? (
                  dayMeals.map((meal) => {
                    const config = MEAL_TYPE_CONFIG[meal.meal_type];
                    const Icon = config.icon;
                    const isSelected = selectedMealIds.has(meal.id);

                    return (
                      <button
                        key={meal.id}
                        onClick={() => selectionMode ? toggleMealSelection(meal.id) : onMealClick(meal)}
                        className={`w-full text-left p-1.5 rounded-lg border-l-4 ${config.bg} ${config.border} hover:shadow-md transition-all ${
                          isSelected ? 'ring-2 ring-orange-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          {selectionMode && (
                            <div className="flex-shrink-0 mt-0.5">
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-orange-600" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </div>
                          )}
                          <Icon className={`w-3.5 h-3.5 mt-0.5 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-xs truncate">
                              {meal.recipe?.name || meal.name || 'Untitled Meal'}
                            </p>
                            {meal.notes && (
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {meal.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <Plus className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-1" />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">No meals</p>
                    <button
                      onClick={() => onAddMeal(day)}
                      className="px-2 py-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[10px] rounded-lg transition-all shadow-sm"
                    >
                      Add Meal
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Add Button (when meals exist) */}
              {dayMeals.length > 0 && (
                <button
                  onClick={() => onAddMeal(day)}
                  className="w-full mt-1.5 py-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-[10px] text-gray-500 dark:text-gray-400 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
