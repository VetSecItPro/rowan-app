'use client';

import { Calendar, Clock, MapPin, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { CalendarEvent } from '@/lib/services/calendar-service';
import { format } from 'date-fns';
import { useState } from 'react';

interface EventCardProps {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatEventTime = () => {
    if (event.all_day) {
      return 'All day';
    }
    return format(new Date(event.start_date), 'h:mm a');
  };

  const formatEventDate = () => {
    return format(new Date(event.start_date), 'MMM d, yyyy');
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-1 h-12 rounded-full"
              style={{ backgroundColor: event.color || '#8b5cf6' }}
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {event.title}
              </h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatEventDate()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatEventTime()}
                </div>
              </div>
            </div>
          </div>

          {event.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-3 ml-4">
              {event.description}
            </p>
          )}

          {event.location && (
            <div className="flex items-center gap-2 mt-3 ml-4 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{event.location}</span>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20">
                <button
                  onClick={() => {
                    onEdit(event);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-t-lg"
                >
                  <Edit className="w-4 h-4" />
                  Edit Event
                </button>
                <button
                  onClick={() => {
                    onDelete(event.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-b-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Event
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
