'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, Search, Plus, CalendarDays, CalendarRange, CalendarClock, LayoutGrid, List, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { EventCard } from '@/components/calendar/EventCard';
import { NewEventModal } from '@/components/calendar/NewEventModal';
import GuidedEventCreation from '@/components/guided/GuidedEventCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { calendarService, CalendarEvent, CreateEventInput } from '@/lib/services/calendar-service';
import { shoppingIntegrationService } from '@/lib/services/shopping-integration-service';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, parseISO } from 'date-fns';

type ViewMode = 'calendar' | 'list';

export default function CalendarPage() {
  const { currentSpace, user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'not-started' | 'in-progress' | 'completed'>('all');
  const [linkedShoppingLists, setLinkedShoppingLists] = useState<Record<string, any>>({});

  // Memoize stats calculations
  const stats = useMemo(() => {
    const activeEvents = events.filter(e => e.status !== 'completed');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: activeEvents.length,
      today: activeEvents.filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate >= today && eventDate < new Date(today.getTime() + 86400000);
      }).length,
      thisWeek: activeEvents.filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate >= weekStart;
      }).length,
      thisMonth: activeEvents.filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate >= monthStart;
      }).length,
    };
  }, [events]);

  // Memoize filtered events (exclude completed events in calendar view, apply status filter in list view)
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // In calendar view, always exclude completed events
    // In list view, apply status filter
    if (viewMode === 'calendar') {
      filtered = events.filter(e => e.status !== 'completed');
    } else if (viewMode === 'list' && statusFilter !== 'all') {
      filtered = events.filter(e => e.status === statusFilter);
    }

    if (!searchQuery) return filtered;

    return filtered.filter(e =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery, viewMode, statusFilter]);

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
      work: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300' },
      personal: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-500', text: 'text-purple-700 dark:text-purple-300' },
      family: { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-500', text: 'text-pink-700 dark:text-pink-300' },
      health: { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', text: 'text-green-700 dark:text-green-300' },
      social: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-700 dark:text-orange-300' },
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
      const [eventsData, userProgressResult] = await Promise.all([
        calendarService.getEvents(currentSpace.id),
        getUserProgress(user.id),
      ]);

      setEvents(eventsData);

      // Load linked shopping lists for all events
      const linkedListsMap: Record<string, any> = {};
      await Promise.all(
        eventsData.map(async (event) => {
          try {
            const linkedLists = await shoppingIntegrationService.getShoppingListsForEvent(event.id);
            if (linkedLists && linkedLists.length > 0) {
              linkedListsMap[event.id] = linkedLists[0]; // For now, just take the first linked list
            }
          } catch (error) {
            console.error(`Failed to load shopping list for event ${event.id}:`, error);
          }
        })
      );
      setLinkedShoppingLists(linkedListsMap);

      // Check if user has completed the guided event flow
      const userProgress = userProgressResult.success ? userProgressResult.data : null;
      if (userProgress) {
        setHasCompletedGuide(userProgress.first_event_created);
      }

      // Show guided flow if no events exist, user hasn't completed the guide, AND user hasn't skipped it
      if (
        eventsData.length === 0 &&
        !userProgress?.first_event_created &&
        !userProgress?.skipped_event_guide
      ) {
        setShowGuidedFlow(true);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  // Stable callback for creating/updating events
  const handleCreateEvent = useCallback(async (eventData: CreateEventInput) => {
    try {
      if (editingEvent) {
        await calendarService.updateEvent(editingEvent.id, eventData);
      } else {
        await calendarService.createEvent(eventData);
      }
      loadEvents();
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  }, [editingEvent, loadEvents]);

  // Stable callback for deleting events
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await calendarService.deleteEvent(eventId);
      loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }, [loadEvents]);

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
      console.error('Failed to update event status:', error);
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

  // Stable callback for view mode changes
  const handleSetViewCalendar = useCallback(() => setViewMode('calendar'), []);
  const handleSetViewList = useCallback(() => setViewMode('list'), []);

  // Stable callback for month navigation
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  // Helper to get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  }, [eventsByDate]);

  // Helper to cycle event status
  const handleEventStatusClick = useCallback((e: React.MouseEvent, eventId: string, currentStatus: 'not-started' | 'in-progress' | 'completed') => {
    e.stopPropagation(); // Prevent opening edit modal
    const states: Array<'not-started' | 'in-progress' | 'completed'> = ['not-started', 'in-progress', 'completed'];
    const currentIndex = states.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % states.length;
    handleStatusChange(eventId, states[nextIndex]);
  }, [handleStatusChange]);

  const handleGuidedFlowComplete = useCallback(() => {
    setShowGuidedFlow(false);
    setHasCompletedGuide(true);
    loadEvents(); // Reload to show newly created event
  }, [loadEvents]);

  const handleGuidedFlowSkip = useCallback(async () => {
    setShowGuidedFlow(false);

    // Mark the guide as skipped in user progress
    if (user) {
      try {
        await markFlowSkipped(user.id, 'event_guide');
      } catch (error) {
        console.error('Failed to mark event guide as skipped:', error);
      }
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-calendar flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-calendar bg-clip-text text-transparent">
                  Calendar
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Shared events and schedules
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="bg-gray-50 dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg p-1 flex gap-1">
                <button
                  onClick={handleSetViewCalendar}
                  className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial ${
                    viewMode === 'calendar'
                      ? 'bg-gradient-calendar text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm">Calendar</span>
                </button>
                <button
                  onClick={handleSetViewList}
                  className={`px-3 sm:px-4 py-2 rounded-md font-medium transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial ${
                    viewMode === 'list'
                      ? 'bg-gradient-calendar text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm">List</span>
                </button>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 sm:px-6 py-2 sm:py-3 shimmer-calendar text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Event</span>
              </button>
            </div>
          </div>

          {/* Guided Creation - MOVED TO TOP */}
          {!loading && showGuidedFlow && (
            <GuidedEventCreation
              onComplete={handleGuidedFlowComplete}
              onSkip={handleGuidedFlowSkip}
            />
          )}

          {/* Stats Dashboard - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Today</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.today}</p>
                {stats.today > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <CalendarDays className="w-3 h-3" />
                    <span className="text-xs font-medium">Happening</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">This Week</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CalendarRange className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.thisWeek}</p>
                {stats.thisWeek > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CalendarRange className="w-3 h-3" />
                    <span className="text-xs font-medium">Upcoming</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">This Month</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
                {stats.thisMonth > 0 && (
                  <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                    <CalendarClock className="w-3 h-3" />
                    <span className="text-xs font-medium">Planned</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Total Events</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-calendar rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <CalendarIcon className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Search Bar - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
          )}

          {/* Events Section - Only show when NOT in guided flow */}
          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {viewMode === 'calendar' ? 'Event Calendar' : `Upcoming Events (${filteredEvents.length})`}
                </h2>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>

              {/* Status Filter Toggle - Only show in list view */}
              {viewMode === 'list' && (
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-1 flex gap-1 w-fit">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                      statusFilter === 'all'
                        ? 'bg-gradient-calendar text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter('not-started')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                      statusFilter === 'not-started'
                        ? 'bg-gradient-calendar text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setStatusFilter('in-progress')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[72px] ${
                      statusFilter === 'in-progress'
                        ? 'bg-gradient-calendar text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[72px] ${
                      statusFilter === 'completed'
                        ? 'bg-gradient-calendar text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              )}
            </div>

            <div className="min-h-[600px]">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
                </div>
              ) : viewMode === 'calendar' ? (
                /* Calendar View */
                <div>
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 py-1 sm:py-2">
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.slice(0, 1)}</span>
                      </div>
                    ))}

                    {/* Calendar days */}
                    {calendarDays.map((day, index) => {
                      const dayEvents = getEventsForDate(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={index}
                          className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 rounded-lg border transition-all ${
                            isCurrentMonth
                              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                              : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'
                          } ${isToday ? 'ring-1 sm:ring-2 ring-purple-500' : ''}`}
                        >
                          <div className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${
                            isCurrentMonth
                              ? isToday
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-gray-900 dark:text-white'
                              : 'text-gray-400 dark:text-gray-600'
                          }`}>
                            {format(day, 'd')}
                          </div>

                          <div className="space-y-0.5 sm:space-y-1">
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
                                  className={`w-full flex items-center gap-1 px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs ${categoryColor.bg} border-l-2 ${categoryColor.border}`}
                                >
                                  {/* Status checkbox */}
                                  <button
                                    onClick={(e) => handleEventStatusClick(e, event.id, event.status)}
                                    className={`flex-shrink-0 w-3 h-3 sm:w-4 sm:h-4 rounded border flex items-center justify-center transition-all ${
                                      event.status === 'completed'
                                        ? 'bg-green-500 border-green-500'
                                        : event.status === 'in-progress'
                                        ? 'bg-amber-500 border-amber-500'
                                        : 'bg-transparent border-red-500'
                                    }`}
                                    aria-label={`Toggle status: ${event.status}`}
                                  >
                                    {event.status === 'completed' && <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />}
                                    {event.status === 'in-progress' && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-white rounded-full" />}
                                  </button>

                                  {/* Event details - clickable to edit */}
                                  <button
                                    onClick={() => handleEditEvent(event)}
                                    className="flex-1 text-left hover:opacity-80 transition-opacity min-w-0"
                                  >
                                    <p className={`font-medium ${categoryColor.text} truncate`}>
                                      {event.title}
                                    </p>
                                    <div className="hidden sm:flex items-center gap-1 text-[10px]">
                                      <span className="text-gray-500 dark:text-gray-400">
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
                            {dayEvents.length > 2 && (
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                                +{dayEvents.length - 2} more
                              </p>
                            )}
                            {dayEvents.length === 0 && isCurrentMonth && (
                              <button
                                onClick={() => setIsModalOpen(true)}
                                className="hidden sm:block w-full text-center py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* List View */
                filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No events found</p>
                    <p className="text-gray-500 dark:text-gray-500 mb-6">
                      {searchQuery ? 'Try adjusting your search' : 'Create your first event to get started!'}
                    </p>
                    {!searchQuery && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="px-6 py-3 shimmer-calendar text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          Create Event
                        </button>
                        {!hasCompletedGuide && (
                          <button
                            onClick={() => setShowGuidedFlow(true)}
                            className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
                          >
                            <CalendarIcon className="w-5 h-5" />
                            Try Guided Creation
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {filteredEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onEdit={handleEditEvent}
                        onDelete={handleDeleteEvent}
                        onStatusChange={handleStatusChange}
                        linkedShoppingList={linkedShoppingLists[event.id]}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* New/Edit Event Modal */}
      {currentSpace && (
        <NewEventModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleCreateEvent}
          editEvent={editingEvent}
          spaceId={currentSpace.id}
        />
      )}
    </FeatureLayout>
  );
}
