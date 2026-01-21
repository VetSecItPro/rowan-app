'use client';

// Bulk Event Manager Component
// Phase 9: Provides UI for bulk deleting events, especially imported ones

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Trash2, RefreshCw, AlertTriangle, Check, X, Archive, RotateCcw, Calendar, Filter } from 'lucide-react';
import { calendarService, CalendarEvent } from '@/lib/services/calendar-service';
import { format, parseISO } from 'date-fns';
import { logger } from '@/lib/logger';

interface BulkEventManagerProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  events: CalendarEvent[];
  onEventsDeleted: () => void;
}

type TabType = 'manage' | 'trash';

interface EventSourceInfo {
  source: string;
  label: string;
  count: number;
  icon: string;
}

export function BulkEventManager({
  isOpen,
  onClose,
  spaceId,
  events,
  onEventsDeleted,
}: BulkEventManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('manage');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedEvents, setDeletedEvents] = useState<CalendarEvent[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ source: string; count: number } | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [operationResult, setOperationResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Get event sources with counts
  const eventSources = useMemo((): EventSourceInfo[] => {
    const sourceCounts = new Map<string, number>();

    events.forEach(event => {
      const source = event.event_type || 'manual';
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });

    const sourceLabels: Record<string, { label: string; icon: string }> = {
      'google': { label: 'Google Calendar', icon: '📅' },
      'apple': { label: 'Apple Calendar', icon: '🍎' },
      'outlook': { label: 'Outlook Calendar', icon: '📧' },
      'ics_import': { label: 'ICS Import', icon: '📁' },
      'cozi': { label: 'Cozi Calendar', icon: '🏠' },
      'manual': { label: 'Manual Events', icon: '✏️' },
      'template': { label: 'From Templates', icon: '📋' },
    };

    return Array.from(sourceCounts.entries())
      .map(([source, count]) => ({
        source,
        label: sourceLabels[source]?.label || source,
        icon: sourceLabels[source]?.icon || '📆',
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  // Load deleted events when trash tab is active
  const loadDeletedEvents = useCallback(async () => {
    setLoadingDeleted(true);
    try {
      const deleted = await calendarService.getDeletedEvents(spaceId);
      setDeletedEvents(deleted);
    } catch (error) {
      logger.error('Failed to load deleted events:', error, { component: 'BulkEventManager', action: 'component_action' });
    } finally {
      setLoadingDeleted(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (activeTab === 'trash' && spaceId) {
      loadDeletedEvents();
    }
  }, [activeTab, spaceId, loadDeletedEvents]);

  // Handle bulk delete by source
  const handleDeleteBySource = async () => {
    if (!confirmDelete) return;

    setIsDeleting(true);
    setOperationResult(null);

    try {
      const result = await calendarService.deleteEventsBySource(spaceId, confirmDelete.source);

      if (result.errors.length > 0) {
        setOperationResult({ type: 'error', message: result.errors.join(', ') });
      } else {
        setOperationResult({
          type: 'success',
          message: `Successfully moved ${result.deleted} events to trash`
        });
        onEventsDeleted();
      }
    } catch {
      setOperationResult({ type: 'error', message: 'Failed to delete events' });
    } finally {
      setIsDeleting(false);
      setConfirmDelete(null);
    }
  };

  // Handle bulk delete selected events
  const handleDeleteSelected = async () => {
    if (selectedEvents.size === 0) return;

    setIsDeleting(true);
    setOperationResult(null);

    try {
      const result = await calendarService.deleteEvents(Array.from(selectedEvents));

      if (result.errors.length > 0) {
        setOperationResult({ type: 'error', message: result.errors.join(', ') });
      } else {
        setOperationResult({
          type: 'success',
          message: `Successfully moved ${result.deleted} events to trash`
        });
        setSelectedEvents(new Set());
        onEventsDeleted();
      }
    } catch {
      setOperationResult({ type: 'error', message: 'Failed to delete events' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle restore event
  const handleRestoreEvent = async (eventId: string) => {
    try {
      await calendarService.restoreEvent(eventId);
      setDeletedEvents(prev => prev.filter(e => e.id !== eventId));
      setOperationResult({ type: 'success', message: 'Event restored successfully' });
      onEventsDeleted();
    } catch {
      setOperationResult({ type: 'error', message: 'Failed to restore event' });
    }
  };

  // Handle permanent delete
  const handlePermanentDelete = async (eventId: string) => {
    try {
      await calendarService.deleteEvent(eventId, true);
      setDeletedEvents(prev => prev.filter(e => e.id !== eventId));
      setOperationResult({ type: 'success', message: 'Event permanently deleted' });
    } catch {
      setOperationResult({ type: 'error', message: 'Failed to permanently delete event' });
    }
  };

  // Handle purge all deleted events
  const handlePurgeAll = async () => {
    if (!window.confirm('Are you sure you want to permanently delete ALL events in trash? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await calendarService.purgeDeletedEvents(spaceId);
      if (result.errors.length > 0) {
        setOperationResult({ type: 'error', message: result.errors.join(', ') });
      } else {
        setOperationResult({
          type: 'success',
          message: `Permanently deleted ${result.deleted} events`
        });
        setDeletedEvents([]);
      }
    } catch {
      setOperationResult({ type: 'error', message: 'Failed to purge events' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Select all events from a source
  const selectAllFromSource = (source: string) => {
    const sourceEvents = events.filter(e => (e.event_type || 'manual') === source);
    setSelectedEvents(new Set(sourceEvents.map(e => e.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedEvents(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Manage Events
              </h2>
              <p className="text-sm text-gray-400">
                Bulk delete or restore calendar events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'manage'
                  ? 'border-purple-600 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>Bulk Delete</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'trash'
                  ? 'border-purple-600 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Trash</span>
                {deletedEvents.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-red-900/30 text-red-300 rounded-full">
                    {deletedEvents.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Operation Result Alert */}
        {operationResult && (
          <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 ${
            operationResult.type === 'success'
              ? 'bg-green-900/30 text-green-300'
              : 'bg-red-900/30 text-red-300'
          }`}>
            {operationResult.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm">{operationResult.message}</span>
            <button
              onClick={() => setOperationResult(null)}
              className="ml-auto p-1 hover:bg-black/10 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'manage' ? (
            <div className="space-y-6">
              {/* Delete by Source */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Delete by Source
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Remove all events imported from a specific calendar source.
                </p>

                {eventSources.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No events to manage</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eventSources.map(source => (
                      <div
                        key={source.source}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{source.icon}</span>
                          <div>
                            <div className="font-medium text-white">
                              {source.label}
                            </div>
                            <div className="text-sm text-gray-400">
                              {source.count} event{source.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => selectAllFromSource(source.source)}
                            className="px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-900/30 rounded-lg transition-colors"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ source: source.source, count: source.count })}
                            className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete All
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Events Actions */}
              {selectedEvents.size > 0 && (
                <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-purple-400" />
                      <span className="font-medium text-purple-100">
                        {selectedEvents.size} event{selectedEvents.size !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={clearSelection}
                        className="px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete Selected
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Trash Tab */
            <div className="space-y-4">
              {loadingDeleted ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : deletedEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Trash is empty</p>
                  <p className="text-sm mt-1">Deleted events appear here for 30 days</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                      {deletedEvents.length} event{deletedEvents.length !== 1 ? 's' : ''} in trash
                    </p>
                    <button
                      onClick={handlePurgeAll}
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Empty Trash
                    </button>
                  </div>

                  <div className="space-y-2">
                    {deletedEvents.map(event => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">
                            {event.title}
                          </div>
                          <div className="text-sm text-gray-400 flex items-center gap-2">
                            <span>{format(parseISO(event.start_time), 'MMM d, yyyy')}</span>
                            {event.deleted_at && (
                              <>
                                <span>•</span>
                                <span>Deleted {format(parseISO(event.deleted_at), 'MMM d')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleRestoreEvent(event.id)}
                            className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Restore event"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(event.id)}
                            className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Delete All Events?
              </h3>
              <p className="text-gray-400 mb-6">
                This will move <strong>{confirmDelete.count}</strong> events from this source to trash.
                You can restore them within 30 days.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBySource}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkEventManager;
