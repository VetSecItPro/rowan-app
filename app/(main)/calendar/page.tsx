'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useDevice } from '@/lib/contexts/DeviceContext';
import { Calendar as CalendarIcon, Search, Plus, CalendarDays, CalendarRange, CalendarClock, ChevronLeft, ChevronRight, Check, Users, MapPin, Eye, Edit, List, X, RefreshCw, Archive } from 'lucide-react';
import nextDynamic from 'next/dynamic';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { AIContextualHint } from '@/components/ai/AIContextualHint';
import { z } from 'zod';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { EventCard } from '@/components/calendar/EventCard';
import { ProposalsList } from '@/components/calendar/ProposalsList';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';
import { QuickAddEvent } from '@/components/calendar/QuickAddEvent';
import { logger } from '@/lib/logger';
import { showError } from '@/lib/utils/toast';

// Phase 9: Unified Calendar View imports
import { UnifiedCalendarFilters } from '@/components/calendar/UnifiedCalendarFilters';
import { UnifiedCalendarLegendCompact } from '@/components/calendar/UnifiedCalendarLegend';
import { UnifiedCalendarItemCard } from '@/components/calendar/UnifiedCalendarItemCard';
import { useUnifiedCalendar } from '@/lib/hooks/useUnifiedCalendar';
import type { UnifiedCalendarItem } from '@/lib/types/unified-calendar-item';

// Eagerly imported view components (rendered based on active view mode)
import { EnhancedDayView } from '@/components/calendar/EnhancedDayView';
import { EnhancedWeekView } from '@/components/calendar/EnhancedWeekView';
import { WeatherBadge } from '@/components/calendar/WeatherBadge';
import { geolocationService } from '@/lib/services/geolocation-service';

// Lazy-load modals and dialogs (only rendered when opened)
const NewEventModal = nextDynamic(() => import('@/components/calendar/NewEventModal').then(m => ({ default: m.NewEventModal })), { ssr: false });
const EventDetailModal = nextDynamic(() => import('@/components/calendar/EventDetailModal').then(m => ({ default: m.EventDetailModal })), { ssr: false });
const EventProposalModal = nextDynamic(() => import('@/components/calendar/EventProposalModal').then(m => ({ default: m.EventProposalModal })), { ssr: false });
const BulkEventManager = nextDynamic(() => import('@/components/calendar/BulkEventManager').then(m => ({ default: m.BulkEventManager })), { ssr: false });
const TemplateLibrary = nextDynamic(() => import('@/components/calendar/TemplateLibrary').then(m => ({ default: m.TemplateLibrary })), { ssr: false });
const UnifiedItemPreviewModal = nextDynamic(() => import('@/components/calendar/UnifiedItemPreviewModal').then(m => ({ default: m.UnifiedItemPreviewModal })), { ssr: false });
const ConfirmDialog = nextDynamic(() => import('@/components/shared/ConfirmDialog').then(m => ({ default: m.ConfirmDialog })), { ssr: false });
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { useCalendarRealtime } from '@/lib/hooks/useCalendarRealtime';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { useCalendarShortcuts } from '@/lib/hooks/useCalendarShortcuts';
import { useCalendarGestures } from '@/lib/hooks/useCalendarGestures';
import { useFeatureAccessSafe } from '@/lib/contexts/subscription-context';
import { calendarService, CalendarEvent, CreateEventInput } from '@/lib/services/calendar-service';
import type { EventTemplate } from '@/lib/services/calendar-service';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, parseISO, addDays, subDays, addWeeks, subWeeks } from 'date-fns';

type ViewMode = 'day' | 'week' | 'month' | 'agenda' | 'timeline' | 'proposal' | 'list';

// Schema for validating localStorage calendar connection data
const CalendarConnectionSchema = z.object({
  id: z.string(),
  provider: z.string(),
  last_sync_at: z.string().nullable(),
});

const CalendarConnectionsArraySchema = z.array(CalendarConnectionSchema);

/**
 * Safely parse and validate localStorage data
 * Returns default value if parsing or validation fails
 */
function safeParseLocalStorage<T>(
  key: string,
  schema: z.ZodType<T>,
  defaultValue: T
): T {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return defaultValue;

    const parsed = JSON.parse(cached);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    // Validation failed - clear corrupted data and return default
    logger.warn(`Invalid localStorage data for key "${key}", clearing cache`, { component: 'page' });
    localStorage.removeItem(key);
    return defaultValue;
  } catch {
    // JSON parse error - clear corrupted data and return default
    logger.warn(`Failed to parse localStorage key "${key}", clearing cache`, { component: 'page' });
    localStorage.removeItem(key);
    return defaultValue;
  }
}

/**
 * Safely get a simple string value from localStorage with optional validation
 */
