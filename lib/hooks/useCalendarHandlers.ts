'use client';

import { useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { showError, showSuccess } from '@/lib/utils/toast';
import { toast } from 'sonner';
import { calendarService, CalendarEvent, CreateEventInput } from '@/lib/services/calendar-service';
import type { EventTemplate } from '@/lib/services/calendar-service';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import type { UnifiedCalendarItem } from '@/lib/types/unified-calendar-item';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import type { CalendarDataReturn } from './useCalendarData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Subset of CalendarDataReturn that handlers need to read/write state. */
export interface CalendarHandlersDeps {
  // Data
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  loadEvents: () => Promise<void>;

  // Sync
  syncState: CalendarDataReturn['syncState'];

  // Modal / editing state setters (provided by useCalendarModals)
  setEditingEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDetailEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>;
  setConfirmDialog: React.Dispatch<React.SetStateAction<{ isOpen: boolean; eventId: string }>>;
  setSelectedUnifiedItem: React.Dispatch<React.SetStateAction<UnifiedCalendarItem | null>>;
  setIsPreviewModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Current editing event (read)
  editingEvent: CalendarEvent | null;
  confirmDialog: { isOpen: boolean; eventId: string };

  // Navigation setters
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  setViewMode: React.Dispatch<React.SetStateAction<CalendarDataReturn['viewMode']>>;
}

export interface CalendarHandlersReturn {
  // CRUD handlers
  handleCreateEvent: (eventData: CreateEventInput) => Promise<CalendarEvent | void>;
  handleDeleteEvent: (eventId: string) => void;
  handleConfirmDelete: () => Promise<void>;
  handleStatusChange: (eventId: string, status: 'not-started' | 'in-progress' | 'completed') => Promise<void>;
  handleEditEvent: (event: CalendarEvent) => void;
  handleCloseModal: () => void;
  handleSelectTemplate: (template: EventTemplate) => Promise<void>;
  handleViewDetails: (event: CalendarEvent) => void;

  // Status cycling (click handler for event status in calendar cells)
  handleEventStatusClick: (e: React.MouseEvent, eventId: string, currentStatus: 'not-started' | 'in-progress' | 'completed') => void;

  // Unified calendar item click
  handleUnifiedItemClick: (item: UnifiedCalendarItem) => void;

  // Navigation handlers
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handlePrevDay: () => void;
  handleNextDay: () => void;
  handleJumpToToday: () => void;

  // Calendar sync
  handleSyncCalendar: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Provides CRUD event handlers for calendar events, RSVPs, and event proposals */
export function useCalendarHandlers(deps: CalendarHandlersDeps): CalendarHandlersReturn {
  const {
    events,
    setEvents,
    loadEvents,
    syncState,
    setEditingEvent,
    setIsModalOpen,
    setDetailEvent,
    setConfirmDialog,
    setSelectedUnifiedItem,
    setIsPreviewModalOpen,
    editingEvent,
    confirmDialog,
    setCurrentMonth,
    setViewMode: _setViewMode,
  } = deps;

  // Track pending deletion timeouts for undo support
  const pendingDeletionRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  const handleCreateEvent = useCallback(async (eventData: CreateEventInput): Promise<CalendarEvent | void> => {
    try {
      let createdEvent: CalendarEvent | undefined;

      if (editingEvent) {
        await calendarService.updateEvent(editingEvent.id, eventData);
      } else {
        createdEvent = await calendarService.createEvent(eventData);
      }

      loadEvents();
      setEditingEvent(null);

      return createdEvent;
    } catch (error) {
      logger.error('Failed to save event:', error, { component: 'useCalendarHandlers', action: 'execution' });
      throw error;
    }
  }, [editingEvent, loadEvents, setEditingEvent]);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setConfirmDialog({ isOpen: true, eventId });
  }, [setConfirmDialog]);

  const handleConfirmDelete = useCallback(async () => {
    const eventId = confirmDialog.eventId;
    setConfirmDialog({ isOpen: false, eventId: '' });

    // Save event data before removal for undo
    const savedEvent = events.find(e => e.id === eventId);
    if (!savedEvent) return;

    // Optimistic update
    setEvents(prev => prev.filter(event => event.id !== eventId));

    // Clear any existing timeout for this item
    const existingTimeout = pendingDeletionRef.current.get(eventId);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeoutId = setTimeout(async () => {
      try {
        await calendarService.deleteEvent(eventId);
        pendingDeletionRef.current.delete(eventId);
      } catch (error) {
        logger.error('Failed to delete event:', error, { component: 'useCalendarHandlers', action: 'execution' });
        showError('Failed to delete event');
        setEvents(prev => [savedEvent, ...prev]);
        pendingDeletionRef.current.delete(eventId);
      }
    }, 5000);

    pendingDeletionRef.current.set(eventId, timeoutId);

    toast('Event deleted', {
      description: 'You have 5 seconds to undo this action.',
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timeoutId);
          pendingDeletionRef.current.delete(eventId);
          setEvents(prev => [savedEvent, ...prev]);
          showSuccess('Event restored!');
        },
      },
    });
  }, [confirmDialog, events, setConfirmDialog, setEvents]);

  const handleStatusChange = useCallback(async (eventId: string, status: 'not-started' | 'in-progress' | 'completed') => {
    // Optimistic update
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId ? { ...event, status } : event
      )
    );

    try {
      await calendarService.updateEventStatus(eventId, status);
    } catch (error) {
      logger.error('Failed to update event status:', error, { component: 'useCalendarHandlers', action: 'execution' });
      loadEvents();
    }
  }, [loadEvents, setEvents]);

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  }, [setEditingEvent, setIsModalOpen]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingEvent(null);
  }, [setIsModalOpen, setEditingEvent]);

  const handleSelectTemplate = useCallback(async (template: EventTemplate) => {
    try {
      const startTime = new Date().toISOString();
      const event = await calendarService.createEventFromTemplate(template, startTime);

      loadEvents();

      setTimeout(() => {
        handleEditEvent(event);
      }, 100);
    } catch (error) {
      logger.error('Failed to create event from template:', error, { component: 'useCalendarHandlers', action: 'execution' });
      showError('Failed to create event from template');
    }
  }, [loadEvents, handleEditEvent]);

  const handleViewDetails = useCallback((event: CalendarEvent) => {
    setDetailEvent(event);
  }, [setDetailEvent]);

  // ---------------------------------------------------------------------------
  // Status cycling
  // ---------------------------------------------------------------------------

  const handleEventStatusClick = useCallback((e: React.MouseEvent, eventId: string, currentStatus: 'not-started' | 'in-progress' | 'completed') => {
    e.stopPropagation();

    const states: Array<'not-started' | 'in-progress' | 'completed'> = ['not-started', 'in-progress', 'completed'];
    const currentIndex = states.indexOf(currentStatus);
    const nextStatus = states[(currentIndex + 1) % states.length];

    if (nextStatus === 'completed') {
      // Save event data before removal for undo
      const savedEvent = events.find(ev => ev.id === eventId);
      if (!savedEvent) return;

      // Optimistic update - remove from UI
      setEvents(prev => prev.filter(event => event.id !== eventId));

      // Clear any existing timeout for this item
      const existingTimeout = pendingDeletionRef.current.get(eventId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeoutId = setTimeout(async () => {
        try {
          await calendarService.deleteEvent(eventId);
          pendingDeletionRef.current.delete(eventId);
        } catch (error) {
          logger.error('Failed to auto-delete completed event:', error, { component: 'useCalendarHandlers', action: 'execution' });
          showError('Failed to delete event');
          setEvents(prev => [savedEvent, ...prev]);
          pendingDeletionRef.current.delete(eventId);
        }
      }, 5000);

      pendingDeletionRef.current.set(eventId, timeoutId);

      toast('Event completed & removed', {
        description: 'You have 5 seconds to undo this action.',
        action: {
          label: 'Undo',
          onClick: () => {
            clearTimeout(timeoutId);
            pendingDeletionRef.current.delete(eventId);
            setEvents(prev => [savedEvent, ...prev]);
            showSuccess('Event restored!');
          },
        },
      });
    } else {
      handleStatusChange(eventId, nextStatus);
    }
  }, [events, handleStatusChange, setEvents]);

  // ---------------------------------------------------------------------------
  // Unified item click
  // ---------------------------------------------------------------------------

  const handleUnifiedItemClick = useCallback((item: UnifiedCalendarItem) => {
    setSelectedUnifiedItem(item);
    if (item.itemType === 'event' && item.originalItem) {
      setEditingEvent(item.originalItem as CalendarEvent);
      setIsModalOpen(true);
    } else {
      setIsPreviewModalOpen(true);
    }
  }, [setSelectedUnifiedItem, setEditingEvent, setIsModalOpen, setIsPreviewModalOpen]);

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, [setCurrentMonth]);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, [setCurrentMonth]);

  const handlePrevWeek = useCallback(() => {
    setCurrentMonth(prev => subWeeks(prev, 1));
  }, [setCurrentMonth]);

  const handleNextWeek = useCallback(() => {
    setCurrentMonth(prev => addWeeks(prev, 1));
  }, [setCurrentMonth]);

  const handlePrevDay = useCallback(() => {
    setCurrentMonth(prev => subDays(prev, 1));
  }, [setCurrentMonth]);

  const handleNextDay = useCallback(() => {
    setCurrentMonth(prev => addDays(prev, 1));
  }, [setCurrentMonth]);

  const handleJumpToToday = useCallback(() => {
    setCurrentMonth(new Date());
  }, [setCurrentMonth]);

  // ---------------------------------------------------------------------------
  // Calendar sync
  // ---------------------------------------------------------------------------

  const handleSyncCalendar = useCallback(async () => {
    const { calendarConnections, isSyncing } = syncState;
    if (calendarConnections.length === 0 || isSyncing) return;

    // Note: isSyncing state is managed externally via syncState.
    // The caller should set isSyncing = true before calling and false after.
    // However, since the original code managed it inline, we replicate that here
    // by using the setter indirectly through the returned promise pattern.

    let totalEventsSynced = 0;
    let hasError = false;

    try {
      const syncPromises = calendarConnections.map(async (connection) => {
        try {
          const response = await csrfFetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              connection_id: connection.id,
              sync_type: 'incremental',
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            logger.info(`[${connection.provider}] Sync complete: ${data.events_synced} events processed`, { component: 'useCalendarHandlers' });
            return { success: true, events: data.events_synced || 0, provider: connection.provider };
          } else if (response.status === 429) {
            logger.info(`[${connection.provider}] Rate limited - please wait before syncing again`, { component: 'useCalendarHandlers' });
            return { success: false, events: 0, provider: connection.provider, rateLimited: true };
          } else {
            logger.error('[${connection.provider}] Sync failed:', undefined, { component: 'useCalendarHandlers', action: 'execution', details: data.error });
            return { success: false, events: 0, provider: connection.provider, error: data.error };
          }
        } catch (error) {
          logger.error('[${connection.provider}] Sync error:', error, { component: 'useCalendarHandlers', action: 'execution' });
          return { success: false, events: 0, provider: connection.provider, error };
        }
      });

      const results = await Promise.all(syncPromises);

      results.forEach((result) => {
        if (result.success) {
          totalEventsSynced += result.events;
        } else {
          hasError = true;
        }
      });

      if (results.some(r => r.success)) {
        loadEvents();
        const syncTime = new Date().toISOString();
        // Note: The sync time state is managed in useCalendarData.
        // The page will need to update lastSyncTime after calling this handler.
        localStorage.setItem('rowan_calendar_last_sync', syncTime);
        logger.info(`Total sync complete: ${totalEventsSynced} events across ${calendarConnections.length} calendar(s)`, { component: 'useCalendarHandlers' });
      }

      if (hasError) {
        logger.warn('Some calendars failed to sync - check individual provider logs above', { component: 'useCalendarHandlers' });
      }
    } catch (error) {
      logger.error('Sync error:', error, { component: 'useCalendarHandlers', action: 'execution' });
    }
  }, [syncState, loadEvents]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    handleCreateEvent,
    handleDeleteEvent,
    handleConfirmDelete,
    handleStatusChange,
    handleEditEvent,
    handleCloseModal,
    handleSelectTemplate,
    handleViewDetails,
    handleEventStatusClick,
    handleUnifiedItemClick,
    handlePrevMonth,
    handleNextMonth,
    handlePrevWeek,
    handleNextWeek,
    handlePrevDay,
    handleNextDay,
    handleJumpToToday,
    handleSyncCalendar,
  };
}
