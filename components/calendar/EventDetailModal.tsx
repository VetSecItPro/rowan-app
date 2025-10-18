'use client';

import { useState } from 'react';
import { X, Calendar, Clock, MapPin, MessageCircle, Paperclip, Users } from 'lucide-react';
import { CalendarEvent } from '@/lib/services/calendar-service';
import { EventCommentThread } from './EventCommentThread';
import { AttachmentGallery } from './AttachmentGallery';
import { WeatherBadge } from './WeatherBadge';
import { format } from 'date-fns';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent;
}

type TabType = 'comments' | 'attachments';

export function EventDetailModal({ isOpen, onClose, event }: EventDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('comments');

  if (!isOpen) return null;

  const getCategoryConfig = () => {
    const configs = {
      work: {
        icon: '💼',
        label: 'Work',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        gradient: 'from-blue-600 to-blue-700'
      },
      personal: {
        icon: '👤',
        label: 'Personal',
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        gradient: 'from-purple-600 to-indigo-600'
      },
      family: {
        icon: '👨‍👩‍👧‍👦',
        label: 'Family',
        color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
        gradient: 'from-pink-600 to-pink-700'
      },
      health: {
        icon: '💪',
        label: 'Health',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        gradient: 'from-green-600 to-green-700'
      },
      social: {
        icon: '🎉',
        label: 'Social',
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        gradient: 'from-orange-600 to-orange-700'
      },
    };
    return configs[event.category] || configs.personal;
  };

  const categoryConfig = getCategoryConfig();

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-2xl sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        {/* Header - Fixed */}
        <div className={`sticky top-0 z-10 bg-gradient-to-r ${categoryConfig.gradient} text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl flex-shrink-0`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{categoryConfig.icon}</span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  {categoryConfig.label}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold">{event.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="btn-touch w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active-press hover-lift shimmer-purple"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Event Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="flex items-center gap-2 text-white/90">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {format(new Date(event.start_time), 'h:mm a')}
                {event.end_time && ` - ${format(new Date(event.end_time), 'h:mm a')}`}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-white/90 col-span-full">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
              <p className="text-sm text-white/90">{event.description}</p>
            </div>
          )}

          {/* Weather Forecast */}
          {event.location && (
            <div className="mt-4">
              <WeatherBadge eventTime={event.start_time} location={event.location} />
            </div>
          )}
        </div>

        {/* Tab Navigation - Fixed */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 flex-shrink-0">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('comments')}
              className={`btn-touch px-4 py-3 font-medium text-sm border-b-2 transition-colors active-press hover-lift shimmer-purple ${
                activeTab === 'comments'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>Comments</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('attachments')}
              className={`btn-touch px-4 py-3 font-medium text-sm border-b-2 transition-colors active-press hover-lift shimmer-purple ${
                activeTab === 'attachments'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                <span>Attachments</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content - Scrollable with fixed height */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {activeTab === 'comments' ? (
            <EventCommentThread eventId={event.id} spaceId={event.space_id} />
          ) : (
            <AttachmentGallery eventId={event.id} spaceId={event.space_id} canUpload={true} canDelete={true} />
          )}
        </div>
      </div>
    </div>
  );
}
