'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, isSameDay, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import { Check, Eye, Edit, MapPin, Clock } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import { WeatherBadge } from './WeatherBadge';

interface EnhancedDayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventStatusClick: (e: React.MouseEvent, eventId: string, currentStatus: 'not-started' | 'in-progress' | 'completed') => void;
  onViewDetails: (event: CalendarEvent) => void;
  onEditEvent: (event: CalendarEvent) => void;
  getCategoryColor: (category: string) => any;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm (6-23)
const HOUR_HEIGHT = 80; // pixels per hour

export function EnhancedDayView({
  date,
  events,
  onEventStatusClick,
  onViewDetails,
  onEditEvent,
  getCategoryColor,
}: EnhancedDayViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const isToday = isSameDay(date, new Date());

  // Update current time every minute
  useEffect(() => {
    if (!isToday) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isToday]);

  // Get events for this day
  const dayEvents = events.filter(event => isSameDay(parseISO(event.start_time), date));

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
    if (!isToday) return null;

    const hour = getHours(currentTime);
    const minute = getMinutes(currentTime);

    // Only show if within our time range (6am-11pm)
    if (hour < 6 || hour > 23) return null;

    const hourOffset = hour - 6;
    const minuteOffset = minute / 60;
    const top = (hourOffset + minuteOffset) * HOUR_HEIGHT;

    return top;
  };

  // Detect overlapping events and calculate horizontal positioning
  const getEventsWithPosition = () => {
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
  const positionedEvents = getEventsWithPosition();

  const categoryConfig = {
    work: { icon: '💼', label: 'Work' },
    personal: { icon: '👤', label: 'Personal' },
    family: { icon: '👨‍👩‍👧‍👦', label: 'Family' },
    health: { icon: '💪', label: 'Health' },
    social: { icon: '🎉', label: 'Social' },
  };

  // Get first event with location for weather
  const firstEventWithLocation = dayEvents.find(e => e.location);

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Weather Badge Header */}
      {firstEventWithLocation && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <WeatherBadge
            eventTime={firstEventWithLocation.start_time}
            location={firstEventWithLocation.location}
            compact={true}
          />
        </div>
      )}

      {/* Time column + Events container */}
      <div className="flex">
        {/* Time labels */}
        <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
          {HOURS.map(hour => (
            <div
              key={hour}
              className="relative border-b border-gray-200 dark:border-gray-700"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <div className="absolute -top-2 left-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 px-1">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
            </div>
          ))}
        </div>

        {/* Events area */}
        <div className="flex-1 relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
          {/* Hour grid lines */}
          {HOURS.map(hour => (
            <div
              key={hour}
              className="absolute w-full border-b border-gray-100 dark:border-gray-800"
              style={{ top: `${(hour - 6) * HOUR_HEIGHT}px` }}
            />
          ))}

          {/* Current time indicator */}
          {currentTimeTop !== null && (
            <div
              className="absolute w-full z-20"
              style={{ top: `${currentTimeTop}px` }}
            >
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
              <div className="absolute left-4 -top-3 text-xs font-bold text-red-500">
                {format(currentTime, 'h:mm a')}
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
              'bg-purple-100 dark:bg-purple-900/30 border-purple-500',
              'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-500',
              'bg-violet-100 dark:bg-violet-900/30 border-violet-500',
            ];
            const overlappingStyle = isOverlapping ? purpleShades[column % purpleShades.length] : '';

            return (
              <div
                key={event.id}
                className={`absolute px-1 z-10 cursor-pointer group`}
                style={{
                  top: style.top,
                  height: style.height,
                  left: left,
                  width: width,
                }}
              >
                <div
                  className={`h-full p-2 rounded-lg border-l-4 ${
                    isOverlapping
                      ? overlappingStyle
                      : `${categoryColor.border} ${categoryColor.bg}`
                  } shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
                >
                  <div className="flex items-start justify-between gap-1 h-full">
                    <div className="flex-1 min-w-0">
                      {/* Status checkbox */}
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={(e) => onEventStatusClick(e, event.id, event.status)}
                          className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            event.status === 'completed'
                              ? 'bg-green-500 border-green-500'
                              : event.status === 'in-progress'
                              ? 'bg-amber-500 border-amber-500'
                              : 'bg-transparent border-red-500'
                          }`}
                        >
                          {event.status === 'completed' && <Check className="w-2.5 h-2.5 text-white" />}
                          {event.status === 'in-progress' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </button>
                        <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(event.start_time), 'h:mm a')}
                        </div>
                      </div>

                      {/* Event title */}
                      <h4 className={`font-semibold text-sm ${categoryColor.text} truncate`}>
                        {event.title}
                      </h4>

                      {/* Category badge */}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isOverlapping ? 'bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100' : categoryColor.color
                        }`}>
                          {category.icon} {category.label}
                        </span>
                      </div>

                      {/* Location (if event is tall enough) */}
                      {event.location && parseInt(style.height) > 60 && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons - shown on hover */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onViewDetails(event)}
                        className="p-1 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => onEditEvent(event)}
                        className="p-1 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                        title="Edit Event"
                      >
                        <Edit className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {dayEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400 dark:text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No events scheduled</p>
                <p className="text-xs mt-1">Press N to create a new event or Q for quick add</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
