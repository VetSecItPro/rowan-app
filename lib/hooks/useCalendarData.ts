'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { useCalendarRealtime } from '@/lib/hooks/useCalendarRealtime';
import { useUnifiedCalendar } from '@/lib/hooks/useUnifiedCalendar';
import { useFeatureAccessSafe } from '@/lib/contexts/subscription-context';
import { useDevice } from '@/lib/contexts/DeviceContext';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { calendarService, CalendarEvent } from '@/lib/services/calendar-service';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { geolocationService } from '@/lib/services/geolocation-service';
import type { UnifiedCalendarItem, UnifiedCalendarFilters } from '@/lib/types/unified-calendar-item';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViewMode = 'day' | 'week' | 'month' | 'agenda' | 'timeline' | 'proposal' | 'list';

export type LinkedShoppingList = {
  id: string;
  title: string;
  items_count?: number;
};

export interface CalendarStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface CalendarSyncState {
  isSyncing: boolean;
  hasCalendarConnection: boolean;
  calendarConnections: Array<{ id: string; provider: string; last_sync_at: string | null }>;
  lastSyncTime: string | null;
  connectionChecked: boolean;
  syncTooltipVisible: boolean;
  setSyncTooltipVisible: (visible: boolean) => void;
}

export interface CalendarDataReturn {
  // Auth / context
  currentSpace: ReturnType<typeof useAuthWithSpaces>['currentSpace'];
  user: ReturnType<typeof useAuthWithSpaces>['user'];
  isMobile: boolean;
  canUseEventProposals: boolean;
  requestProposalUpgrade: () => void;

  // Core event data
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  loading: boolean;
  linkedShoppingLists: Record<string, LinkedShoppingList>;

  // Filtered / computed
  filteredEvents: CalendarEvent[];
  filteredUnifiedItems: UnifiedCalendarItem[];
  filteredUnifiedItemsByDate: Map<string, UnifiedCalendarItem[]>;
  stats: CalendarStats;
  calendarDays: Date[];
  eventsByDate: Map<string, CalendarEvent[]>;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getUnifiedItemsForDate: (date: Date) => UnifiedCalendarItem[];
  getCategoryColor: (category: string) => {
    bg: string;
    border: string;
    text: string;
    color: string;
  };

  // View state
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  viewModeLoaded: boolean;
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;

  // Search state
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  isSearchTyping: boolean;
  setIsSearchTyping: React.Dispatch<React.SetStateAction<boolean>>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;

  // Status filter
  statusFilter: 'all' | 'not-started' | 'in-progress' | 'completed';
  setStatusFilter: React.Dispatch<React.SetStateAction<'all' | 'not-started' | 'in-progress' | 'completed'>>;

  // Active action
  activeAction: 'quick-add' | 'templates' | 'propose' | 'new-event';
  setActiveAction: React.Dispatch<React.SetStateAction<'quick-add' | 'templates' | 'propose' | 'new-event'>>;

  // Unified calendar (Phase 9)
  unifiedItems: UnifiedCalendarItem[];
  unifiedCounts: Record<string, number>;
  unifiedFilters: UnifiedCalendarFilters;
  setUnifiedFilters: (filters: UnifiedCalendarFilters) => void;

  // Realtime
  realtimeConnected: boolean;

  // Location / weather
  userLocation: string | null;
  locationLoading: boolean;

  // Calendar sync
  syncState: CalendarSyncState;

  // Refs
  calendarContentRef: React.RefObject<HTMLDivElement | null>;

  // Data fetching
  loadEvents: () => Promise<void>;
  checkCalendarConnection: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers (same as calendar page)
// ---------------------------------------------------------------------------

const CalendarConnectionSchema = z.object({
  id: z.string(),
  provider: z.string(),
  last_sync_at: z.string().nullable(),
});

const CalendarConnectionsArraySchema = z.array(CalendarConnectionSchema);

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

    logger.warn(`Invalid localStorage data for key "${key}", clearing cache`, { component: 'useCalendarData' });
    localStorage.removeItem(key);
    return defaultValue;
  } catch {
    logger.warn(`Failed to parse localStorage key "${key}", clearing cache`, { component: 'useCalendarData' });
    localStorage.removeItem(key);
    return defaultValue;
  }
}

