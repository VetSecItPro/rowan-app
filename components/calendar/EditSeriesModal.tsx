'use client';

import { useState } from 'react';
import { X, Calendar, Edit3, Trash2, Copy, AlertTriangle } from 'lucide-react';
import { CalendarEvent, CreateEventInput, calendarService } from '@/lib/services/calendar-service';

interface EditSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent;
  occurrenceDate?: string; // If editing a specific occurrence
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

export type EditAction = 'this' | 'future' | 'all' | 'delete-this' | 'delete-future' | 'delete-all';

export function EditSeriesModal({
  isOpen,
  onClose,
  event,
  occurrenceDate,
  onEventUpdated,
  onEventDeleted
}: EditSeriesModalProps) {
  const [selectedAction, setSelectedAction] = useState<EditAction>('this');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const isRecurringOccurrence = calendarService.isRecurringOccurrence(event);
  const seriesId = isRecurringOccurrence ? (event as any).series_id : event.id;
  const isDeleteAction = selectedAction.startsWith('delete-');

  const handleConfirm = async () => {
    setIsProcessing(true);
    setError('');

    try {
      switch (selectedAction) {
        case 'this':
          if (occurrenceDate) {
            // Create exception for this occurrence
            await calendarService.recurring.createException(
              seriesId,
              occurrenceDate,
              {} // Empty modifications - will open edit modal after this
            );
          }
          break;

        case 'future':
          if (occurrenceDate) {
            // Split series from this date
            await calendarService.recurring.updateFromDate(
              seriesId,
              occurrenceDate,
              {} // Empty modifications - will open edit modal after this
            );
          }
          break;

        case 'all':
          // Will open edit modal for the master event
          break;

        case 'delete-this':
          if (occurrenceDate) {
            await calendarService.recurring.deleteOccurrence(seriesId, occurrenceDate);
            onEventDeleted?.();
          }
          break;

        case 'delete-future':
          if (occurrenceDate) {
            // End the series before this date
            const endDate = new Date(occurrenceDate);
            endDate.setDate(endDate.getDate() - 1);

            await calendarService.recurring.updateSeries(seriesId, {
              // This would need enhanced pattern support to set end_date
              // For now, we'll need to implement this in the recurring service
            });
            onEventDeleted?.();
          }
          break;

        case 'delete-all':
          await calendarService.deleteEvent(seriesId);
          onEventDeleted?.();
          break;
      }

      // Call the update callback to refresh the calendar
      onEventUpdated?.();
      onClose();
    } catch (err) {
      console.error('Error processing recurring event action:', err);
      setError('Failed to process the action. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionDescription = (action: EditAction): { title: string; description: string; icon: React.ReactNode; destructive?: boolean } => {
    const baseIcon = isDeleteAction ? <Trash2 className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />;

    switch (action) {
      case 'this':
        return {
          title: isDeleteAction ? 'Only this event' : 'Only this event',
          description: isDeleteAction
            ? 'Delete just this occurrence. Other events in the series will remain.'
            : 'Changes will only apply to this occurrence. Other events in the series will remain unchanged.',
          icon: baseIcon
        };

      case 'future':
        return {
          title: isDeleteAction ? 'This and all future events' : 'This and all future events',
          description: isDeleteAction
            ? 'Delete this occurrence and all future events in the series. Past events will remain.'
            : 'Changes will apply to this event and all future events in the series. This creates a new series starting from this date.',
          icon: baseIcon
        };

      case 'all':
        return {
          title: isDeleteAction ? 'All events in the series' : 'All events in the series',
          description: isDeleteAction
            ? 'Delete the entire recurring series. This cannot be undone.'
            : 'Changes will apply to all events in the series, including past and future events.',
          icon: baseIcon,
          destructive: isDeleteAction
        };

      case 'delete-this':
        return {
          title: 'Only this event',
          description: 'Delete just this occurrence. Other events in the series will remain.',
          icon: <Trash2 className="w-5 h-5" />,
          destructive: true
        };

      case 'delete-future':
        return {
          title: 'This and all future events',
          description: 'Delete this occurrence and all future events in the series. Past events will remain.',
          icon: <Trash2 className="w-5 h-5" />,
          destructive: true
        };

      case 'delete-all':
        return {
          title: 'All events in the series',
          description: 'Delete the entire recurring series. This cannot be undone.',
          icon: <Trash2 className="w-5 h-5" />,
          destructive: true
        };

      default:
        return {
          title: 'Unknown action',
          description: '',
          icon: baseIcon
        };
    }
  };

  const availableActions: EditAction[] = isDeleteAction
    ? ['delete-this', 'delete-future', 'delete-all']
    : ['this', 'future', 'all'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isDeleteAction ? 'Delete Recurring Event' : 'Edit Recurring Event'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                "{event.title}" is part of a recurring series
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isDeleteAction && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <strong>Warning:</strong> This action cannot be undone. Choose carefully which events to delete.
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isDeleteAction
                ? 'Which events would you like to delete?'
                : 'Which events would you like to modify?'
              }
            </p>

            {availableActions.map((action) => {
              const actionInfo = getActionDescription(action);
              return (
                <label
                  key={action}
                  className={`block cursor-pointer p-4 border-2 rounded-xl transition-all hover:border-purple-300 dark:hover:border-purple-600 ${
                    selectedAction === action
                      ? actionInfo.destructive
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="editAction"
                      value={action}
                      checked={selectedAction === action}
                      onChange={(e) => setSelectedAction(e.target.value as EditAction)}
                      className={`mt-1 w-4 h-4 ${
                        actionInfo.destructive
                          ? 'text-red-600 focus:ring-red-500'
                          : 'text-purple-600 focus:ring-purple-500'
                      } bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {actionInfo.icon}
                        <span className={`font-medium ${
                          actionInfo.destructive
                            ? 'text-red-900 dark:text-red-100'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {actionInfo.title}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        actionInfo.destructive
                          ? 'text-red-700 dark:text-red-200'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}>
                        {actionInfo.description}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 ${
              isDeleteAction
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isProcessing ? 'Processing...' : (isDeleteAction ? 'Delete' : 'Continue')}
          </button>
        </div>
      </div>
    </div>
  );
}