'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, Search, Plus, CalendarDays, CalendarRange, CalendarClock, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { EventCard } from '@/components/calendar/EventCard';
import { NewEventModal } from '@/components/calendar/NewEventModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { calendarService, CalendarEvent, CreateEventInput } from '@/lib/services/calendar-service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, parseISO } from 'date-fns';

type ViewMode = 'calendar' | 'list';

export default function CalendarPage() {
  const { currentSpace } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  // Memoize filtered events
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;

    return events.filter(e =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

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
    try {
      setLoading(true);
      let eventsData = await calendarService.getEvents(currentSpace.id);

      // Create sample event if none exist
      if (eventsData.length === 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);
        const endTime = new Date(tomorrow);
        endTime.setHours(15, 0, 0, 0);

        try {
          const newEvent = await calendarService.createEvent({
            space_id: currentSpace.id,
            title: 'Team Meeting',
            description: 'Weekly sync with the team',
            start_time: tomorrow.toISOString(),
            end_time: endTime.toISOString(),
            is_recurring: false,
            location: 'Conference Room A',
          });
          eventsData = [newEvent];
        } catch (createError) {
          console.error('Failed to create sample event:', createError);
          // Continue without sample event if creation fails
        }
      }

      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace.id]);

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
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 flex gap-1">
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
                className="px-4 sm:px-6 py-2 sm:py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Event</span>
              </button>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Today</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.today}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">This Week</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CalendarRange className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.thisWeek}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">This Month</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm">Total Events</h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-calendar rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
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

          {/* Events Section */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
              {viewMode === 'calendar' ? 'Event Calendar' : `Upcoming Events (${filteredEvents.length})`}
            </h2>

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
                              ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
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
                              return (
                                <button
                                  key={event.id}
                                  onClick={() => handleEditEvent(event)}
                                  className={`w-full text-left px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs ${categoryColor.bg} border-l-2 ${categoryColor.border} hover:opacity-80 transition-opacity`}
                                >
                                  <p className={`font-medium ${categoryColor.text} truncate`}>
                                    {event.title}
                                  </p>
                                  <p className="hidden sm:block text-gray-500 dark:text-gray-400 text-[10px]">
                                    {format(parseISO(event.start_time), 'h:mm a')}
                                  </p>
                                </button>
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
                    <p className="text-gray-500 dark:text-gray-500">
                      {searchQuery ? 'Try adjusting your search' : 'Create your first event to get started!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onEdit={handleEditEvent}
                        onDelete={handleDeleteEvent}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New/Edit Event Modal */}
      <NewEventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleCreateEvent}
        editEvent={editingEvent}
        spaceId={currentSpace.id}
      />
    </FeatureLayout>
  );
}