function safeGetLocalStorageString(
  key: string,
  validator?: (val: string) => boolean
): string | null {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;

    if (validator && !validator(value)) {
      logger.warn(`Invalid localStorage value for key "${key}", clearing cache`, { component: 'useCalendarData' });
      localStorage.removeItem(key);
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Provides calendar event data, date navigation, and event proposal state */
export function useCalendarData(): CalendarDataReturn {
  const { currentSpace, user } = useAuthWithSpaces();
  const { hasAccess: canUseEventProposals, requestUpgrade: requestProposalUpgrade } = useFeatureAccessSafe('canUseEventProposals');
  const { isMobile } = useDevice();

  // Core state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedShoppingLists, setLinkedShoppingLists] = useState<Record<string, LinkedShoppingList>>({});

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [viewModeLoaded, setViewModeLoaded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isSearchTyping, setIsSearchTyping] = useState(false);

  // Status / action state
  const [statusFilter, setStatusFilter] = useState<'all' | 'not-started' | 'in-progress' | 'completed'>('all');
  const [activeAction, setActiveAction] = useState<'quick-add' | 'templates' | 'propose' | 'new-event'>('new-event');

  // Location state
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Calendar sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasCalendarConnection, setHasCalendarConnection] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rowan_calendar_connected') === 'true';
    }
    return false;
  });
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
      return safeGetLocalStorageString(
        'rowan_calendar_last_sync',
        (val) => !isNaN(Date.parse(val))
      );
    }
    return null;
  });
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [syncTooltipVisible, setSyncTooltipVisible] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const calendarContentRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Realtime
  // ---------------------------------------------------------------------------

  const { events: realtimeEvents, isConnected: realtimeConnected } = useCalendarRealtime(
    currentSpace?.id,
    user?.id
  );

  // ---------------------------------------------------------------------------
  // Unified calendar (Phase 9)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadEvents = useCallback(async () => {
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const eventsData = await calendarService.getEventsWithRecurring(
        currentSpace.id,
        startDate,
        endDate
      );

      setEvents(eventsData as CalendarEvent[]);

      // Load linked shopping lists
      const linkedListsMap: Record<string, LinkedShoppingList> = {};
      const processedEventIds = new Set<string>();

      await Promise.all(
        eventsData.map(async (event) => {
          try {
            const lookupId = ('series_id' in event ? (event as unknown as { series_id: string }).series_id : null) || event.id;

            if (processedEventIds.has(lookupId)) {
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
            logger.error('Failed to load shopping list for event ${event.id}:', error, { component: 'useCalendarData', action: 'execution' });
          }
        })
      );
      setLinkedShoppingLists(linkedListsMap);

    } catch (error) {
      logger.error('Failed to load events:', error, { component: 'useCalendarData', action: 'execution' });
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  const checkCalendarConnection = useCallback(async () => {
    if (!currentSpace) return;

    try {
      const providers = ['google', 'apple'] as const;
      const responses = await Promise.all(
        providers.map(provider =>
          fetch(`/api/calendar/connect/${provider}?space_id=${currentSpace.id}`)
            .then(res => res.ok ? res.json() : { connections: [] })
            .catch(() => ({ connections: [] }))
        )
      );

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
        localStorage.setItem('rowan_calendar_connected', 'true');
        localStorage.setItem('rowan_calendar_connections', JSON.stringify(activeConnections));
        if (mostRecentSyncTime) {
          localStorage.setItem('rowan_calendar_last_sync', mostRecentSyncTime);
        }
      } else {
        setHasCalendarConnection(false);
        setCalendarConnections([]);
        localStorage.removeItem('rowan_calendar_connected');
        localStorage.removeItem('rowan_calendar_connections');
        localStorage.removeItem('rowan_calendar_last_sync');
      }
    } catch (error) {
      logger.error('Failed to check calendar connections:', error, { component: 'useCalendarData', action: 'execution' });
    } finally {
      setConnectionChecked(true);
    }
  }, [currentSpace]);

  // ---------------------------------------------------------------------------
  // Computed / memoized values
  // ---------------------------------------------------------------------------

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (statusFilter !== 'all') {
      filtered = events.filter(e => e.status === statusFilter);
    }

    if (debouncedSearchQuery) {
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [events, debouncedSearchQuery, statusFilter]);

  const filteredUnifiedItems = useMemo(() => {
    if (statusFilter === 'all') {
      return unifiedItems;
    }

    return unifiedItems.filter(item => {
      const itemStatus = item.status?.toLowerCase();

      if (item.itemType === 'meal') {
        return statusFilter === 'not-started';
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

  const filteredUnifiedItemsByDate = useMemo(() => {
    const grouped = new Map<string, UnifiedCalendarItem[]>();
    for (const item of filteredUnifiedItems) {
      const dateKey = format(parseISO(item.startTime), 'yyyy-MM-dd');
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, item]);
    }
    return grouped;
  }, [filteredUnifiedItems]);

  const getUnifiedItemsForDate = useCallback((date: Date): UnifiedCalendarItem[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return filteredUnifiedItemsByDate.get(dateKey) || [];
  }, [filteredUnifiedItemsByDate]);

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

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

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

  const getEventsForDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  }, [eventsByDate]);

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

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load events on mount / when deps change
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
          logger.info('[Calendar] User location set:', { component: 'useCalendarData', data: locationString });
        }
      } catch (error) {
        logger.error('[Calendar] Failed to get user location:', error, { component: 'useCalendarData', action: 'execution' });
        setUserLocation('Dallas, Texas, United States');
      } finally {
        setLocationLoading(false);
      }
    };

    fetchUserLocation();
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  const syncState: CalendarSyncState = {
    isSyncing,
    hasCalendarConnection,
    calendarConnections,
    lastSyncTime,
    connectionChecked,
    syncTooltipVisible,
    setSyncTooltipVisible,
  };

  return {
    // Auth / context
    currentSpace,
    user,
    isMobile,
    canUseEventProposals,
    requestProposalUpgrade,

    // Core event data
    events,
    setEvents,
    loading,
    linkedShoppingLists,

    // Filtered / computed
    filteredEvents,
    filteredUnifiedItems,
    filteredUnifiedItemsByDate,
    stats,
    calendarDays,
    eventsByDate,
    getEventsForDate,
    getUnifiedItemsForDate,
    getCategoryColor,

    // View state
    viewMode,
    setViewMode,
    viewModeLoaded,
    currentMonth,
    setCurrentMonth,

    // Search state
    searchQuery,
    setSearchQuery,
    isSearchTyping,
    setIsSearchTyping,
    searchInputRef,

    // Status filter
    statusFilter,
    setStatusFilter,

    // Active action
    activeAction,
    setActiveAction,

    // Unified calendar (Phase 9)
    unifiedItems,
    unifiedCounts,
    unifiedFilters,
    setUnifiedFilters,

    // Realtime
    realtimeConnected,

    // Location / weather
    userLocation,
    locationLoading,

    // Calendar sync
    syncState,

    // Refs
    calendarContentRef,

    // Data fetching
    loadEvents,
    checkCalendarConnection,
  };
}
