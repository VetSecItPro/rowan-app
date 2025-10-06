'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, Plus, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { NewReminderModal } from '@/components/reminders/NewReminderModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { remindersService, Reminder, CreateReminderInput } from '@/lib/services/reminders-service';

export default function RemindersPage() {
  const { currentSpace } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filteredReminders, setFilteredReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
  });

  useEffect(() => {
    loadReminders();
  }, [currentSpace.id]);

  useEffect(() => {
    let filtered = reminders;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredReminders(filtered);
  }, [reminders, statusFilter, searchQuery]);

  async function loadReminders() {
    try {
      setLoading(true);
      const [remindersData, statsData] = await Promise.all([
        remindersService.getReminders(currentSpace.id),
        remindersService.getReminderStats(currentSpace.id),
      ]);
      setReminders(remindersData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateReminder(reminderData: CreateReminderInput) {
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
  }

  async function handleStatusChange(reminderId: string, status: string) {
    try {
      await remindersService.updateReminder(reminderId, { status: status as any });
      loadReminders();
    } catch (error) {
      console.error('Failed to update reminder status:', error);
    }
  }

  async function handleDeleteReminder(reminderId: string) {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    try {
      await remindersService.deleteReminder(reminderId);
      loadReminders();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  }

  async function handleSnoozeReminder(reminderId: string, minutes: number) {
    try {
      await remindersService.snoozeReminder(reminderId, minutes);
      loadReminders();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  }

  function handleEditReminder(reminder: Reminder) {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingReminder(null);
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reminders' }]}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-reminders flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-reminders bg-clip-text text-transparent">
                  Reminders
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Never forget important moments
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Reminder
            </button>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total</h3>
                <div className="w-12 h-12 bg-gradient-reminders rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>

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
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reminders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="snoozed">Snoozed</option>
              </select>
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
                    onClick={() => setIsModalOpen(true)}
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
