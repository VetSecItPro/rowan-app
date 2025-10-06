'use client';

import { Calendar, Clock, MapPin, MoreVertical, Edit, Trash2, Check } from 'lucide-react';
import { CalendarEvent } from '@/lib/services/calendar-service';
import { format } from 'date-fns';
import { useState } from 'react';

interface EventCardProps {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: 'not-started' | 'in-progress' | 'completed') => void;
}

export function EventCard({ event, onEdit, onDelete, onStatusChange }: EventCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatEventTime = () => {
    return format(new Date(event.start_time), 'h:mm a');
  };

  const formatEventDate = () => {
    return format(new Date(event.start_time), 'MMM d, yyyy');
  };

  const getCategoryConfig = () => {
    const configs = {
      work: {
        icon: '💼',
        label: 'Work',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        barColor: 'bg-blue-500'
      },
      personal: {
        icon: '👤',
        label: 'Personal',
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        barColor: 'bg-purple-500'
      },
      family: {
        icon: '👨‍👩‍👧‍👦',
        label: 'Family',
        color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
        barColor: 'bg-pink-500'
      },
      health: {
        icon: '💪',
        label: 'Health',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        barColor: 'bg-green-500'
      },
      social: {
        icon: '🎉',
        label: 'Social',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        barColor: 'bg-orange-500'
      },
    };
    return configs[event.category] || configs.personal;
  };

  const handleCheckboxClick = () => {
    const states: Array<'not-started' | 'in-progress' | 'completed'> = ['not-started', 'in-progress', 'completed'];
    const currentIndex = states.indexOf(event.status);
    const nextIndex = (currentIndex + 1) % states.length;
    onStatusChange(event.id, states[nextIndex]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Three-state checkbox */}
            <div className="relative group">
              <button
                onClick={handleCheckboxClick}
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  event.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : event.status === 'in-progress'
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-transparent border-red-500'
                }`}
              >
                {event.status === 'completed' && <Check className="w-4 h-4 text-white" />}
                {event.status === 'in-progress' && <div className="w-2 h-2 bg-white rounded-full" />}
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {event.status === 'not-started' ? 'Not Started' : event.status === 'in-progress' ? 'In Progress' : 'Completed'}
              </div>
            </div>

            <div
              className={`w-1 h-12 rounded-full ${getCategoryConfig().barColor}`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {event.title}
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryConfig().color}`}>
                  {getCategoryConfig().icon} {getCategoryConfig().label}
                </span>
              </div>
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
