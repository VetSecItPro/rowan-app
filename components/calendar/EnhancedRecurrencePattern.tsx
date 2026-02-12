'use client';

import { ChevronDown } from 'lucide-react';

/**
 * Enhanced Recurrence Pattern Component
 *
 * Provides advanced recurring event pattern configuration while maintaining
 * backward compatibility with the existing simple pattern format.
 */

export interface EnhancedRecurrencePattern {
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every X days/weeks/months/years
  days_of_week?: number[]; // 0-6, Sunday=0
  day_of_month?: number; // 1-31
  week_of_month?: number[]; // [1,3] = 1st and 3rd week
  month?: number; // 1-12
  end_date?: string; // ISO date string
  end_count?: number; // End after X occurrences
  exceptions?: string[]; // ISO date strings to skip
}

interface EnhancedRecurrencePatternProps {
  value?: EnhancedRecurrencePattern | null;
  onChange: (pattern: EnhancedRecurrencePattern | null) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  startDate?: string; // The event start date for context
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type EndType = 'never' | 'date' | 'count';

const DEFAULT_PATTERN: EnhancedRecurrencePattern = {
  pattern: 'weekly',
  interval: 1,
  days_of_week: []
};

export function EnhancedRecurrencePattern({
  value,
  onChange,
  enabled,
  onEnabledChange
}: EnhancedRecurrencePatternProps) {
  const pattern = value ?? DEFAULT_PATTERN;
  const endType: EndType = pattern.end_date ? 'date' : pattern.end_count ? 'count' : 'never';
  const endDate = pattern.end_date ?? '';
  const endCount = pattern.end_count ?? 10;

  const updatePattern = (updates: Partial<EnhancedRecurrencePattern>) => {
    if (!enabled) return;
    onChange({ ...pattern, ...updates });
  };

  const handleEnabledToggle = (checked: boolean) => {
    onEnabledChange(checked);
    if (!checked) {
      onChange(null);
      return;
    }

    if (!value) {
      onChange({ ...DEFAULT_PATTERN });
    }
  };

  const handleEndTypeChange = (nextType: EndType) => {
    if (!enabled) return;

    if (nextType === 'date') {
      const nextDate = endDate || new Date().toISOString().split('T')[0];
      onChange({ ...pattern, end_date: nextDate, end_count: undefined });
      return;
    }

    if (nextType === 'count') {
      const nextCount = endCount || 10;
      onChange({ ...pattern, end_date: undefined, end_count: nextCount });
      return;
    }

    onChange({ ...pattern, end_date: undefined, end_count: undefined });
  };

  const toggleDayOfWeek = (day: number) => {
    const current = pattern.days_of_week || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();

    updatePattern({ days_of_week: updated });
  };

  const toggleWeekOfMonth = (week: number) => {
    const current = pattern.week_of_month || [];
    const updated = current.includes(week)
      ? current.filter(w => w !== week)
      : [...current, week].sort();

    updatePattern({ week_of_month: updated });
  };

  if (!enabled) {
    return (
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleEnabledToggle(e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded"
          />
          <span className="text-sm font-medium text-gray-300">
            Recurring event
          </span>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enable/Disable Checkbox */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleEnabledToggle(e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded"
          />
          <span className="text-sm font-medium text-gray-300">
            Recurring event
          </span>
        </label>
      </div>

      {/* Recurrence Configuration */}
      <div className="space-y-4 p-4 bg-purple-900/20 rounded-xl border border-purple-700">

        {/* Pattern Type and Interval */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Repeat every
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="99"
                value={pattern.interval}
                onChange={(e) => updatePattern({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-20 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              />
              <div className="relative flex-1">
                <select
                  value={pattern.pattern}
                  onChange={(e) => updatePattern({ pattern: e.target.value as EnhancedRecurrencePattern['pattern'] })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white appearance-none pr-8"
                >
                  <option value="daily">day(s)</option>
                  <option value="weekly">week(s)</option>
                  <option value="monthly">month(s)</option>
                  <option value="yearly">year(s)</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Options */}
        {pattern.pattern === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Repeat on
            </label>
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS_SHORT.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDayOfWeek(index)}
                  className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pattern.days_of_week?.includes(index)
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Options */}
        {pattern.pattern === 'monthly' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Monthly repeat type
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="monthlyType"
                    checked={!pattern.week_of_month}
                    onChange={() => updatePattern({ week_of_month: undefined })}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">
                    On day of month
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="monthlyType"
                    checked={!!pattern.week_of_month}
                    onChange={() => updatePattern({ week_of_month: [1], days_of_week: [1] })}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">
                    On specific weeks
                  </span>
                </label>
              </div>
            </div>

            {!pattern.week_of_month ? (
              /* Day of Month */
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Day of month
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="31"
                  value={pattern.day_of_month || 1}
                  onChange={(e) => updatePattern({ day_of_month: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })}
                  className="w-20 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                />
              </div>
            ) : (
              /* Week of Month + Day of Week */
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Week of month
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((week) => (
                      <button
                        key={week}
                        type="button"
                        onClick={() => toggleWeekOfMonth(week)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pattern.week_of_month?.includes(week)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                        }`}
                      >
                        {week === 1 ? '1st' : week === 2 ? '2nd' : week === 3 ? '3rd' : '4th'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Day of week
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {WEEKDAYS_SHORT.map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleDayOfWeek(index)}
                        className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                          pattern.days_of_week?.includes(index)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Yearly Options */}
        {pattern.pattern === 'yearly' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Month
              </label>
              <div className="relative">
                <select
                  value={pattern.month || 1}
                  onChange={(e) => updatePattern({ month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white appearance-none pr-8"
                >
                  {MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Day of month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={pattern.day_of_month || 1}
                onChange={(e) => updatePattern({ day_of_month: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })}
                className="w-20 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              />
            </div>
          </div>
        )}

        {/* End Conditions */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            End recurrence
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="endType"
                value="never"
                checked={endType === 'never'}
                onChange={(e) => handleEndTypeChange(e.target.value as EndType)}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">Never</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="endType"
                value="date"
                checked={endType === 'date'}
                onChange={(e) => handleEndTypeChange(e.target.value as EndType)}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">On date</span>
              {endType === 'date' && (
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => updatePattern({ end_date: e.target.value, end_count: undefined })}
                  className="ml-2 px-3 py-1 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                />
              )}
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="endType"
                value="count"
                checked={endType === 'count'}
                onChange={(e) => handleEndTypeChange(e.target.value as EndType)}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-300">After</span>
              {endType === 'count' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="999"
                    value={endCount}
                    onChange={(e) => updatePattern({ end_count: Math.max(1, parseInt(e.target.value, 10) || 1), end_date: undefined })}
                    className="w-20 px-3 py-1 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white text-sm"
                  />
                  <span className="text-sm text-gray-300">occurrences</span>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Pattern Summary */}
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400">
            <strong>Summary:</strong> {getPatternSummary(pattern, endType, endDate, endCount)}
          </p>
        </div>
      </div>
    </div>
  );
}

function getPatternSummary(
  pattern: EnhancedRecurrencePattern,
  endType: string,
  endDate: string,
  endCount: number
): string {
  let summary = '';

  // Frequency part
  if (pattern.interval === 1) {
    summary = `Every ${pattern.pattern}`;
  } else {
    summary = `Every ${pattern.interval} ${pattern.pattern}s`;
  }

  // Specifics
  switch (pattern.pattern) {
    case 'weekly':
      if (pattern.days_of_week && pattern.days_of_week.length > 0) {
        const dayNames = pattern.days_of_week.map(d => WEEKDAYS_SHORT[d]).join(', ');
        summary += ` on ${dayNames}`;
      }
      break;

    case 'monthly':
      if (pattern.week_of_month && pattern.days_of_week) {
        const weeks = pattern.week_of_month.map(w =>
          w === 1 ? '1st' : w === 2 ? '2nd' : w === 3 ? '3rd' : '4th'
        ).join(', ');
        const days = pattern.days_of_week.map(d => WEEKDAYS[d]).join(', ');
        summary += ` on the ${weeks} ${days}`;
      } else if (pattern.day_of_month) {
        summary += ` on day ${pattern.day_of_month}`;
      }
      break;

    case 'yearly':
      if (pattern.month && pattern.day_of_month) {
        summary += ` on ${MONTHS[pattern.month - 1]} ${pattern.day_of_month}`;
      } else if (pattern.month) {
        summary += ` in ${MONTHS[pattern.month - 1]}`;
      }
      break;
  }

  // End condition
  if (endType === 'date' && endDate) {
    summary += `, until ${new Date(endDate).toLocaleDateString()}`;
  } else if (endType === 'count') {
    summary += `, for ${endCount} occurrences`;
  }

  return summary;
}
