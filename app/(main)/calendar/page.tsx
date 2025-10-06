'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Search, Plus, CalendarDays, CalendarRange, CalendarClock, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { EventCard } from '@/components/calendar/EventCard';
import { NewEventModal } from '@/components/calendar/NewEventModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { calendarService, CalendarEvent, CreateEventInput } from '@/lib/services/calendar-service';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, parseISO } from 'date-fns';

type ViewMode = 'calendar' | 'list';

export default function CalendarPage() {
  const { user, currentSpace } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    loadEvents();
  }, [currentSpace.id]);

  useEffect(() => {
    let filtered = events;

    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  }, [events, searchQuery]);

  async function loadEvents() {
    try {
      setLoading(true);
      let [eventsData, statsData] = await Promise.all([
        calendarService.getEvents(currentSpace.id),
        calendarService.getEventStats(currentSpace.id),
      ]);

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
          statsData = await calendarService.getEventStats(currentSpace.id);
        } catch (createError) {
          console.error('Failed to create sample event:', createError);
          // Continue without sample event if creation fails
        }
      }

      setEvents(eventsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEvent(eventData: CreateEventInput) {
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
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await calendarService.deleteEvent(eventId);
      loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }

  function handleEditEvent(event: CalendarEvent) {
    setEditingEvent(event);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingEvent(null);
  }

  function getCalendarDays() {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }

  function getEventsForDate(date: Date) {
    return filteredEvents.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, date);
    });
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-calendar flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-calendar bg-clip-text text-transparent">
                  Calendar
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Shared events and schedules
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 flex gap-1">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'calendar'
                      ? 'bg-gradient-calendar text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Calendar
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'list'
                      ? 'bg-gradient-calendar text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                  List
                </button>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Event
              </button>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Today</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.today}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">This Week</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CalendarRange className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.thisWeek}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">This Month</h3>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <CalendarClock className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total Events</h3>
                <div className="w-12 h-12 bg-gradient-calendar rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
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
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
                        {day}
                      </div>
                    ))}

                    {/* Calendar days */}
                    {getCalendarDays().map((day, index) => {
                      const dayEvents = getEventsForDate(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={index}
                          className={`min-h-[120px] p-2 rounded-lg border-2 transition-all ${
                            isCurrentMonth
                              ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                              : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'
                          } ${isToday ? 'ring-2 ring-purple-500' : ''}`}
                        >
                          <div className={`text-sm font-medium mb-2 ${
                            isCurrentMonth
                              ? isToday
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-gray-900 dark:text-white'
                              : 'text-gray-400 dark:text-gray-600'
                          }`}>
                            {format(day, 'd')}
                          </div>

                          <div className="space-y-1">
                            {dayEvents.map((event) => (
                              <button
                                key={event.id}
                                onClick={() => handleEditEvent(event)}
                                className="w-full text-left px-2 py-1 rounded text-xs bg-purple-100 dark:bg-purple-900/30 border-l-2 border-purple-500 hover:opacity-80 transition-opacity"
                              >
                                <p className="font-medium text-purple-700 dark:text-purple-300 truncate">
                                  {event.title}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400 text-[10px]">
                                  {format(parseISO(event.start_time), 'h:mm a')}
                                </p>
                              </button>
                            ))}
                            {dayEvents.length === 0 && isCurrentMonth && (
                              <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full text-center py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
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
