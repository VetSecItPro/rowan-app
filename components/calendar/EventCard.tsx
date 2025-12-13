'use client';

import { Calendar, Clock, MapPin, MoreVertical, Edit, Trash2, Check, ShoppingCart, Eye, DollarSign } from 'lucide-react';
import { CalendarEvent } from '@/lib/services/calendar-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState } from 'react';
import Link from 'next/link';

interface LinkedShoppingList {
  id: string;
  title: string;
  items_count?: number;
}

interface EventCardProps {
  event: CalendarEvent & { linked_bill_id?: string };
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: 'not-started' | 'in-progress' | 'completed') => void;
  onViewDetails?: (event: CalendarEvent) => void;
  onMarkBillPaid?: (eventId: string, billId: string) => void;
  linkedShoppingList?: LinkedShoppingList;
}

export function EventCard({ event, onEdit, onDelete, onStatusChange, onViewDetails, onMarkBillPaid, linkedShoppingList }: EventCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isBillEvent = Boolean(event.linked_bill_id);

  const formatEventTime = () => {
    return formatTimestamp(event.start_time, 'h:mm a');
  };

  const formatEventDate = () => {
    return formatTimestamp(event.start_time, 'MMM d, yyyy');
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
    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-3 sm:p-4 md:p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            {/* Three-state checkbox */}
            <div className="relative group">
              <button
                onClick={handleCheckboxClick}
                aria-label={`Toggle event status: ${event.status === 'not-started' ? 'Not Started' : event.status === 'in-progress' ? 'In Progress' : 'Completed'}`}
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 hover:scale-105 ${
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
              className={`w-1 h-10 sm:h-12 rounded-full ${getCategoryConfig().barColor} flex-shrink-0`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate ${
                  event.status === 'completed' ? 'line-through opacity-60' : ''
                }`}>
                  {event.title}
                </h3>
                <span className={`px-2 py-0.5 sm:py-1 rounded text-xs font-medium ${getCategoryConfig().color} ${
                  event.status === 'completed' ? 'opacity-60' : ''
                }`}>
                  {getCategoryConfig().icon} {getCategoryConfig().label}
                </span>
              </div>
              <div className={`flex items-center gap-2 sm:gap-3 md:gap-4 mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-wrap ${
                event.status === 'completed' ? 'line-through opacity-60' : ''
              }`}>
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
            <p className={`text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2 sm:mt-3 ml-3 sm:ml-4 break-words line-clamp-2 ${
              event.status === 'completed' ? 'line-through opacity-60' : ''
            }`}>
              {event.description}
            </p>
          )}

          {event.location && (
            <div className={`flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 ml-3 sm:ml-4 text-gray-600 dark:text-gray-400 ${
              event.status === 'completed' ? 'line-through opacity-60' : ''
            }`}>
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">{event.location}</span>
            </div>
          )}

          {linkedShoppingList && (
            <Link
              href="/shopping"
              className={`inline-flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2.5 sm:px-3 mt-2 sm:mt-3 ml-3 sm:ml-4 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md ${
                event.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">
                {linkedShoppingList.title}
                {linkedShoppingList.items_count !== undefined && ` (${linkedShoppingList.items_count} items)`}
              </span>
            </Link>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Event options menu"
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 dropdown-mobile bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-xl z-20">
                {/* Mark Bill as Paid - Only show for bill-linked events that aren't completed */}
                {isBillEvent && onMarkBillPaid && event.linked_bill_id && event.status !== 'completed' && (
                  <button
                    onClick={() => {
                      onMarkBillPaid(event.id, event.linked_bill_id!);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 rounded-t-lg transition-colors font-medium"
                  >
                    <DollarSign className="w-4 h-4" />
                    Mark Bill as Paid
                  </button>
                )}
                {onViewDetails && (
                  <button
                    onClick={() => {
                      onViewDetails(event);
                      setShowMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors ${
                      (!isBillEvent || !onMarkBillPaid || event.status === 'completed') ? 'rounded-t-lg' : ''
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                )}
                <button
                  onClick={() => {
                    onEdit(event);
                    setShowMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors ${
                    !onViewDetails && (!isBillEvent || !onMarkBillPaid || event.status === 'completed') ? 'rounded-t-lg' : ''
                  }`}
                >
                  <Edit className="w-4 h-4" />
                  Edit Event
                </button>
                <button
                  onClick={() => {
                    onDelete(event.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-b-lg transition-colors"
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
