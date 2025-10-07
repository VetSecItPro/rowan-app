'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, Search, Plus, CheckCircle2, AlertCircle, Clock, ChevronDown } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { NewReminderModal } from '@/components/reminders/NewReminderModal';
import { useAuth } from '@/lib/contexts/auth-context';
import { remindersService, Reminder, CreateReminderInput } from '@/lib/services/reminders-service';

export default function RemindersPage() {
  const { currentSpace } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Memoized filtered reminders - expensive filtering operation
  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.location?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reminders, statusFilter, searchQuery]);

  // Memoized stats calculation - expensive computation
  const stats = useMemo(() => {
    const now = new Date();

    const total = reminders.length;
    const active = reminders.filter(r => r.status === 'active').length;
    const completed = reminders.filter(r => r.status === 'completed').length;
    const overdue = reminders.filter(r => {
      if (r.status !== 'active') return false;
      const reminderTime = new Date(r.reminder_time);
      return reminderTime < now;
    }).length;

    return { total, active, completed, overdue };
  }, [reminders]);

  // Stable reference to loadReminders
  const loadReminders = useCallback(async () => {
    try {
      setLoading(true);
      const [remindersData, statsData] = await Promise.all([
        remindersService.getReminders(currentSpace.id),
        remindersService.getReminderStats(currentSpace.id),
      ]);

      // Create sample reminder if none exist
      if (remindersData.length === 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);

        await remindersService.createReminder({
          space_id: currentSpace.id,
          title: 'Team Meeting',
          description: 'Weekly team sync-up to discuss project progress and upcoming tasks',
          emoji: '📅',
          category: 'work',
          reminder_time: tomorrow.toISOString(),
          priority: 'medium',
          status: 'active',
          repeat_pattern: 'weekly',
          repeat_days: [1], // Monday
        });

        // Reload to include the sample
        const [updatedData, updatedStats] = await Promise.all([
          remindersService.getReminders(currentSpace.id),
          remindersService.getReminderStats(currentSpace.id),
        ]);
        setReminders(updatedData);
      } else {
        setReminders(remindersData);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace.id]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Memoized callback for creating/updating reminders
  const handleCreateReminder = useCallback(async (reminderData: CreateReminderInput) => {
    try {
      if (editingReminder) {
        await remindersService.updateReminder(editingReminder.id, reminderData);
      } else {
        await remindersService.createReminder(reminderData);
      }
      loadReminders();
      setEditingReminder(null);
    } catch (error) {
      console.error('Failed to save reminder:', error);
    }
  }, [editingReminder, loadReminders]);

  // Memoized callback for status changes
  const handleStatusChange = useCallback(async (reminderId: string, status: string) => {
    // Optimistic update - update UI immediately
    setReminders(prevReminders =>
      prevReminders.map(reminder =>
        reminder.id === reminderId ? { ...reminder, status: status as 'active' | 'completed' | 'snoozed' } : reminder
      )
    );

    // Update in background
    try {
      await remindersService.updateReminder(reminderId, { status: status as 'active' | 'completed' | 'snoozed' });
    } catch (error) {
      console.error('Failed to update reminder status:', error);
      loadReminders(); // Revert on error
    }
  }, [loadReminders]);

  // Memoized callback for deleting reminders
  const handleDeleteReminder = useCallback(async (reminderId: string) => {
    try {
      await remindersService.deleteReminder(reminderId);
      loadReminders();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  }, [loadReminders]);

  // Memoized callback for snoozing reminders
  const handleSnoozeReminder = useCallback(async (reminderId: string, minutes: number) => {
    try {
      await remindersService.snoozeReminder(reminderId, minutes);
      loadReminders();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  }, [loadReminders]);

  // Memoized callback for editing reminders
  const handleEditReminder = useCallback((reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  }, []);

  // Memoized callback for closing modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingReminder(null);
  }, []);

  // Memoized callback for opening new reminder modal
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Memoized callback for search query changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Memoized callback for status filter changes
  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reminders' }]}>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-reminders flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-reminders bg-clip-text text-transparent">
                  Reminders
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Never forget important moments
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenModal}
              className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Reminder
            </button>
          </div>

          {/* Stats Cards - Horizontal Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Total */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total</h3>
                <div className="w-12 h-12 bg-gradient-reminders rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>

            {/* Active */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>

            {/* Completed */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>

            {/* Overdue */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Overdue</h3>
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search reminders..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                      className="pl-4 pr-10 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white appearance-none w-full"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="snoozed">Snoozed</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Reminders List */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              All Reminders ({filteredReminders.length})
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reminders...</p>
              </div>
            ) : filteredReminders.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No reminders found</p>
                <p className="text-gray-500 dark:text-gray-500 mb-6">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first reminder to get started!'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <button
                    onClick={handleOpenModal}
                    className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Reminder
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEditReminder}
                    onDelete={handleDeleteReminder}
                    onSnooze={handleSnoozeReminder}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New/Edit Reminder Modal */}
      <NewReminderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleCreateReminder}
        editReminder={editingReminder}
        spaceId={currentSpace.id}
      />
    </FeatureLayout>
  );
}
