'use client';

import { useState } from 'react';
import { Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { CalendarEvent, calendarService } from '@/lib/services/calendar-service';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

interface EditSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent;
  occurrenceDate?: string; // If editing a specific occurrence
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

export type EditAction = 'this' | 'future' | 'all' | 'delete-this' | 'delete-future' | 'delete-all';

/** Renders a modal for editing a recurring event series with scope options. */
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

  const seriesId = calendarService.isRecurringOccurrence(event) ? event.series_id : event.id;
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
      logger.error('Error processing recurring event action:', err, { component: 'EditSeriesModal', action: 'component_action' });
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

  const footerContent = (
    <div className="flex items-center gap-3">
      <button
        onClick={onClose}
        disabled={isProcessing}
        className="px-4 sm:px-6 py-2.5 text-gray-300 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        onClick={handleConfirm}
        disabled={isProcessing}
        className={`px-4 sm:px-6 py-2.5 rounded-full font-medium transition-colors disabled:opacity-50 text-sm sm:text-base ${
          isDeleteAction
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
        }`}
      >
        {isProcessing ? 'Processing...' : (isDeleteAction ? 'Delete' : 'Continue')}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDeleteAction ? 'Delete Recurring Event' : 'Edit Recurring Event'}
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-purple-500 to-purple-600"
      footer={footerContent}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          &quot;{event.title}&quot; is part of a recurring series
        </p>
          {isDeleteAction && (
            <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-800 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="text-sm text-red-200">
                <strong>Warning:</strong> This action cannot be undone. Choose carefully which events to delete.
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-300">
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
                  className={`block cursor-pointer p-4 border-2 rounded-xl transition-all hover:border-purple-600 ${
                    selectedAction === action
                      ? actionInfo.destructive
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-600'
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
                      } bg-gray-700 border-gray-600`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {actionInfo.icon}
                        <span className={`font-medium ${
                          actionInfo.destructive
                            ? 'text-red-100'
                            : 'text-white'
                        }`}>
                          {actionInfo.title}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        actionInfo.destructive
                          ? 'text-red-200'
                          : 'text-gray-300'
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
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
      </div>
    </Modal>
  );
}