function safeGetLocalStorageString(
  key: string,
  validator?: (val: string) => boolean
): string | null {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;

    if (validator && !validator(value)) {
      logger.warn(`Invalid localStorage value for key "${key}", clearing cache`, { component: 'page' });
      localStorage.removeItem(key);
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

export default function CalendarPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const { hasAccess: canUseEventProposals, requestUpgrade: requestProposalUpgrade } = useFeatureAccessSafe('canUseEventProposals');
  const { isMobile } = useDevice();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isSearchTyping, setIsSearchTyping] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  type LinkedShoppingList = {
    id: string;
    title: string;
    items_count?: number;
  };

  const [linkedShoppingLists, setLinkedShoppingLists] = useState<Record<string, LinkedShoppingList>>({});
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<'quick-add' | 'templates' | 'propose' | 'new-event'>('new-event');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not-started' | 'in-progress' | 'completed'>('all');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, eventId: '' });
  const [isBulkManagerOpen, setIsBulkManagerOpen] = useState(false);
  const [viewModeLoaded, setViewModeLoaded] = useState(false); // Track if view mode has been loaded from localStorage

  // Phase 9: Unified calendar items state (tasks, meals, reminders alongside events)
  const [selectedUnifiedItem, setSelectedUnifiedItem] = useState<UnifiedCalendarItem | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Location state for weather display
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Calendar sync state - initialize from localStorage for instant display
  // Uses validated parsing to prevent corrupted/tampered data from causing issues
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasCalendarConnection, setHasCalendarConnection] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rowan_calendar_connected') === 'true';
    }
    return false;
  });
  // Store all active calendar connections (supports multiple providers)
  // Validated with Zod schema to ensure data structure integrity
  const [calendarConnections, setCalendarConnections] = useState<Array<{ id: string; provider: string; last_sync_at: string | null }>>(() => {
    if (typeof window !== 'undefined') {
      return safeParseLocalStorage(
        'rowan_calendar_connections',
        CalendarConnectionsArraySchema,
        []
      );
    }
    return [];
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      // Validate that the stored value is a valid date string
      return safeGetLocalStorageString(
        'rowan_calendar_last_sync',
        (val) => !isNaN(Date.parse(val))
      );
    }
    return null;
  });
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [syncTooltipVisible, setSyncTooltipVisible] = useState(false);

  // Ref for search input
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ref for gesture detection on calendar content
  const calendarContentRef = useRef<HTMLDivElement>(null);

  // Initialize realtime connection
  const { events: realtimeEvents, isConnected: realtimeConnected } = useCalendarRealtime(
    currentSpace?.id,
    user?.id
  );

  // Phase 9: Unified calendar hook - fetches tasks, meals, reminders for calendar display
  // Date range: from start of current month view to 3 months ahead
  const unifiedDateRange = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(addMonths(currentMonth, 2));
    return { start, end };
  }, [currentMonth]);

  const {
    items: unifiedItems,
    counts: unifiedCounts,
    filters: unifiedFilters,
    setFilters: setUnifiedFilters,
  } = useUnifiedCalendar({
    spaceId: currentSpace?.id || '',
    startDate: unifiedDateRange.start,
    endDate: unifiedDateRange.end,
    autoFetch: !!currentSpace?.id,
  });

  // Handler for clicking unified calendar items
  const handleUnifiedItemClick = useCallback((item: UnifiedCalendarItem) => {
    setSelectedUnifiedItem(item);
    // For events, open the edit modal
    if (item.itemType === 'event' && item.originalItem) {
      setEditingEvent(item.originalItem as CalendarEvent);
      setIsModalOpen(true);
    } else {
      // For tasks, meals, reminders, goals - open the preview modal
      setIsPreviewModalOpen(true);
    }
  }, []);

  // Memoize filtered events (consistent across all views)
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Apply status filter consistently across all views
    if (statusFilter !== 'all') {
      filtered = events.filter(e => e.status === statusFilter);
    }

    // Apply search filter (uses debounced value for performance)
    if (debouncedSearchQuery) {
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [events, debouncedSearchQuery, statusFilter]);

  // Memoize filtered unified items (tasks, meals, reminders, goals)
  const filteredUnifiedItems = useMemo(() => {
    if (statusFilter === 'all') {
      return unifiedItems;
    }

    // Map filter values to unified item status values
    // Status filter: 'not-started' | 'in-progress' | 'completed'
    // Unified item statuses vary by type:
    // - Tasks: 'pending', 'in-progress', 'completed', 'blocked', 'on-hold'
    // - Reminders: 'pending', 'completed', 'snoozed'
    // - Goals: 'not_started', 'in_progress', 'completed', 'cancelled'
    // - Meals: typically no status (always shown)

    return unifiedItems.filter(item => {
      const itemStatus = item.status?.toLowerCase();

      // Meals don't have status - show them in 'all' only, or treat as pending
      if (item.itemType === 'meal') {
        return statusFilter === 'not-started'; // Show meals as "pending" items
      }

      if (statusFilter === 'not-started') {
        return itemStatus === 'pending' || itemStatus === 'not_started' || itemStatus === 'not-started' || !itemStatus;
      }

      if (statusFilter === 'in-progress') {
        return itemStatus === 'in-progress' || itemStatus === 'in_progress' || itemStatus === 'active';
      }

      if (statusFilter === 'completed') {
        return itemStatus === 'completed' || itemStatus === 'done';
      }

      return true;
    });
  }, [unifiedItems, statusFilter]);

  // Create filtered unified items grouped by date
  const filteredUnifiedItemsByDate = useMemo(() => {
    const grouped = new Map<string, UnifiedCalendarItem[]>();
    for (const item of filteredUnifiedItems) {
      const dateKey = format(parseISO(item.startTime), 'yyyy-MM-dd');
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, item]);
    }
    return grouped;
  }, [filteredUnifiedItems]);

  // Get unified items for a specific date (respects status filter)
  const getUnifiedItemsForDate = useCallback((date: Date): UnifiedCalendarItem[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    // Use filtered items when status filter is active
    return filteredUnifiedItemsByDate.get(dateKey) || [];
  }, [filteredUnifiedItemsByDate]);

  // Memoize stats calculations - use filteredEvents to match current view
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: filteredEvents.length,
      today: filteredEvents.filter(e => {
        const eventDate = parseISO(e.start_time);
        return eventDate >= today && eventDate < new Date(today.getTime() + 86400000);
      }).length,
      thisWeek: filteredEvents.filter(e => {
        const eventDate = parseISO(e.start_time);
        return eventDate >= weekStart;
      }).length,
      thisMonth: filteredEvents.filter(e => {
        const eventDate = parseISO(e.start_time);
        return eventDate >= monthStart;
      }).length,
    };
  }, [filteredEvents]);

  // Memoize calendar days calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Memoize events by date for calendar view
  const eventsByDate = useMemo(() => {
    const eventsMap = new Map<string, CalendarEvent[]>();

    filteredEvents.forEach(event => {
      const eventDate = parseISO(event.start_time);
      const dateKey = format(eventDate, 'yyyy-MM-dd');

      if (!eventsMap.has(dateKey)) {
        eventsMap.set(dateKey, []);
      }
      eventsMap.get(dateKey)!.push(event);
    });

    return eventsMap;
  }, [filteredEvents]);

  // Memoize category colors lookup
  const getCategoryColor = useCallback((category: string) => {
    const colors = {
      work: { bg: 'bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-300', color: 'bg-blue-900 text-blue-100' },
      personal: { bg: 'bg-purple-900/30', border: 'border-purple-500', text: 'text-purple-300', color: 'bg-purple-900 text-purple-100' },
      family: { bg: 'bg-pink-900/30', border: 'border-pink-500', text: 'text-pink-300', color: 'bg-pink-900 text-pink-100' },
      health: { bg: 'bg-green-900/30', border: 'border-green-500', text: 'text-green-300', color: 'bg-green-900 text-green-100' },
      social: { bg: 'bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-300', color: 'bg-orange-900 text-orange-100' },
    };
    return colors[category as keyof typeof colors] || colors.personal;
  }, []);

  // Stable callback for loading events
  const loadEvents = useCallback(async () => {
    // Don't load data if user doesn't have a space yet
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use getEventsWithRecurring to expand recurring events into individual occurrences
      // This generates virtual event instances for each occurrence in the date range
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Include past month
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Include next 3 months

      const eventsData = await calendarService.getEventsWithRecurring(
        currentSpace.id,
        startDate,
        endDate
      );

      setEvents(eventsData as CalendarEvent[]);

      // Load linked shopping lists for all events
      // For recurring event occurrences, use the series_id (master event ID) to lookup shopping lists
      const linkedListsMap: Record<string, LinkedShoppingList> = {};
      const processedEventIds = new Set<string>();

      await Promise.all(
        eventsData.map(async (event) => {
          try {
            // For recurring occurrences, use series_id; for regular events, use id
            // Type assertion needed because recurring occurrences have extra properties
            const lookupId = ('series_id' in event ? (event as unknown as { series_id: string }).series_id : null) || event.id;

            // Skip if we've already processed this master event
            if (processedEventIds.has(lookupId)) {
              // Copy the shopping list reference for this occurrence
              if (linkedListsMap[lookupId]) {
                linkedListsMap[event.id] = linkedListsMap[lookupId];
              }
              return;
            }
            processedEventIds.add(lookupId);

            const linkedLists = await shoppingIntegrationService.getShoppingListsForEvent(lookupId);
            const validList = linkedLists?.find(list => list.id && list.title);
            if (validList && validList.id && validList.title) {
              const shoppingList: LinkedShoppingList = { id: validList.id, title: validList.title, items_count: validList.items_count };
              linkedListsMap[event.id] = shoppingList;
              linkedListsMap[lookupId] = shoppingList;
            }
          } catch (error) {
            logger.error('Failed to load shopping list for event ${event.id}:', error, { component: 'page', action: 'execution' });
          }
        })
      );
      setLinkedShoppingLists(linkedListsMap);

    } catch (error) {
      logger.error('Failed to load events:', error, { component: 'page', action: 'execution' });
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  // Stable callback for creating/updating events
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
      logger.error('Failed to save event:', error, { component: 'page', action: 'execution' });
      throw error; // Re-throw so modal can handle it
    }
  }, [editingEvent, loadEvents]);

  // Stable callback for deleting events
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    setConfirmDialog({ isOpen: true, eventId });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const eventId = confirmDialog.eventId;
    setConfirmDialog({ isOpen: false, eventId: '' });

    // Optimistic update - remove from UI immediately
    setEvents(prev => prev.filter(event => event.id !== eventId));

    try {
      await calendarService.deleteEvent(eventId);
    } catch (error) {
      logger.error('Failed to delete event:', error, { component: 'page', action: 'execution' });
      // Revert optimistic update on error
      loadEvents();
    }
  }, [confirmDialog, loadEvents]);

  // Stable callback for status changes
  const handleStatusChange = useCallback(async (eventId: string, status: 'not-started' | 'in-progress' | 'completed') => {
    // Optimistic update - update UI immediately
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId ? { ...event, status } : event
      )
    );

    // Update in background
    try {
      await calendarService.updateEventStatus(eventId, status);
    } catch (error) {
      logger.error('Failed to update event status:', error, { component: 'page', action: 'execution' });
      // Revert on error
      loadEvents();
    }
  }, [loadEvents]);

  // Stable callback for editing events
  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  }, []);

  // Stable callback for closing modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingEvent(null);
  }, []);

  // Stable callback for template selection
  const handleSelectTemplate = useCallback(async (template: EventTemplate) => {
    try {
      // Create event from template starting now (or could open modal to choose time)
      const startTime = new Date().toISOString();
      const event = await calendarService.createEventFromTemplate(template, startTime);

      // Reload events to show the new one
      loadEvents();

      // Optionally open the event in edit mode so user can adjust time
      setTimeout(() => {
        handleEditEvent(event);
      }, 100);
    } catch (error) {
      logger.error('Failed to create event from template:', error, { component: 'page', action: 'execution' });
      showError('Failed to create event from template');
    }
  }, [loadEvents, handleEditEvent]);

  // Stable callback for month navigation
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  // Stable callback for week navigation
  const handlePrevWeek = useCallback(() => {
    setCurrentMonth(prev => subWeeks(prev, 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentMonth(prev => addWeeks(prev, 1));
  }, []);

  // Stable callback for day navigation
  const handlePrevDay = useCallback(() => {
    setCurrentMonth(prev => subDays(prev, 1));
  }, []);

  const handleNextDay = useCallback(() => {
    setCurrentMonth(prev => addDays(prev, 1));
  }, []);

  const handleJumpToToday = useCallback(() => {
    setCurrentMonth(new Date());
  }, []);

  // Check for calendar connections - runs in background, caches to localStorage
  // Fetches all providers (Google, Apple, Cozi) and stores active connections
  const checkCalendarConnection = useCallback(async () => {
    if (!currentSpace) return;

    try {
      // Fetch connections from all providers in parallel
      const providers = ['google', 'apple'] as const; // Add 'cozi' when integrated
      const responses = await Promise.all(
        providers.map(provider =>
          fetch(`/api/calendar/connect/${provider}?space_id=${currentSpace.id}`)
            .then(res => res.ok ? res.json() : { connections: [] })
            .catch(() => ({ connections: [] }))
        )
      );

      // Collect all active connections across all providers
      const activeConnections: Array<{ id: string; provider: string; last_sync_at: string | null }> = [];
      let mostRecentSyncTime: string | null = null;

      responses.forEach((data, index) => {
        const provider = providers[index];
        const providerConnections = data.connections || [];

        providerConnections.forEach((c: { id: string; sync_status: string; last_sync_at: string | null }) => {
          if (c.sync_status === 'active' || c.sync_status === 'syncing') {
            activeConnections.push({
              id: c.id,
              provider,
              last_sync_at: c.last_sync_at,
            });

            // Track most recent sync time across all connections
            if (c.last_sync_at) {
              if (!mostRecentSyncTime || new Date(c.last_sync_at) > new Date(mostRecentSyncTime)) {
                mostRecentSyncTime = c.last_sync_at;
              }
            }
          }
        });
      });

      if (activeConnections.length > 0) {
        setHasCalendarConnection(true);
        setCalendarConnections(activeConnections);
        setLastSyncTime(mostRecentSyncTime);
        // Cache to localStorage for instant display on next visit
        localStorage.setItem('rowan_calendar_connected', 'true');
        localStorage.setItem('rowan_calendar_connections', JSON.stringify(activeConnections));
        if (mostRecentSyncTime) {
          localStorage.setItem('rowan_calendar_last_sync', mostRecentSyncTime);
        }
      } else {
        setHasCalendarConnection(false);
        setCalendarConnections([]);
        // Clear cache
        localStorage.removeItem('rowan_calendar_connected');
        localStorage.removeItem('rowan_calendar_connections');
        localStorage.removeItem('rowan_calendar_last_sync');
      }
    } catch (error) {
      logger.error('Failed to check calendar connections:', error, { component: 'page', action: 'execution' });
    } finally {
      setConnectionChecked(true);
    }
  }, [currentSpace]);

  // Sync all connected calendars (Google, Apple, etc.)
  const handleSyncCalendar = useCallback(async () => {
    if (calendarConnections.length === 0 || isSyncing) return;

    setIsSyncing(true);
    let totalEventsSynced = 0;
    let hasError = false;

    try {
      // Sync all connections in parallel for efficiency
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
            logger.info(`[${connection.provider}] Sync complete: ${data.events_synced} events processed`, { component: 'page' });
            return { success: true, events: data.events_synced || 0, provider: connection.provider };
          } else if (response.status === 429) {
            logger.info(`[${connection.provider}] Rate limited - please wait before syncing again`, { component: 'page' });
            return { success: false, events: 0, provider: connection.provider, rateLimited: true };
          } else {
            logger.error('[${connection.provider}] Sync failed:', undefined, { component: 'page', action: 'execution', details: data.error });
            return { success: false, events: 0, provider: connection.provider, error: data.error };
          }
        } catch (error) {
          logger.error('[${connection.provider}] Sync error:', error, { component: 'page', action: 'execution' });
          return { success: false, events: 0, provider: connection.provider, error };
        }
      });

      const results = await Promise.all(syncPromises);

      // Aggregate results
      results.forEach((result) => {
        if (result.success) {
          totalEventsSynced += result.events;
        } else {
          hasError = true;
        }
      });

      // If at least one sync succeeded, reload events and update sync time
      if (results.some(r => r.success)) {
        loadEvents();
        const syncTime = new Date().toISOString();
        setLastSyncTime(syncTime);
        localStorage.setItem('rowan_calendar_last_sync', syncTime);
        logger.info(`Total sync complete: ${totalEventsSynced} events across ${calendarConnections.length} calendar(s)`, { component: 'page' });
      }

      if (hasError) {
        logger.warn('Some calendars failed to sync - check individual provider logs above', { component: 'page' });
      }
    } catch (error) {
      logger.error('Sync error:', error, { component: 'page', action: 'execution' });
    } finally {
      setIsSyncing(false);
    }
  }, [calendarConnections, isSyncing, loadEvents]);

  // Helper to get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  }, [eventsByDate]);

  // Helper to cycle event status with auto-deletion on completion
  const handleEventStatusClick = useCallback((e: React.MouseEvent, eventId: string, currentStatus: 'not-started' | 'in-progress' | 'completed') => {
    e.stopPropagation(); // Prevent opening edit modal

    const states: Array<'not-started' | 'in-progress' | 'completed'> = ['not-started', 'in-progress', 'completed'];
    const currentIndex = states.indexOf(currentStatus);
    const nextStatus = states[(currentIndex + 1) % states.length];

    // If the next status would be 'completed', automatically delete the event instead
    if (nextStatus === 'completed') {
      // Optimistic update - remove from UI immediately
      setEvents(prev => prev.filter(event => event.id !== eventId));

      // Delete in background
      calendarService.deleteEvent(eventId).catch(error => {
        logger.error('Failed to auto-delete completed event:', error, { component: 'page', action: 'execution' });
        // Revert optimistic update on error
        loadEvents();
      });
    } else {
      // Normal status change
      handleStatusChange(eventId, nextStatus);
    }
  }, [handleStatusChange, loadEvents]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Check for calendar connections on mount
  useEffect(() => {
    checkCalendarConnection();
  }, [checkCalendarConnection]);

  // Merge realtime events with local events
  useEffect(() => {
    if (realtimeEvents.length > 0) {
      setEvents(prevEvents => {
        const eventMap = new Map(prevEvents.map(e => [e.id, e]));
        realtimeEvents.forEach(rtEvent => {
          eventMap.set(rtEvent.id, rtEvent);
        });
        return Array.from(eventMap.values());
      });
    }
  }, [realtimeEvents]);

  // Load saved view mode from localStorage on mount
  useEffect(() => {
    if (currentSpace?.id) {
      const savedViewMode = localStorage.getItem(`calendar-view-${currentSpace.id}`);
      if (savedViewMode && ['day', 'week', 'month', 'agenda', 'timeline', 'proposal', 'list'].includes(savedViewMode)) {
        setViewMode(savedViewMode as ViewMode);
      }
      setViewModeLoaded(true);
    }
  }, [currentSpace?.id]);

  // Save view mode to localStorage whenever it changes (only after initial load)
  useEffect(() => {
    if (currentSpace?.id && viewModeLoaded) {
      localStorage.setItem(`calendar-view-${currentSpace.id}`, viewMode);
    }
  }, [viewMode, currentSpace?.id, viewModeLoaded]);

  // Fetch user's location for weather display
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        setLocationLoading(true);
        const location = await geolocationService.getCurrentLocation();
        if (location) {
          const locationString = geolocationService.getLocationString(location);
          setUserLocation(locationString);
          logger.info('[Calendar] User location set:', { component: 'page', data: locationString });
        }
      } catch (error) {
        logger.error('[Calendar] Failed to get user location:', error, { component: 'page', action: 'execution' });
        // Set fallback location
        setUserLocation('Dallas, Texas, United States');
      } finally {
        setLocationLoading(false);
      }
    };

    fetchUserLocation();
  }, []); // Only run once on mount

  // Handler for viewing event details
  const handleViewDetails = useCallback((event: CalendarEvent) => {
    setDetailEvent(event);
  }, []);

  // Keyboard shortcuts
  useCalendarShortcuts({
    jumpToToday: handleJumpToToday,
    previousPeriod: handlePrevMonth,
    nextPeriod: handleNextMonth,
    switchToDay: () => setViewMode('day'),
    switchToWeek: () => setViewMode('week'),
    switchToMonth: () => setViewMode('month'),
    switchToAgenda: () => setViewMode('agenda'),
    switchToList: () => setViewMode('list'),
    newEvent: () => setIsModalOpen(true),
    quickAdd: () => setIsQuickAddOpen(true),
    focusSearch: () => searchInputRef.current?.focus(),
    closeModals: () => {
      setIsModalOpen(false);
      setDetailEvent(null);
      setIsProposalModalOpen(false);
      setIsQuickAddOpen(false);
    },
  });

  // Touch gestures for mobile navigation
  useCalendarGestures(calendarContentRef, {
    onSwipeLeft: () => {
      // Navigate to next period based on current view
      if (viewMode === 'week') {
        handleNextWeek();
      } else if (viewMode === 'month' || viewMode === 'timeline') {
        handleNextMonth();
      } else if (viewMode === 'day') {
        setCurrentMonth(prev => addDays(prev, 1));
      }
    },
    onSwipeRight: () => {
      // Navigate to previous period based on current view
      if (viewMode === 'week') {
        handlePrevWeek();
      } else if (viewMode === 'month' || viewMode === 'timeline') {
        handlePrevMonth();
      } else if (viewMode === 'day') {
        setCurrentMonth(prev => addDays(prev, -1));
      }
    },
    enabled: viewMode !== 'proposal' && viewMode !== 'list' && viewMode !== 'agenda',
  });

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]}>
      <PageErrorBoundary>
        <PullToRefresh onRefresh={loadEvents}>
        <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-calendar flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold bg-gradient-calendar bg-clip-text text-transparent">
                    Calendar
                  </h1>
                  {realtimeConnected && (
                    <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-900/30 border border-green-700 rounded-full">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] sm:text-xs font-medium text-green-300">Live</span>
                    </div>
                  )}
                </div>
                <p className="text-sm sm:text-base text-gray-400">
                  Shared events and schedules
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              {/* Segmented Toggle for Action Selection - 2x2 grid on mobile, single row on desktop */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-1 grid grid-cols-2 sm:flex sm:flex-row gap-0.5">
                <button
                  onClick={() => setActiveAction('quick-add')}
                  className={`px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1 sm:w-[95px] focus:outline-none ${
                    activeAction === 'quick-add'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span className="text-base">✨</span>
                  <span>Quick Add</span>
                </button>
                <button
                  onClick={() => setActiveAction('templates')}
                  className={`px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1 sm:w-[95px] focus:outline-none ${
                    activeAction === 'templates'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span className="text-base">📋</span>
                  <span>Templates</span>
                </button>
                <button
                  onClick={() => setActiveAction('propose')}
                  className={`px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1 sm:w-[115px] focus:outline-none ${
                    activeAction === 'propose'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Propose Event</span>
                </button>
                <button
                  onClick={() => setActiveAction('new-event')}
                  className={`px-2 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1 sm:w-[95px] focus:outline-none ${
                    activeAction === 'new-event'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>New Event</span>
                </button>
              </div>

              {/* Dynamic Action Button - Fixed size to accommodate longest text */}
              <button
                onClick={() => {
                  if (activeAction === 'quick-add') setIsQuickAddOpen(true);
                  else if (activeAction === 'templates') setIsTemplateLibraryOpen(true);
                  else if (activeAction === 'propose') setIsProposalModalOpen(true);
                  else setIsModalOpen(true);
                }}
                className="px-4 sm:px-4 py-2 sm:py-3 w-full sm:w-[165px] bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 focus:outline-none"
                title={
                  activeAction === 'quick-add' ? 'Quick add with natural language (Q)' :
                  activeAction === 'templates' ? 'Create from template' :
                  activeAction === 'propose' ? 'Propose event times' :
                  'Create a new event (N)'
                }
              >
                {activeAction === 'quick-add' ? <span className="text-lg">✨</span> :
                 activeAction === 'templates' ? <span className="text-lg">📋</span> :
                 activeAction === 'propose' ? <Users className="w-5 h-5" /> :
                 <Plus className="w-5 h-5" />}
                <span>
                  {activeAction === 'quick-add' ? 'Quick Add' :
                   activeAction === 'templates' ? 'Templates' :
                   activeAction === 'propose' ? 'Propose Event' :
                   'New Event'}
                </span>
              </button>
            </div>
          </div>

          {/* Stats Dashboard - Hidden on mobile */}
          <div className="hidden sm:block">
            {/* Stats cards - only visible on desktop */}
            <div className="stats-grid-mobile gap-4 sm:gap-6 grid">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Today</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.today}</p>
                {stats.today > 0 && (
                  <div className="flex items-center gap-1 text-blue-400">
                    <CalendarDays className="w-3 h-3" />
                    <span className="text-xs font-medium">Happening</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-400 font-medium text-xs sm:text-sm">This Week</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CalendarRange className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.thisWeek}</p>
                {stats.thisWeek > 0 && (
                  <div className="flex items-center gap-1 text-green-400">
                    <CalendarRange className="w-3 h-3" />
                    <span className="text-xs font-medium">Upcoming</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-400 font-medium text-xs sm:text-sm">This Month</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.thisMonth}</p>
                {stats.thisMonth > 0 && (
                  <div className="flex items-center gap-1 text-purple-400">
                    <CalendarClock className="w-3 h-3" />
                    <span className="text-xs font-medium">Planned</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Total Events</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-calendar rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <CalendarIcon className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>

          {/* Search Bar */}
          <div className={`apple-search-container calendar-search group ${isSearchTyping ? 'apple-search-typing' : ''}`}>
            <Search className="apple-search-icon" />
            <input
              ref={searchInputRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchTyping(true);
                setTimeout(() => setIsSearchTyping(false), 300);
              }}
              className="apple-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="apple-search-clear"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Events Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {viewMode === 'proposal' ? 'Event Proposals' : 'Event Calendar'}
                </h2>
                {viewMode !== 'proposal' && (
                  <span className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-full text-sm font-medium">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                )}
              </div>

              {/* View Mode Toggle and Today Button */}
              <div className="flex items-center gap-2">

                {/* Sync Button - Show if connected (from cache or API), hidden on mobile */}
                {hasCalendarConnection && (
                  <div className="relative hidden sm:block">
                    <button
                      onClick={handleSyncCalendar}
                      disabled={isSyncing || calendarConnections.length === 0}
                      onMouseEnter={() => setSyncTooltipVisible(true)}
                      onMouseLeave={() => setSyncTooltipVisible(false)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                        isSyncing || calendarConnections.length === 0
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </button>
                    {/* Instant tooltip - no delay */}
                    {syncTooltipVisible && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none">
                        <div className="bg-gray-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                          <div className="font-medium">
                            Sync with {calendarConnections.length === 1
                              ? `${calendarConnections[0].provider.charAt(0).toUpperCase() + calendarConnections[0].provider.slice(1)} Calendar`
                              : `${calendarConnections.length} Calendars`}
                          </div>
                          {calendarConnections.length > 1 && (
                            <div className="text-gray-300 mt-0.5">
                              {calendarConnections.map(c => c.provider.charAt(0).toUpperCase() + c.provider.slice(1)).join(', ')}
                            </div>
                          )}
                          {lastSyncTime && (
                            <div className="text-gray-300 mt-0.5">
                              Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
                            </div>
                          )}
                          {!connectionChecked && (
                            <div className="text-yellow-300 mt-0.5">Verifying connection...</div>
                          )}
                          {/* Tooltip arrow */}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-700 rotate-45" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Today Button - Only show for calendar views, hidden on mobile */}
                {viewMode !== 'proposal' && viewMode !== 'list' && (
                  <button
                    onClick={handleJumpToToday}
                    className="hidden sm:block px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                    title="Jump to today (T)"
                  >
                    Today
                  </button>
                )}

                {/* Manage Events Button - Hidden on mobile */}
                <button
                  onClick={() => setIsBulkManagerOpen(true)}
                  className="hidden sm:flex px-3 py-1.5 bg-gray-700 text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-600 transition-colors items-center gap-1.5"
                  title="Manage events (bulk delete, trash)"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Manage
                </button>

                {/* View Mode Toggle - Compact on mobile, full on desktop */}
                {/* Mobile: Show only 4 key views */}
                <div className="sm:hidden bg-gray-800 border border-purple-600 rounded-lg p-0.5 flex gap-0.5">
                  <button
                    onClick={() => setViewMode('day')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      viewMode === 'day'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400'
                    }`}
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      viewMode === 'week'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      viewMode === 'month'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setViewMode('agenda')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      viewMode === 'agenda'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400'
                    }`}
                  >
                    List
                  </button>
                </div>
                {/* Desktop: Full view mode toggle */}
                <div className="hidden sm:flex bg-gray-800 border border-purple-600 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => setViewMode('day')}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                      viewMode === 'day'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`}
                    title="Day View (D)"
                  >
                    Day
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                      viewMode === 'week'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`}
                    title="Week View (W)"
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                      viewMode === 'month'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`}
                    title="Month View (M)"
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setViewMode('agenda')}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                      viewMode === 'agenda'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`}
                    title="Agenda View (A)"
                  >
                    Agenda
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                      viewMode === 'list'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`}
                    title="List View (L)"
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                      viewMode === 'timeline'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`}
                    title="Timeline View"
                  >
                    Timeline
                  </button>
                  <button
                    onClick={() => {
                      if (canUseEventProposals) {
                        setViewMode('proposal');
                      } else {
                        requestProposalUpgrade();
                      }
                    }}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 whitespace-nowrap ${
                      viewMode === 'proposal'
                        ? 'bg-purple-600 text-white'
                        : canUseEventProposals
                          ? 'text-gray-400 hover:bg-gray-700'
                          : 'text-gray-500 hover:bg-gray-800'
                    }`}
                    title={canUseEventProposals ? "Proposal View (P)" : "Upgrade to Pro to use Event Proposals"}
                  >
                    Proposal {!canUseEventProposals && '🔒'}
                  </button>
                </div>

                {/* Status Filter - Available for all views except proposal */}
                {viewMode !== 'proposal' && (
                  <>
                    {/* Mobile: dropdown filter */}
                    <div className="sm:hidden">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'not-started' | 'in-progress' | 'completed')}
                        className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="all">All Status</option>
                        <option value="not-started">Pending</option>
                        <option value="in-progress">Active</option>
                        <option value="completed">Done</option>
                      </select>
                    </div>
                    {/* Desktop: button row filter */}
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">Filter:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setStatusFilter('all')}
                          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                            statusFilter === 'all'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setStatusFilter('not-started')}
                          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                            statusFilter === 'not-started'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          Pending
                        </button>
                        <button
                          onClick={() => setStatusFilter('in-progress')}
                          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                            statusFilter === 'in-progress'
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          Active
                        </button>
                        <button
                          onClick={() => setStatusFilter('completed')}
                          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                            statusFilter === 'completed'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Phase 9: Unified Calendar Filters - Toggle visibility of tasks, meals, reminders */}
            {/* Show on Calendar filters - hidden on mobile for cleaner view */}
            {viewMode !== 'proposal' && (
              <div className="hidden sm:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-300">Show on Calendar:</span>
                  <UnifiedCalendarLegendCompact className="ml-2" />
                </div>
                <UnifiedCalendarFilters
                  filters={unifiedFilters}
                  onFilterChange={setUnifiedFilters}
                  counts={unifiedCounts}
                  compact={true}
                />
              </div>
            )}

            {/* Calendar Content with Sidebar */}
            <div className="flex gap-6">
              {/* Mini-Calendar Sidebar - Always visible for consistent navigation */}
              <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
                {!loading && (
                  <MiniCalendar
                    currentDate={currentMonth}
                    onDateSelect={(date) => {
                      setCurrentMonth(date);
                      setViewMode('day');
                    }}
                    events={events}
                  />
                )}

                {/* Weather Display - Below mini calendar, always visible to prevent UI shifting */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="text-base">🌤️</span>
                    Your Weather
                  </h3>

                  {locationLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-500 border-t-transparent"></div>
                      Getting your location...
                    </div>
                  ) : userLocation ? (
                    <>
                      <WeatherBadge
                        eventTime={new Date().toISOString()}
                        location={userLocation}
                        display="medium"
                      />
                      <div className="mt-2 text-xs text-gray-400">
                        {userLocation.split(',')[0]} • Today&apos;s weather
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 py-2">
                      Unable to get location
                    </div>
                  )}
                </div>
              </div>

              {/* Main Calendar Content */}
              <div ref={calendarContentRef} className="flex-1 min-w-0 min-h-[600px] touch-pan-y">
              {loading ? (
                <div>
                  {/* Month header skeleton */}
                  <div className="flex items-center justify-center mb-4 sm:mb-6">
                    <div className="w-6 h-6 bg-gray-700 rounded animate-pulse" />
                    <div className="w-32 h-6 bg-gray-700 rounded mx-6 animate-pulse" />
                    <div className="w-6 h-6 bg-gray-700 rounded animate-pulse" />
                  </div>

                  {/* Calendar Grid Skeleton */}
                  <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
                    {/* Day headers - matches real calendar */}
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <div key={idx} className="sm:hidden text-center text-[10px] font-semibold text-gray-400 py-1">
                        {day}
                      </div>
                    ))}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="hidden sm:block text-center text-sm font-medium text-gray-400 py-2">
                        {day}
                      </div>
                    ))}

                    {/* Calendar day skeletons - matching actual cell sizes */}
                    {Array.from({ length: 35 }, (_, index) => (
                      <div
                        key={index}
                        className="min-h-[44px] sm:min-h-[120px] p-1 sm:p-2 rounded-md sm:rounded-lg border border-gray-700 bg-gray-800/50"
                      >
                        {/* Day number skeleton */}
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-700 rounded animate-pulse mx-auto sm:mx-0" />
                        {/* Event dots on mobile */}
                        <div className="sm:hidden flex gap-0.5 justify-center mt-1">
                          {index % 3 === 0 && <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse" />}
                          {index % 4 === 0 && <div className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse" />}
                        </div>
                        {/* Event placeholders on desktop */}
                        <div className="hidden sm:block mt-2 space-y-1">
                          {index % 3 === 0 && <div className="h-4 bg-gray-700 rounded animate-pulse" />}
                          {index % 4 === 0 && <div className="h-4 bg-gray-700 rounded animate-pulse" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : viewMode === 'month' ? (
                /* Calendar View */
                <div>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-center mb-4 sm:mb-6">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
                      title="Previous month (←)"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Previous month (←)
                      </span>
                    </button>
                    <h3 className="text-base sm:text-lg font-semibold text-white mx-6">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
                      title="Next month (→)"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Next month (→)
                      </span>
                    </button>
                  </div>

                  {/* Calendar Grid - Fits on mobile without scrolling */}
                  <div>
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
                    {/* Day headers - Single letters on mobile, full on desktop */}
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <div key={idx} className="sm:hidden text-center text-[10px] font-semibold text-gray-400 py-1">
                        {day}
                      </div>
                    ))}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="hidden sm:block text-center text-sm font-medium text-gray-400 py-2">
                        {day}
                      </div>
                    ))}

                    {/* Calendar days */}
                    {calendarDays.map((day, index) => {
                      const dayEvents = getEventsForDate(day);
                      // Phase 9: Get unified items (tasks, meals, reminders) for this day
                      const dayUnifiedItems = getUnifiedItemsForDate(day).filter(item => item.itemType !== 'event');
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isToday = isSameDay(day, new Date());
                      // Calculate total items for "more" indicator
                      const totalItems = dayEvents.length + dayUnifiedItems.length;

                      return (
                        <div
                          key={index}
                          onClick={() => {
                            // On mobile, tap day to view events
                            if (totalItems > 0 && isMobile) {
                              setCurrentMonth(day);
                              setViewMode('day');
                            }
                          }}
                          className={`min-h-[44px] sm:min-h-[120px] p-1 sm:p-2 rounded-md sm:rounded-lg border transition-all cursor-pointer sm:cursor-default ${
                            isCurrentMonth
                              ? 'border-gray-700 bg-gray-800'
                              : 'border-gray-800 bg-gray-900/50'
                          } ${isToday ? 'ring-2 ring-purple-500 bg-purple-900/20' : ''}`}
                        >
                          {/* Mobile: Compact day number with event dots */}
                          <div className="sm:hidden flex flex-col items-center justify-center h-full">
                            <span className={`text-sm font-semibold ${
                              isCurrentMonth
                                ? isToday
                                  ? 'text-purple-400'
                                  : 'text-white'
                                : 'text-gray-600'
                            }`}>
                              {format(day, 'd')}
                            </span>
                            {/* Event indicator dots */}
                            {totalItems > 0 && (
                              <div className="flex gap-0.5 mt-0.5">
                                {dayEvents.slice(0, 3).map((event, i) => (
                                  <div
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      event.status === 'completed' ? 'bg-green-500' :
                                      event.status === 'in-progress' ? 'bg-amber-500' : 'bg-purple-500'
                                    }`}
                                  />
                                ))}
                                {totalItems > 3 && (
                                  <span className="text-[8px] text-gray-500 ml-0.5">+{totalItems - 3}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Desktop: Full day view with event cards */}
                          <div className="hidden sm:block">
                            <div className={`text-sm font-medium mb-2 ${
                              isCurrentMonth
                                ? isToday
                                  ? 'text-purple-400'
                                  : 'text-white'
                                : 'text-gray-600'
                            }`}>
                              {format(day, 'd')}
                            </div>

                            <div className="space-y-1">
                              {dayEvents.slice(0, 2).map((event) => {
                                const categoryColor = getCategoryColor(event.category);
                                const categoryConfig = {
                                  work: { icon: '💼', label: 'Work' },
                                  personal: { icon: '👤', label: 'Personal' },
                                  family: { icon: '👨‍👩‍👧‍👦', label: 'Family' },
                                  health: { icon: '💪', label: 'Health' },
                                  social: { icon: '🎉', label: 'Social' },
                                };
                                const category = categoryConfig[event.category as keyof typeof categoryConfig] || categoryConfig.personal;

                                return (
                                  <div
                                    key={event.id}
                                    className={`w-full flex items-center gap-1 px-2 py-1 rounded text-xs ${categoryColor.bg} border-l-2 ${categoryColor.border}`}
                                  >
                                    {/* Status checkbox */}
                                    <button
                                      onClick={(e) => handleEventStatusClick(e, event.id, event.status)}
                                      className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                        event.status === 'completed'
                                          ? 'bg-green-500 border-green-500'
                                          : event.status === 'in-progress'
                                          ? 'bg-amber-500 border-amber-500'
                                          : 'bg-transparent border-red-500'
                                      }`}
                                      aria-label={`Toggle status: ${event.status}`}
                                    >
                                      {event.status === 'completed' && <Check className="w-2.5 h-2.5 text-white" />}
                                      {event.status === 'in-progress' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </button>

                                    {/* Event details - clickable to edit */}
                                    <button
                                      onClick={() => handleEditEvent(event)}
                                      className="flex-1 text-left hover:opacity-80 transition-opacity min-w-0"
                                    >
                                      <p className={`font-medium ${categoryColor.text} truncate`}>
                                        {event.title}
                                      </p>
                                      <div className="flex items-center gap-1 text-[10px]">
                                        <span className="text-gray-400">
                                          {format(parseISO(event.start_time), 'h:mm a')}
                                        </span>
                                        <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${categoryColor.bg} ${categoryColor.text}`}>
                                          {category.icon} {category.label}
                                        </span>
                                      </div>
                                    </button>
                                  </div>
                              );
                            })}
                            {/* Phase 9: Show unified items (tasks, meals, reminders) */}
                            {dayEvents.length < 2 && dayUnifiedItems.slice(0, 2 - dayEvents.length).map((item) => (
                              <UnifiedCalendarItemCard
                                key={item.id}
                                item={item}
                                compact={true}
                                onClick={handleUnifiedItemClick}
                              />
                            ))}
                            {/* Show "more" indicator if there are more items than displayed */}
                            {totalItems > 2 && (
                              <p className="text-[10px] text-gray-400 text-center">
                                +{totalItems - 2} more
                              </p>
                            )}
                            {totalItems === 0 && isCurrentMonth && (
                              <button
                                onClick={() => setIsModalOpen(true)}
                                className="hidden sm:block w-full text-center py-1.5 px-2 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors duration-200"
                                title="Create new event"
                              >
                                Add Event
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              ) : viewMode === 'week' ? (
                /* Enhanced Week View with Hourly Breakdown */
                <div>
                  {/* Week Navigation */}
                  <div className="flex items-center justify-center mb-4 sm:mb-6">
                    <button
                      onClick={handlePrevWeek}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
                      title="Previous week (←)"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Previous week (←)
                      </span>
                    </button>
                    <h3 className="text-base sm:text-lg font-semibold text-white mx-6">
                      Week of {format(startOfWeek(currentMonth, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                    </h3>
                    <button
                      onClick={handleNextWeek}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
                      title="Next week (→)"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Next week (→)
                      </span>
                    </button>
                  </div>

                  {/* Enhanced Week View Component */}
                  <EnhancedWeekView
                    date={currentMonth}
                    events={events}
                    onEventStatusClick={handleEventStatusClick}
                    onViewDetails={handleViewDetails}
                    onEditEvent={handleEditEvent}
                    getCategoryColor={getCategoryColor}
                  />
                </div>
              ) : viewMode === 'day' ? (
                /* Enhanced Day View with Hourly Breakdown */
                <div>
                  {/* Day Navigation */}
                  <div className="flex items-center justify-center mb-4 sm:mb-6">
                    <button
                      onClick={handlePrevDay}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
                      title="Previous day (←)"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Previous day (←)
                      </span>
                    </button>
                    <h3 className="text-base sm:text-lg font-semibold text-white mx-6">
                      {format(currentMonth, 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <button
                      onClick={handleNextDay}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
                      title="Next day (→)"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Next day (→)
                      </span>
                    </button>
                  </div>

                  {/* Enhanced Day View Component */}
                  <EnhancedDayView
                    date={currentMonth}
                    events={events}
                    onEventStatusClick={handleEventStatusClick}
                    onViewDetails={handleViewDetails}
                    onEditEvent={handleEditEvent}
                    getCategoryColor={getCategoryColor}
                  />
                </div>
              ) : viewMode === 'agenda' ? (
                /* Agenda View - Chronological list grouped by date */
                <div>
                  {/* Agenda Header */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white">
                      Upcoming Events
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Showing events from today onwards in chronological order
                    </p>
                  </div>

                  {/* Agenda List */}
                  {(() => {
                    // Get events from today onwards (including events happening today)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Start of today
                    const upcomingEvents = filteredEvents
                      .filter(e => parseISO(e.start_time) >= today)
                      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

                    if (upcomingEvents.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <CalendarClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-400 text-lg mb-2">No upcoming events</p>
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
                          >
                            <Plus className="w-5 h-5" />
                            Create Event
                          </button>
                          <AIContextualHint
                            featureKey="calendar"
                            prompt="Schedule a dentist appointment for Friday at 2pm"
                          />
                        </div>
                      );
                    }

                    // Group events by date
                    const eventsByDate = new Map<string, typeof upcomingEvents>();
                    upcomingEvents.forEach(event => {
                      const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
                      if (!eventsByDate.has(dateKey)) {
                        eventsByDate.set(dateKey, []);
                      }
                      eventsByDate.get(dateKey)!.push(event);
                    });

                    return (
                      <div className="space-y-6">
                        {Array.from(eventsByDate.entries()).map(([dateKey, events]) => {
                          const date = parseISO(events[0].start_time);
                          const isToday = isSameDay(date, new Date());
                          const isTomorrow = isSameDay(date, addDays(new Date(), 1));

                          let dateLabel = format(date, 'EEEE, MMMM d, yyyy');
                          if (isToday) dateLabel = `Today, ${format(date, 'MMMM d')}`;
                          if (isTomorrow) dateLabel = `Tomorrow, ${format(date, 'MMMM d')}`;

                          return (
                            <div key={dateKey} className="space-y-3">
                              <div className={`sticky top-0 z-10 py-2 px-4 rounded-lg ${
                                isToday
                                  ? 'bg-purple-900/30 border border-purple-700'
                                  : 'bg-gray-700'
                              }`}>
                                <h4 className={`text-sm font-bold ${
                                  isToday
                                    ? 'text-purple-300'
                                    : 'text-gray-300'
                                }`}>
                                  {dateLabel}
                                </h4>
                              </div>

                              {events.map(event => {
                                const categoryColor = getCategoryColor(event.category);
                                const categoryConfig = {
                                  work: { icon: '💼', label: 'Work' },
                                  personal: { icon: '👤', label: 'Personal' },
                                  family: { icon: '👨‍👩‍👧‍👦', label: 'Family' },
                                  health: { icon: '💪', label: 'Health' },
                                  social: { icon: '🎉', label: 'Social' },
                                };
                                const category = categoryConfig[event.category as keyof typeof categoryConfig] || categoryConfig.personal;

                                return (
                                  <div
                                    key={event.id}
                                    className={`p-4 rounded-lg border-l-4 ${categoryColor.border} bg-gray-800 hover:shadow-md transition-shadow`}
                                  >
                                    <div className="flex items-start gap-4">
                                      <div className="flex-shrink-0 text-center min-w-[60px]">
                                        <div className="text-2xl font-bold text-white">
                                          {format(parseISO(event.start_time), 'h:mm')}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {format(parseISO(event.start_time), 'a')}
                                        </div>
                                      </div>

                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                          <h4 className="text-lg font-semibold text-white">
                                            {event.title}
                                          </h4>
                                          {/* Mobile: Simple text, Desktop: Pill badge */}
                                          <span className="text-xs font-medium text-gray-400 sm:hidden">
                                            {category.icon} {category.label}
                                          </span>
                                          <span className={`hidden sm:inline px-2 py-1 rounded text-xs font-medium ${categoryColor.color}`}>
                                            {category.icon} {category.label}
                                          </span>
                                        </div>
                                        {event.description && (
                                          <p className="text-sm text-gray-400 mb-2">
                                            {event.description}
                                          </p>
                                        )}
                                        {event.location && (
                                          <>
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                              <MapPin className="w-4 h-4" />
                                              {event.location}
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleViewDetails(event)}
                                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                          title="View Details"
                                        >
                                          <Eye className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <button
                                          onClick={() => handleEditEvent(event)}
                                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                          title="Edit Event"
                                        >
                                          <Edit className="w-4 h-4 text-gray-400" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : viewMode === 'timeline' ? (
                /* Timeline View - Horizontal scrollable timeline */
                <div>
                  {/* Timeline Navigation */}
                  <div className="flex items-center justify-center mb-4 sm:mb-6">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
                      title="Previous month (←)"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Previous month (←)
                      </span>
                    </button>
                    <h3 className="text-base sm:text-lg font-semibold text-white mx-6">
                      {format(startOfMonth(currentMonth), 'MMMM yyyy')} Timeline
                    </h3>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
                      title="Next month (→)"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Next month (→)
                      </span>
                    </button>
                  </div>

                  {/* Timeline Grid */}
                  <div className="relative">
                    {/* Horizontal scrollable container */}
                    <div className="overflow-x-auto pb-4">
                      <div className="inline-flex gap-2 min-w-full">
                        {eachDayOfInterval({
                          start: startOfMonth(currentMonth),
                          end: endOfMonth(currentMonth)
                        }).map((day) => {
                          const dayEvents = getEventsForDate(day);
                          const isToday = isSameDay(day, new Date());
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                          return (
                            <div
                              key={day.toISOString()}
                              className={`flex-shrink-0 w-32 border rounded-lg overflow-hidden ${
                                isToday
                                  ? 'border-purple-500 bg-purple-900/20'
                                  : isWeekend
                                  ? 'border-gray-600 bg-gray-700/50'
                                  : 'border-gray-700 bg-gray-800'
                              }`}
                            >
                              {/* Date header */}
                              <div className={`p-2 text-center border-b ${
                                isToday
                                  ? 'border-purple-700 bg-purple-900/30'
                                  : isWeekend
                                  ? 'border-gray-600'
                                  : 'border-gray-700'
                              }`}>
                                <div className={`text-xs font-medium ${
                                  isToday
                                    ? 'text-purple-300'
                                    : 'text-gray-400'
                                }`}>
                                  {format(day, 'EEE')}
                                </div>
                                <div className={`text-lg font-bold ${
                                  isToday
                                    ? 'text-purple-300'
                                    : 'text-white'
                                }`}>
                                  {format(day, 'd')}
                                </div>
                              </div>

                              {/* Events for this day */}
                              <div className="p-2 space-y-1 min-h-[200px]">
                                {dayEvents.length > 0 ? (
                                  dayEvents.map((event) => {
                                    const categoryColor = getCategoryColor(event.category);
                                    return (
                                      <button
                                        key={event.id}
                                        onClick={() => handleEditEvent(event)}
                                        className={`w-full text-left p-2 rounded text-xs ${categoryColor.bg} border-l-2 ${categoryColor.border} hover:opacity-80 transition-opacity`}
                                      >
                                        <div className={`font-medium ${categoryColor.text} text-[10px] mb-0.5`}>
                                          {format(parseISO(event.start_time), 'h:mm a')}
                                        </div>
                                        <div className={`font-semibold ${categoryColor.text} line-clamp-2 text-xs`}>
                                          {event.title}
                                        </div>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="text-center py-4 text-[10px] text-gray-400">
                                    No events
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Scroll hint */}
                    <div className="text-center mt-2 text-xs text-gray-400">
                      ← Scroll horizontally to see all days →
                    </div>
                  </div>
                </div>
              ) : viewMode === 'list' ? (
                /* List View - All events with status filtering */
                <div>
                  {/* List Header */}
                  <div className="mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          All Events
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {statusFilter === 'all' ? 'Showing all events' :
                           statusFilter === 'not-started' ? 'Showing not started events' :
                           statusFilter === 'in-progress' ? 'Showing in-progress events' :
                           'Showing completed events'}
                        </p>
                      </div>

                      {/* Status Filter - Inside List View */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label htmlFor="status-filter-mobile" className="text-sm font-medium text-gray-300 sm:hidden">
                          Filter by status:
                        </label>
                        <span className="hidden sm:inline text-sm font-medium text-gray-300 mr-2">Filter:</span>

                        {/* Mobile: Dropdown Select */}
                        <select
                          id="status-filter-mobile"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'not-started' | 'in-progress' | 'completed')}
                          className="sm:hidden w-full px-3 py-2 text-sm bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white font-medium appearance-none cursor-pointer"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                        >
                          <option value="all">All Events</option>
                          <option value="not-started">Not Started</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        {/* Desktop: Button Filters */}
                        <div className="hidden sm:flex gap-1">
                          <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                              statusFilter === 'all'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setStatusFilter('not-started')}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                              statusFilter === 'not-started'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            Not Started
                          </button>
                          <button
                            onClick={() => setStatusFilter('in-progress')}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                              statusFilter === 'in-progress'
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            In Progress
                          </button>
                          <button
                            onClick={() => setStatusFilter('completed')}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                              statusFilter === 'completed'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            Completed
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Event List */}
                  {filteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                        <CalendarIcon className="w-8 h-8 text-purple-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {statusFilter === 'all' ? 'Your calendar is wide open!' : `No ${statusFilter} events`}
                      </h3>
                      <p className="text-sm text-gray-400 max-w-sm mb-6">
                        {statusFilter === 'all'
                          ? 'Add your first event to start planning ahead.'
                          : 'Try switching filters to see other events.'}
                      </p>
                      {statusFilter === 'all' && (
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="px-5 py-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors inline-flex items-center gap-2 text-sm font-medium shadow-lg shadow-purple-600/20"
                        >
                          <Plus className="w-5 h-5" />
                          Add Event
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredEvents
                        .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
                        .map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onStatusChange={handleStatusChange}
                            onEdit={handleEditEvent}
                            onDelete={handleDeleteEvent}
                            onViewDetails={handleViewDetails}
                            linkedShoppingList={linkedShoppingLists[event.id]}
                          />
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Proposal View */
                currentSpace && (
                  <ProposalsList
                    spaceId={currentSpace.id}
                    onCreateProposal={() => setIsProposalModalOpen(true)}
                  />
                )
              )}
            </div>
            {/* End Main Calendar Content */}
            </div>
            {/* End Calendar Content with Sidebar */}
          </div>
        </div>
      </div>
      </PullToRefresh>
      </PageErrorBoundary>

      {/* New/Edit Event Modal */}
      {currentSpace && (
        <NewEventModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleCreateEvent}
          onDelete={handleDeleteEvent}
          editEvent={editingEvent}
          spaceId={currentSpace.id}
        />
      )}

      {/* Event Detail Modal */}
      {detailEvent && (
        <EventDetailModal
          isOpen={!!detailEvent}
          onClose={() => setDetailEvent(null)}
          event={detailEvent}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* Unified Item Preview Modal (for tasks, meals, reminders, goals) */}
      {selectedUnifiedItem && selectedUnifiedItem.itemType !== 'event' && (
        <UnifiedItemPreviewModal
          item={selectedUnifiedItem}
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setSelectedUnifiedItem(null);
          }}
        />
      )}

      {/* Event Proposal Modal - Only rendered for Pro+ users */}
      {currentSpace && canUseEventProposals && (
        <EventProposalModal
          isOpen={isProposalModalOpen}
          onClose={() => setIsProposalModalOpen(false)}
          spaceId={currentSpace.id}
          onProposalCreated={() => {
            setIsProposalModalOpen(false);
            loadEvents();
          }}
        />
      )}

      {/* Quick Add Event Modal */}
      {currentSpace && (
        <QuickAddEvent
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onCreateEvent={handleCreateEvent}
          spaceId={currentSpace.id}
        />
      )}

      {/* Template Library Modal */}
      {currentSpace && (
        <TemplateLibrary
          isOpen={isTemplateLibraryOpen}
          onClose={() => setIsTemplateLibraryOpen(false)}
          spaceId={currentSpace.id}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {/* Bulk Event Manager Modal */}
      {currentSpace && (
        <BulkEventManager
          isOpen={isBulkManagerOpen}
          onClose={() => setIsBulkManagerOpen(false)}
          spaceId={currentSpace.id}
          events={events}
          onEventsDeleted={loadEvents}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, eventId: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </FeatureLayout>
  );
}
