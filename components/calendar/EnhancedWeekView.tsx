'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, isSameDay, getHours, getMinutes, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { Check, Eye, Edit, MapPin, Clock } from 'lucide-react';
import type { CalendarEvent } from '@/lib/services/calendar-service';
import { WeatherBadge } from './WeatherBadge';

interface EnhancedWeekViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventStatusClick: (e: React.MouseEvent, eventId: string, currentStatus: 'not-started' | 'in-progress' | 'completed') => void;
  onViewDetails: (event: CalendarEvent) => void;
  onEditEvent: (event: CalendarEvent) => void;
  getCategoryColor: (category: string) => { border: string; bg: string; text?: string; color?: string };
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm (6-23)
const HOUR_HEIGHT = 80; // pixels per hour

export function EnhancedWeekView({
  date,
  events,
  onEventStatusClick,
  onViewDetails,
  onEditEvent,
  getCategoryColor,
}: EnhancedWeekViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  // Get week days (Monday start)
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const allWeekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Always show all 7 days - the container is scrollable on mobile
  const weekDays = allWeekDays;

  // Update current time every minute, pausing when tab is hidden
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (intervalId) clearInterval(intervalId);
      // Update immediately when becoming visible
      setCurrentTime(new Date());
      intervalId = setInterval(() => setCurrentTime(new Date()), 60000);
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        startInterval();
      }
    };

    // Start interval initially
    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Calculate event position and height
  const getEventStyle = (event: CalendarEvent) => {
    const startTime = parseISO(event.start_time);
    const endTime = event.end_time ? parseISO(event.end_time) : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

    const startHour = getHours(startTime);
    const startMinute = getMinutes(startTime);
    const duration = differenceInMinutes(endTime, startTime);

    // Calculate position from 6am (hour 6)
    const hourOffset = startHour - 6;
    const minuteOffset = startMinute / 60;
    const top = (hourOffset + minuteOffset) * HOUR_HEIGHT;

    // Calculate height
    const height = (duration / 60) * HOUR_HEIGHT;

    return {
      top: `${top}px`,
      height: `${Math.max(height, 40)}px`, // Minimum 40px height
    };
  };

  // Calculate current time indicator position
  const getCurrentTimePosition = () => {
    const hour = getHours(currentTime);
    const minute = getMinutes(currentTime);

    // Only show if within our time range (6am-11pm)
    if (hour < 6 || hour > 23) return null;

    const hourOffset = hour - 6;
    const minuteOffset = minute / 60;
    const top = (hourOffset + minuteOffset) * HOUR_HEIGHT;

    return top;
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(parseISO(event.start_time), day));
  };

  // Detect overlapping events and calculate horizontal positioning for a specific day
  const getEventsWithPositionForDay = (day: Date) => {
    const dayEvents = getEventsForDay(day);
    const sortedEvents = [...dayEvents].sort((a, b) =>
      parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
    );

    const positioned = sortedEvents.map((event, index) => {
      const eventStart = parseISO(event.start_time);
      const eventEnd = event.end_time ? parseISO(event.end_time) : new Date(eventStart.getTime() + 60 * 60 * 1000);

      // Find overlapping events
      let column = 0;
      const overlappingBefore = sortedEvents.slice(0, index).filter(other => {
        const otherStart = parseISO(other.start_time);
        const otherEnd = other.end_time ? parseISO(other.end_time) : new Date(otherStart.getTime() + 60 * 60 * 1000);
        return eventStart < otherEnd && eventEnd > otherStart;
      });

      // Calculate column based on overlaps
      column = overlappingBefore.length;

      // Calculate max overlaps to determine width
      const maxOverlaps = Math.max(1, overlappingBefore.length + 1);

      return {
        event,
        column,
        maxColumns: maxOverlaps,
      };
    });

    return positioned;
  };

  const currentTimeTop = getCurrentTimePosition();

  const categoryConfig = {
    work: { icon: '💼', label: 'Work' },
    personal: { icon: '👤', label: 'Personal' },
    family: { icon: '👨‍👩‍👧‍👦', label: 'Family' },
    health: { icon: '💪', label: 'Health' },
    social: { icon: '🎉', label: 'Social' },
  };

  // Drag and drop handlers (basic implementation)
  const handleDragStart = (event: CalendarEvent) => {
    setDraggedEvent(event);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
  };

  // Get first event with location for weather (across the whole week)
  const firstEventWithLocation = weekDays.flatMap(day => getEventsForDay(day)).find(e => e.location);

  return (
    <div className="relative bg-gray-900 sm:rounded-xl border border-gray-700 overflow-x-auto -mx-4 sm:mx-0">
      {/* Weather Badge Header */}
      {firstEventWithLocation && (
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
          <WeatherBadge
            eventTime={firstEventWithLocation.start_time}
            location={firstEventWithLocation.location}
            display="compact"
          />
        </div>
      )}

      {/* Header with day names */}
      <div className="flex border-b border-gray-700 sticky top-0 bg-gray-900 z-30">
        {/* Time column spacer */}
        <div className="w-12 sm:w-16 flex-shrink-0 border-r border-gray-700" />

        {/* Day headers */}
        {weekDays.map(day => {
          const isTodayDate = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`flex-1 min-w-[44px] sm:min-w-0 p-1 sm:p-3 text-center border-r border-gray-700 last:border-r-0 ${
                isTodayDate ? 'bg-purple-900/20' : ''
              }`}
            >
              <div className={`text-xs sm:text-sm font-medium ${
                isTodayDate ? 'text-purple-400' : 'text-gray-400'
              }`}>
                {format(day, 'EEE')}
              </div>
              <div className={`text-xl sm:text-2xl font-bold mt-1 ${
                isTodayDate
                  ? 'text-purple-400'
                  : 'text-white'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="text-xs sm:text-[10px] text-gray-400 mt-0.5">
                {getEventsForDay(day).length} events
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid + Events container */}
      <div className="flex pt-2">
        {/* Time labels */}
        <div className="w-12 sm:w-16 flex-shrink-0 border-r border-gray-700">
          {HOURS.map(hour => (
            <div
              key={hour}
              className="relative border-b border-gray-700"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <div className="absolute -top-2 left-1 text-[10px] sm:text-xs font-medium text-gray-400 bg-gray-900 px-0.5">
                {format(new Date().setHours(hour, 0), 'ha').toLowerCase()}
              </div>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map(day => {
          const isTodayDate = isToday(day);
          const positionedEvents = getEventsWithPositionForDay(day);

          return (
            <div
              key={day.toISOString()}
              className={`flex-1 min-w-[44px] sm:min-w-0 relative border-r border-gray-700 last:border-r-0 ${
                isTodayDate ? 'bg-purple-900/10' : ''
              }`}
              style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
            >
              {/* Hour grid lines */}
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="absolute w-full border-b border-gray-800"
                  style={{ top: `${(hour - 6) * HOUR_HEIGHT}px` }}
                />
              ))}

              {/* Current time indicator (only for today) */}
              {isTodayDate && currentTimeTop !== null && (
                <div
                  className="absolute w-full z-20"
                  style={{ top: `${currentTimeTop}px` }}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                </div>
              )}

              {/* Events */}
              {positionedEvents.map(({ event, column, maxColumns }) => {
                const style = getEventStyle(event);
                const categoryColor = getCategoryColor(event.category);
                const category = categoryConfig[event.category as keyof typeof categoryConfig] || categoryConfig.personal;

                const width = maxColumns > 1 ? `${100 / maxColumns}%` : '100%';
                const left = maxColumns > 1 ? `${(column * 100) / maxColumns}%` : '0';

                // Use purple shades for overlapping events (calendar brand color)
                const isOverlapping = maxColumns > 1;
                const purpleShades = [
                  'bg-purple-900/30 border-purple-500',
                  'bg-indigo-900/30 border-indigo-500',
                  'bg-violet-900/30 border-violet-500',
                ];
                const overlappingStyle = isOverlapping ? purpleShades[column % purpleShades.length] : '';

                return (
                  <div
                    key={event.id}
                    className={`absolute px-0.5 z-10 cursor-move group`}
                    style={{
                      top: style.top,
                      height: style.height,
                      left: left,
                      width: width,
                    }}
                    draggable
                    onDragStart={() => handleDragStart(event)}
                    onDragEnd={handleDragEnd}
                  >
                    <div
                      className={`h-full p-1.5 rounded-md border-l-4 ${
                        isOverlapping
                          ? overlappingStyle
                          : `${categoryColor.border} ${categoryColor.bg}`
                      } shadow-sm hover:shadow-md transition-all overflow-hidden text-xs`}
                    >
                      <div className="flex items-start gap-1">
                        {/* Status checkbox */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventStatusClick(e, event.id, event.status);
                          }}
                          className={`flex-shrink-0 w-3 h-3 rounded border flex items-center justify-center transition-all ${
                            event.status === 'completed'
                              ? 'bg-green-500 border-green-500'
                              : event.status === 'in-progress'
                              ? 'bg-amber-500 border-amber-500'
                              : 'bg-transparent border-red-500'
                          }`}
                        >
                          {event.status === 'completed' && <Check className="w-2 h-2 text-white" />}
                          {event.status === 'in-progress' && <div className="w-1 h-1 bg-white rounded-full" />}
                        </button>

                        {/* Event content */}
                        <div className="flex-1 min-w-0">
                          {/* Time */}
                          <div className="flex items-center gap-0.5 text-[9px] text-gray-400 mb-0.5">
                            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{format(parseISO(event.start_time), 'h:mm a')}</span>
                          </div>

                          {/* Title */}
                          <h4 className={`font-semibold text-[11px] ${categoryColor.text || 'text-white'} truncate mb-0.5`}>
                            {event.title}
                          </h4>

                          {/* Category badge (if tall enough) */}
                          {parseInt(style.height) > 50 && (
                            <div className="flex items-center gap-0.5 flex-wrap">
                              <span className={`text-[9px] px-1 py-0.5 rounded ${
                                isOverlapping ? 'bg-purple-800 text-purple-100' : (categoryColor.color || categoryColor.bg)
                              } truncate`}>
                                {category.icon} {category.label}
                              </span>
                            </div>
                          )}

                          {/* Location (if tall enough) */}
                          {event.location && parseInt(style.height) > 70 && (
                            <div className="flex items-center gap-0.5 mt-0.5 text-[9px] text-gray-400 truncate">
                              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons - shown on hover */}
                        <div className="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetails(event);
                            }}
                            className="p-0.5 hover:bg-gray-700/50 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3 h-3 text-gray-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEvent(event);
                            }}
                            className="p-0.5 hover:bg-gray-700/50 rounded transition-colors"
                            title="Edit Event"
                          >
                            <Edit className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Drag indicator overlay */}
      {draggedEvent && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-purple-500/30 px-4 py-2 rounded-lg text-sm text-purple-100 font-medium">
            Dragging: {draggedEvent.title}
          </div>
        </div>
      )}
    </div>
  );
}
