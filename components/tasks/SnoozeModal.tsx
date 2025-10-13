'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Calendar, History } from 'lucide-react';
import { taskSnoozeService } from '@/lib/services/task-snooze-service';

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  userId: string;
  onSnooze?: () => void;
}

interface SnoozeHistory {
  id: string;
  snoozed_until: string;
  snoozed_at: string;
  snoozed_by: string;
  unsnoozed_at: string | null;
  reason: string | null;
}

export function SnoozeModal({ isOpen, onClose, taskId, userId, onSnooze }: SnoozeModalProps) {
  const [loading, setLoading] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<SnoozeHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      // Set default date/time to tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setCustomDate(tomorrow.toISOString().split('T')[0]);
      setCustomTime('09:00');
    }
  }, [isOpen, taskId]);

  async function loadHistory() {
    try {
      const data = await taskSnoozeService.getSnoozeHistory(taskId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  async function handleSnooze(snoozeUntil: Date) {
    setLoading(true);
    try {
      await taskSnoozeService.snoozeTask(taskId, userId, snoozeUntil, reason || undefined);
      onSnooze?.();
      onClose();
    } catch (error) {
      console.error('Error snoozing task:', error);
      alert('Failed to snooze task');
    } finally {
      setLoading(false);
    }
  }

  function getQuickSnoozeDate(hours: number): Date {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  }

  function getNextWeekday(day: number): Date {
    const date = new Date();
    const currentDay = date.getDay();
    const daysUntil = (day - currentDay + 7) % 7 || 7;
    date.setDate(date.getDate() + daysUntil);
    date.setHours(9, 0, 0, 0);
    return date;
  }

  function handleCustomSnooze() {
    if (!customDate || !customTime) {
      alert('Please select both date and time');
      return;
    }
    const snoozeDate = new Date(`${customDate}T${customTime}`);
    if (snoozeDate <= new Date()) {
      alert('Snooze time must be in the future');
      return;
    }
    handleSnooze(snoozeDate);
  }

  const quickOptions = [
    { label: '1 Hour', date: getQuickSnoozeDate(1) },
    { label: '3 Hours', date: getQuickSnoozeDate(3) },
    { label: 'Tomorrow 9 AM', date: getNextWeekday(new Date().getDay() + 1) },
    { label: 'Next Monday', date: getNextWeekday(1) },
    { label: 'Next Week', date: getQuickSnoozeDate(7 * 24) },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Snooze Task</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Quick Options */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick Snooze
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleSnooze(option.date)}
                  disabled={loading}
                  className="px-4 py-3 text-sm font-medium bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date/Time */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Custom Date & Time
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you snoozing this task?"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
              />
            </div>

            <button
              onClick={handleCustomSnooze}
              disabled={loading}
              className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
            >
              {loading ? 'Snoozing...' : 'Set Custom Snooze'}
            </button>
          </div>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide' : 'Show'} Snooze History
          </button>

          {/* Snooze History */}
          {showHistory && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-48 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-xs text-gray-500 text-center">No snooze history</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div key={item.id} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">
                          Snoozed until {new Date(item.snoozed_until).toLocaleString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${
                          item.unsnoozed_at
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                        }`}>
                          {item.unsnoozed_at ? 'Unsnoozed' : 'Active'}
                        </span>
                      </div>
                      {item.reason && (
                        <p className="text-gray-500 mt-1">Reason: {item.reason}</p>
                      )}
                      <p className="text-gray-400 mt-1">
                        Set on {new Date(item.snoozed_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
