'use client';

import { useMemo, memo, useState, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Sunrise, Sun, Moon, Cookie, CheckSquare, Square, Trash2, ShoppingBag } from 'lucide-react';
import { Meal } from '@/lib/services/meals-service';
import { parseDateString } from '@/lib/utils/date';

interface TwoWeekCalendarViewProps {
  currentWeek: Date;
  meals: Meal[];
  onWeekChange: (newWeek: Date) => void;
  onMealClick: (meal: Meal) => void;
  onAddMeal: (date: Date, mealType?: string) => void;
  onBulkDelete?: (mealIds: string[]) => void;
  onBulkGenerateList?: (mealIds: string[]) => void;
  onGenerateList?: () => void;
}

const MEAL_TYPE_CONFIG = {
  breakfast: { icon: Sunrise, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', label: 'Breakfast' },
  lunch: { icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', label: 'Lunch' },
  dinner: { icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-700', label: 'Dinner' },
  snack: { icon: Cookie, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', label: 'Snack' },
};

export const TwoWeekCalendarView = memo(function TwoWeekCalendarView({
  currentWeek,
  meals,
  onWeekChange,
  onMealClick,
  onAddMeal,
  onBulkDelete,
  onBulkGenerateList,
  onGenerateList
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

  // Split into two weeks for mobile display
  const firstWeekDays = useMemo(() => twoWeekDays.slice(0, 7), [twoWeekDays]);
  const secondWeekDays = useMemo(() => twoWeekDays.slice(7, 14), [twoWeekDays]);

  // Group meals by date
  const mealsByDate = useMemo(() => {
    const grouped = new Map<string, Meal[]>();
    meals.forEach(meal => {
      const dateKey = meal.scheduled_date;
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

  // Render a single day card for mobile
  const renderMobileDayCard = (day: Date) => {
    const dayMeals = getMealsForDate(day);
    const isToday = isSameDay(day, new Date());

    return (
      <div
        key={day.toISOString()}
        id={`day-card-2w-${format(day, 'yyyy-MM-dd')}`}
        className={`rounded-xl border-2 p-4 transition-all ${
          isToday
            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
        }`}
      >
        {/* Day Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`text-center ${isToday ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{format(day, 'EEEE')}</div>
              <div className="text-2xl font-bold">{format(day, 'd')}</div>
            </div>
            {isToday && (
              <span className="px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">Today</span>
            )}
          </div>
          <button
            onClick={() => onAddMeal(day)}
            className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Meals */}
        <div className="space-y-2">
          {dayMeals.length > 0 ? (
            dayMeals.map((meal) => {
              const config = MEAL_TYPE_CONFIG[meal.meal_type];
              const Icon = config.icon;
              const isSelected = selectedMealIds.has(meal.id);
              const mealDate = parseDateString(meal.scheduled_date);
              const now = new Date();
              const isPastMeal = mealDate < now;

              return (
                <button
                  key={meal.id}
                  onClick={() => selectionMode ? toggleMealSelection(meal.id) : onMealClick(meal)}
                  className={`w-full text-left p-3 rounded-lg border-l-4 ${config.bg} ${config.border} hover:shadow-md transition-all ${
                    isSelected ? 'ring-2 ring-orange-500' : ''
                  } ${isPastMeal ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {selectionMode && (
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    )}
                    <Icon className={`w-5 h-5 flex-shrink-0 ${config.color} ${isPastMeal ? 'opacity-70' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                        {isPastMeal && (
                          <CheckSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <p className={`font-medium text-gray-900 dark:text-white text-base ${isPastMeal ? 'line-through' : ''}`}>
                        {meal.recipe?.name || meal.name || 'Untitled Meal'}
                      </p>
                      {meal.notes && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {meal.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-4 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">No meals planned</p>
              <button
                onClick={() => onAddMeal(day)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm font-medium rounded-lg transition-all"
              >
                + Add Meal
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Week Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <button
            onClick={handlePreviousWeek}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Previous 2 weeks"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
            {format(firstWeekStart, 'MMM d')} - {format(secondWeekEnd, 'MMM d, yyyy')}
          </h3>
          <button
            onClick={handleNextWeek}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Next 2 weeks"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onGenerateList && !selectionMode && (
            <button
              onClick={onGenerateList}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
              title="Generate shopping list from meals"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Generate Shopping List</span>
              <span className="sm:hidden">Generate</span>
            </button>
          )}

          <button
            onClick={toggleSelectionMode}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium ${
              selectionMode
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-sm'
            }`}
            title={selectionMode ? 'Cancel selection' : 'Select meals for bulk delete'}
          >
            {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span className="hidden sm:inline">{selectionMode ? 'Cancel' : 'Select for Delete'}</span>
            <span className="sm:hidden">{selectionMode ? 'Cancel' : 'Select'}</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectionMode && selectedMealIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-900/40 border border-red-300 dark:border-red-700 rounded-lg">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {selectedMealIds.size} meal{selectedMealIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Mobile: Two Week Day Grids + Vertical Cards */}
      <div className="sm:hidden space-y-6">
        {/* Week 1 */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1 uppercase tracking-wide">
            Week 1: {format(firstWeekStart, 'MMM d')} - {format(endOfWeek(firstWeekStart), 'MMM d')}
          </h4>
          {/* Week 1 Day Grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {firstWeekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              const dayMeals = getMealsForDate(day);
              const hasMeals = dayMeals.length > 0;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    const el = document.getElementById(`day-card-2w-${format(day, 'yyyy-MM-dd')}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`py-2 px-1 rounded-lg text-center transition-all min-h-[56px] ${
                    isToday
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="text-[10px] font-medium uppercase">{format(day, 'EEE')}</div>
                  <div className="text-base font-bold">{format(day, 'd')}</div>
                  {hasMeals && (
                    <div className={`mt-0.5 w-1.5 h-1.5 rounded-full mx-auto ${isToday ? 'bg-white' : 'bg-orange-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="space-y-3">
            {firstWeekDays.map(day => renderMobileDayCard(day))}
          </div>
        </div>

        {/* Week 2 */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-1 uppercase tracking-wide">
            Week 2: {format(addWeeks(firstWeekStart, 1), 'MMM d')} - {format(secondWeekEnd, 'MMM d')}
          </h4>
          {/* Week 2 Day Grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {secondWeekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              const dayMeals = getMealsForDate(day);
              const hasMeals = dayMeals.length > 0;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    const el = document.getElementById(`day-card-2w-${format(day, 'yyyy-MM-dd')}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`py-2 px-1 rounded-lg text-center transition-all min-h-[56px] ${
                    isToday
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="text-[10px] font-medium uppercase">{format(day, 'EEE')}</div>
                  <div className="text-base font-bold">{format(day, 'd')}</div>
                  {hasMeals && (
                    <div className={`mt-0.5 w-1.5 h-1.5 rounded-full mx-auto ${isToday ? 'bg-white' : 'bg-orange-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="space-y-3">
            {secondWeekDays.map(day => renderMobileDayCard(day))}
          </div>
        </div>
      </div>

      {/* Desktop: Two Week Grid - Two rows of 7 columns */}
      <div className="hidden sm:block space-y-4">
        {/* Week 1 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Week 1
          </h4>
          <div className="grid grid-cols-7 gap-2 lg:gap-3">
            {firstWeekDays.map((day) => {
              const dayMeals = getMealsForDate(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[200px] rounded-lg border-2 p-2 transition-all ${
                    isToday
                      ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
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
                        const mealDate = parseDateString(meal.scheduled_date);
                        const now = new Date();
                        const isPastMeal = mealDate < now;

                        return (
                          <button
                            key={meal.id}
                            onClick={() => selectionMode ? toggleMealSelection(meal.id) : onMealClick(meal)}
                            className={`w-full text-left p-1.5 rounded-lg border-l-4 ${config.bg} ${config.border} hover:shadow-md transition-all ${
                              isSelected ? 'ring-2 ring-orange-500' : ''
                            } ${isPastMeal ? 'opacity-60' : ''}`}
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
                              <Icon className={`w-3.5 h-3.5 mt-0.5 ${config.color} ${isPastMeal ? 'opacity-70' : ''}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-gray-900 dark:text-white text-xs truncate ${isPastMeal ? 'line-through' : ''}`}>
                                  {meal.recipe?.name || meal.name || 'Untitled'}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4">
                        <button
                          onClick={() => onAddMeal(day)}
                          className="px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-[10px] rounded-lg transition-all"
                        >
                          + Add Meal
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Add */}
                  {dayMeals.length > 0 && (
                    <button
                      onClick={() => onAddMeal(day)}
                      className="w-full mt-1.5 py-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-[10px] text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                    >
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Week 2 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Week 2
          </h4>
          <div className="grid grid-cols-7 gap-2 lg:gap-3">
            {secondWeekDays.map((day) => {
              const dayMeals = getMealsForDate(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[200px] rounded-lg border-2 p-2 transition-all ${
                    isToday
                      ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
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
                        const mealDate = parseDateString(meal.scheduled_date);
                        const now = new Date();
                        const isPastMeal = mealDate < now;

                        return (
                          <button
                            key={meal.id}
                            onClick={() => selectionMode ? toggleMealSelection(meal.id) : onMealClick(meal)}
                            className={`w-full text-left p-1.5 rounded-lg border-l-4 ${config.bg} ${config.border} hover:shadow-md transition-all ${
                              isSelected ? 'ring-2 ring-orange-500' : ''
                            } ${isPastMeal ? 'opacity-60' : ''}`}
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
                              <Icon className={`w-3.5 h-3.5 mt-0.5 ${config.color} ${isPastMeal ? 'opacity-70' : ''}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-gray-900 dark:text-white text-xs truncate ${isPastMeal ? 'line-through' : ''}`}>
                                  {meal.recipe?.name || meal.name || 'Untitled'}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4">
                        <button
                          onClick={() => onAddMeal(day)}
                          className="px-2 py-1 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-[10px] rounded-lg transition-all"
                        >
                          + Add Meal
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Add */}
                  {dayMeals.length > 0 && (
                    <button
                      onClick={() => onAddMeal(day)}
                      className="w-full mt-1.5 py-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-[10px] text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                    >
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
