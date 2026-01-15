'use client';

import { useState } from 'react';
import { X, Calendar, Clock, MapPin, MessageCircle, Paperclip, Edit, Trash2, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { CalendarEvent } from '@/lib/services/calendar-service';
import { EventCommentThread } from './EventCommentThread';
import { AttachmentGallery } from './AttachmentGallery';
import { WeatherBadge } from './WeatherBadge';
import { format } from 'date-fns';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

type TabType = 'comments' | 'attachments';

export function EventDetailModal({ isOpen, onClose, event, onEdit, onDelete }: EventDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('comments');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const getCategoryConfig = () => {
    const configs = {
      work: { icon: '💼', label: 'Work', accent: 'text-blue-400' },
      personal: { icon: '👤', label: 'Personal', accent: 'text-purple-400' },
      family: { icon: '👨‍👩‍👧‍👦', label: 'Family', accent: 'text-pink-400' },
      health: { icon: '💪', label: 'Health', accent: 'text-green-400' },
      social: { icon: '🎉', label: 'Social', accent: 'text-orange-400' },
    };
    return configs[event.category] || configs.personal;
  };

  const getStatusConfig = () => {
    const configs = {
      'not-started': { icon: AlertCircle, label: 'Not Started', color: 'text-red-500', bg: 'bg-red-900/20' },
      'in-progress': { icon: PlayCircle, label: 'In Progress', color: 'text-amber-500', bg: 'bg-amber-900/20' },
      'completed': { icon: CheckCircle, label: 'Completed', color: 'text-green-500', bg: 'bg-green-900/20' },
    };
    return configs[event.status] || configs['not-started'];
  };

  const categoryConfig = getCategoryConfig();
  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-900 sm:rounded-2xl sm:max-w-lg sm:max-h-[90vh] overflow-hidden overscroll-contain shadow-2xl flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 sm:pt-5 sm:pb-4 border-b border-gray-800">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          {/* Category & Status Row */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{categoryConfig.icon}</span>
            <span className={`text-sm font-medium ${categoryConfig.accent}`}>
              {categoryConfig.label}
            </span>
            <span className="text-gray-600">•</span>
            <div className={`flex items-center gap-1 ${statusConfig.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{statusConfig.label}</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-white pr-8 mb-4">
            {event.title}
          </h2>

          {/* Event Details Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-300">
                {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-300">
                {format(new Date(event.start_time), 'h:mm a')}
                {event.end_time && ` – ${format(new Date(event.end_time), 'h:mm a')}`}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-300">{event.location}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400 leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Weather */}
          {event.location && (
            <div className="mt-4">
              <WeatherBadge eventTime={event.start_time} location={event.location} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-5">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(event);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-full transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Event
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-red-900/20 text-gray-300 hover:text-red-400 text-sm font-medium rounded-full transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="sm:inline hidden">Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800/50 px-5 py-2 flex gap-2">
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'comments'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Comments
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'attachments'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            Files
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[200px] max-h-[300px] bg-gray-900">
          {activeTab === 'comments' ? (
            <EventCommentThread eventId={event.id} spaceId={event.space_id} />
          ) : (
            <AttachmentGallery eventId={event.id} spaceId={event.space_id} canUpload={true} canDelete={true} />
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Delete Event?
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                &quot;{event.title}&quot; will be moved to trash and can be restored within 30 days.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-gray-300 bg-gray-700 rounded-full hover:bg-gray-600 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onDelete) {
                      onDelete(event.id);
                      setShowDeleteConfirm(false);
                      onClose();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-full hover:bg-red-700 text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
