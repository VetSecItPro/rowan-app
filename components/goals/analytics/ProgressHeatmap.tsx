'use client';

import { useState } from 'react';

interface ProgressHeatmapProps {
  data: Array<{
    date: string;
    count: number;
  }>;
}

/** Renders a heatmap visualization of daily goal progress activity. */
export default function ProgressHeatmap({ data }: ProgressHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  // Get intensity color based on count
  const getIntensityColor = (count: number) => {
    if (count === 0) return 'bg-gray-800';
    if (count === 1) return 'bg-indigo-900';
    if (count === 2) return 'bg-indigo-700';
    if (count === 3) return 'bg-indigo-500';
    return 'bg-indigo-400';
  };

  // Group data by week
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  let currentWeek: Array<{ date: string; count: number }> = [];

  // Get last 365 days
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 364);

  // Create map for quick lookup
  const dataMap = new Map(data.map(d => [d.date, d.count]));

  // Fill in all dates
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const count = dataMap.get(dateStr) || 0;

    currentWeek.push({ date: dateStr, count });

    // Start new week on Sunday
    if (currentDate.getDay() === 6 || currentDate.getTime() === endDate.getTime()) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Get month labels
  const getMonthLabel = (weekIndex: number): string | null => {
    if (weekIndex >= weeks.length) return null;
    const firstDay = weeks[weekIndex][0];
    if (!firstDay) return null;

    const date = new Date(firstDay.date);
    const dayOfMonth = date.getDate();

    // Show month name if it's the first week or if we're in the first 7 days of the month
    if (dayOfMonth <= 7 || weekIndex === 0) {
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
    return null;
  };

  const totalActivity = data.reduce((sum, d) => sum + d.count, 0);
  const avgActivity = data.length > 0 ? (totalActivity / data.length).toFixed(1) : '0';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Activity Heatmap
        </h3>
        <div className="text-sm text-gray-400">
          {totalActivity} activities in the last year (avg: {avgActivity}/day)
        </div>
      </div>

      <div className="relative">
        {/* Month labels */}
        <div className="flex mb-2">
          {weeks.map((_, index) => {
            const label = getMonthLabel(index);
            return (
              <div
                key={index}
                className="flex-shrink-0"
                style={{ width: '14px', marginRight: '2px' }}
              >
                {label && (
                  <span className="text-xs text-gray-400">
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Heatmap grid */}
        <div className="flex overflow-x-auto pb-4">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[2px] mr-[2px]">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-indigo-500 ${getIntensityColor(
                    day.count
                  )}`}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  title={`${day.date}: ${day.count} activities`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredDay && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10">
            <div className="font-semibold">
              {new Date(hoveredDay.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="text-gray-300">
              {hoveredDay.count} {hoveredDay.count === 1 ? 'activity' : 'activities'}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-800" />
            <div className="w-3 h-3 rounded-sm bg-indigo-900" />
            <div className="w-3 h-3 rounded-sm bg-indigo-700" />
            <div className="w-3 h-3 rounded-sm bg-indigo-500" />
            <div className="w-3 h-3 rounded-sm bg-indigo-400" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
