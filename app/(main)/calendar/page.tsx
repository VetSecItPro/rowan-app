'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Search, Plus, CalendarDays, CalendarRange, CalendarClock } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { EventCard } from '@/components/calendar/EventCard';
import { NewEventModal } from '@/components/calendar/NewEventModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { calendarService, CalendarEvent, CreateEventInput } from '@/lib/services/calendar-service';

export default function CalendarPage() {
  const { currentSpace } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      const [eventsData, statsData] = await Promise.all([
        calendarService.getEvents(currentSpace.id),
        calendarService.getEventStats(currentSpace.id),
      ]);
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

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Event
            </button>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total Events</h3>
                <div className="w-12 h-12 bg-gradient-calendar rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>

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

          {/* Events List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Upcoming Events ({filteredEvents.length})
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No events found</p>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  {searchQuery ? 'Try adjusting your search' : 'Create your first event to get started!'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Event
                  </button>
                )}
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
            )}
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
