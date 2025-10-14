'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bell, Search, Plus, CheckCircle2, AlertCircle, Clock, ChevronDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Header } from '@/components/layout/Header';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { NewReminderModal } from '@/components/reminders/NewReminderModal';
import GuidedReminderCreation from '@/components/guided/GuidedReminderCreation';
import { useAuth } from '@/lib/contexts/auth-context';
import { remindersService, Reminder, CreateReminderInput } from '@/lib/services/reminders-service';
import { getUserProgress, markFlowSkipped } from '@/lib/services/user-progress-service';

export default function RemindersPage() {
  const { currentSpace, user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const [hasCompletedGuide, setHasCompletedGuide] = useState(false);

  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (assignmentFilter !== 'all' && user) {
      if (assignmentFilter === 'mine') {
        filtered = filtered.filter(r => r.assigned_to === user.id);
      } else if (assignmentFilter === 'unassigned') {
        filtered = filtered.filter(r => !r.assigned_to);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.location?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reminders, statusFilter, assignmentFilter, searchQuery, user]);

  const stats = useMemo(() => {
    const now = new Date();

    const total = reminders.length;
    const active = reminders.filter(r => r.status === 'active').length;
    const completed = reminders.filter(r => r.status === 'completed').length;
    const overdue = reminders.filter(r => {
      if (r.status !== 'active' || !r.reminder_time) return false;
      const reminderTime = new Date(r.reminder_time);
      return reminderTime < now;
    }).length;

    return { total, active, completed, overdue };
  }, [reminders]);

  const loadReminders = useCallback(async () => {
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [remindersData, statsData, userProgressResult] = await Promise.all([
        remindersService.getReminders(currentSpace.id),
        remindersService.getReminderStats(currentSpace.id),
        getUserProgress(user.id),
      ]);

      setReminders(remindersData);

      const userProgress = userProgressResult.success ? userProgressResult.data : null;
      if (userProgress) {
        setHasCompletedGuide(userProgress.first_reminder_created);
      }

      if (
        remindersData.length === 0 &&
        !userProgress?.first_reminder_created &&
        !userProgress?.skipped_reminder_guide
      ) {
        setShowGuidedFlow(true);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

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

  const handleStatusChange = useCallback(async (reminderId: string, status: string) => {
    setReminders(prevReminders =>
      prevReminders.map(reminder =>
        reminder.id === reminderId ? { ...reminder, status: status as 'active' | 'completed' | 'snoozed' } : reminder
      )
    );

    try {
      await remindersService.updateReminder(reminderId, { status: status as 'active' | 'completed' | 'snoozed' });
    } catch (error) {
      console.error('Failed to update reminder status:', error);
      loadReminders();
    }
  }, [loadReminders]);

  const handleDeleteReminder = useCallback(async (reminderId: string) => {
    try {
      await remindersService.deleteReminder(reminderId);
      loadReminders();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    }
  }, [loadReminders]);

  const handleSnoozeReminder = useCallback(async (reminderId: string, minutes: number) => {
    if (!user) return;
    try {
      await remindersService.snoozeReminder(reminderId, minutes, user.id);
      loadReminders();
    } catch (error) {
      console.error('Failed to snooze reminder:', error);
    }
  }, [loadReminders, user]);

  const handleEditReminder = useCallback((reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingReminder(null);
  }, []);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }, []);

  const handleGuidedFlowComplete = useCallback(() => {
    setShowGuidedFlow(false);
    setHasCompletedGuide(true);
    loadReminders();
  }, [loadReminders]);

  const handleGuidedFlowSkip = useCallback(async () => {
    setShowGuidedFlow(false);

    if (user) {
      try {
        await markFlowSkipped(user.id, 'reminder_guide');
      } catch (error) {
        console.error('Failed to mark reminder guide as skipped:', error);
      }
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
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
              className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 shimmer-reminders text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Reminder
            </button>
          </div>

          {!loading && showGuidedFlow && (
            <GuidedReminderCreation
              onComplete={handleGuidedFlowComplete}
              onSkip={handleGuidedFlowSkip}
            />
          )}

          {!showGuidedFlow && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                {stats.active > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-medium">Pending</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Overdue</h3>
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
                {stats.overdue > 0 && (
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-xs font-medium">Urgent!</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">
                      {(() => {
                        const percentage = Math.round((stats.completed / stats.total) * 100);
                        if (percentage >= 67) return `${percentage}% 🎉`;
                        if (percentage >= 34) return `${percentage}%`;
                        return percentage > 0 ? `${percentage}%` : 'Start';
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total</h3>
                <div className="w-12 h-12 bg-gradient-reminders rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-pink-600 dark:text-pink-400">
                    <Bell className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {!showGuidedFlow && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
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
                </div>
              </div>
          )}

              {!showGuidedFlow && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex flex-col items-start gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  All Reminders ({filteredReminders.length})
                </h2>
                <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 border border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 text-sm font-medium rounded-full">
                  {format(new Date(), 'MMM yyyy')}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-1 flex gap-1 w-fit">
                  <button
                    onClick={() => setAssignmentFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                      assignmentFilter === 'all'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('mine')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                      assignmentFilter === 'mine'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    My Reminders
                  </button>
                  <button
                    onClick={() => setAssignmentFilter('unassigned')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[80px] ${
                      assignmentFilter === 'unassigned'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    Unassigned
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-pink-200 dark:border-pink-700 rounded-lg p-1 flex gap-1 w-fit">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'all'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[60px] ${
                    statusFilter === 'active'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('snoozed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[70px] ${
                    statusFilter === 'snoozed'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  Snoozed
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap min-w-[80px] ${
                    statusFilter === 'completed'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>

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
                  {searchQuery || statusFilter !== 'all' || assignmentFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first reminder to get started!'}
                </p>
                {!searchQuery && statusFilter === 'all' && assignmentFilter === 'all' && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleOpenModal}
                      className="px-6 py-3 shimmer-reminders text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Create Reminder
                    </button>
                    {!hasCompletedGuide && (
                      <button
                        onClick={() => setShowGuidedFlow(true)}
                        className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all inline-flex items-center gap-2"
                      >
                        <Bell className="w-5 h-5" />
                        Try Guided Creation
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
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
          )}
        </div>
      </div>

      {currentSpace ? (
        <NewReminderModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleCreateReminder}
          editReminder={editingReminder}
          spaceId={currentSpace.id}
        />
      ) : (
        isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal} />
            <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">No Space Available</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You need to create or join a space before creating reminders.
              </p>
              <button
                onClick={handleCloseModal}
                className="w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:opacity-90 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
