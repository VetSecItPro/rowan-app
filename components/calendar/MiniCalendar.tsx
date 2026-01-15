'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';
import type { Event } from '@/lib/types';

interface MiniCalendarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  events: Event[];
}

export function MiniCalendar({ currentDate, onDateSelect, events }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(currentDate);

  // Get all days to display (including padding days from prev/next month)
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Check if a day has events
  const hasEvents = (day: Date): boolean => {
    return events.some(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, day);
    });
  };

  // Get event count for a day
  const getEventCount = (day: Date): number => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, day);
    }).length;
  };

  const handlePrevMonth = () => {
    setViewMonth(subMonths(viewMonth, 1));
  };

  const handleNextMonth = () => {
    setViewMonth(addMonths(viewMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setViewMonth(today);
    onDateSelect(today);
  };

  const handleDayClick = (day: Date) => {
    onDateSelect(day);
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 shadow-sm">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          title="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>

        <h3 className="text-sm font-semibold text-white">
          {format(viewMonth, 'MMMM yyyy')}
        </h3>

        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          title="Next month"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
          <div
            key={index}
            className="text-xs font-medium text-gray-400 text-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, viewMonth);
          const isSelected = isSameDay(day, currentDate);
          const isTodayDate = isToday(day);
          const dayHasEvents = hasEvents(day);
          const eventCount = getEventCount(day);

          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={!isCurrentMonth}
              className={`
                relative aspect-square rounded-lg text-xs font-medium transition-colors
                ${!isCurrentMonth ? 'text-gray-600 cursor-not-allowed' : ''}
                ${isCurrentMonth && !isSelected && !isTodayDate ? 'text-gray-300 hover:bg-gray-700' : ''}
                ${isTodayDate && !isSelected ? 'bg-purple-900/30 text-purple-300 ring-2 ring-purple-500' : ''}
                ${isSelected ? 'bg-purple-600 text-white' : ''}
              `}
              title={format(day, 'MMMM d, yyyy')}
            >
              <span className="relative z-10">{format(day, 'd')}</span>

              {/* Event Indicator Dots */}
              {dayHasEvents && isCurrentMonth && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {eventCount <= 3 ? (
                    // Show individual dots for 1-3 events
                    Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          isSelected
                            ? 'bg-white'
                            : isTodayDate
                            ? 'bg-purple-400'
                            : 'bg-purple-500'
                        }`}
                      />
                    ))
                  ) : (
                    // Show count for 4+ events
                    <div className={`text-[8px] font-bold ${
                      isSelected
                        ? 'text-white'
                        : isTodayDate
                        ? 'text-purple-300'
                        : 'text-purple-400'
                    }`}>
                      {eventCount}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Today Button */}
      <button
        onClick={handleToday}
        className="w-full mt-4 px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
      >
        <CalendarIcon className="w-3.5 h-3.5" />
        Jump to Today
      </button>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-5 h-5 rounded bg-purple-900/30 ring-2 ring-purple-500 flex items-center justify-center">
            <span className="text-[10px] font-medium text-purple-300">1</span>
          </div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center">
            <span className="text-[10px] font-medium text-white">1</span>
          </div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-purple-500" />
            <div className="w-1 h-1 rounded-full bg-purple-500" />
          </div>
          <span>Has events</span>
        </div>
      </div>
    </div>
  );
}
