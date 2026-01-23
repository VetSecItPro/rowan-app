'use client';

import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { taskSnoozeService } from '@/lib/services/task-snooze-service';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  userId: string;
  onSnooze?: () => void;
}

interface SnoozeHistory {
  id: string;
  task_id: string;
  snoozed_until: string;
  snoozed_by: string;
  reason?: string;
  created_at: string;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadHistory is a stable function
  }, [isOpen, taskId]);

  async function loadHistory() {
    try {
      const data = await taskSnoozeService.getSnoozeHistory(taskId);
      setHistory(data);
    } catch (error) {
      logger.error('Error loading history:', error, { component: 'SnoozeModal', action: 'component_action' });
    }
  }

  async function handleSnooze(snoozeUntil: Date) {
    setLoading(true);
    try {
      await taskSnoozeService.snoozeTask(taskId, userId, snoozeUntil.toISOString(), reason || undefined);
      onSnooze?.();
      onClose();
    } catch (error) {
      logger.error('Error snoozing task:', error, { component: 'SnoozeModal', action: 'component_action' });
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Snooze Task"
      maxWidth="md"
      headerGradient="bg-gradient-to-r from-blue-500 to-blue-600"
    >
      <div className="space-y-6">
          {/* Quick Options */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Quick Snooze
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleSnooze(option.date)}
                  disabled={loading}
                  className="px-4 py-3 text-sm font-medium bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date/Time */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Custom Date & Time
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="field-1" className="block text-xs text-gray-400 mb-1 cursor-pointer">
                  Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-900"
                />
              </div>
              <div>
                <label htmlFor="field-2" className="block text-xs text-gray-400 mb-1 cursor-pointer">
                  Time
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-900"
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="field-3" className="block text-xs text-gray-400 mb-1 cursor-pointer">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you snoozing this task?"
                className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-900"
              />
            </div>

            <button
              onClick={handleCustomSnooze}
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Snoozing...' : 'Set Custom Snooze'}
            </button>
          </div>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide' : 'Show'} Snooze History
          </button>

        {/* Snooze History */}
        {showHistory && (
          <div className="mt-4 p-4 bg-gray-900 rounded-lg max-h-48 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-xs text-gray-500 text-center">No snooze history</p>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">
                        Snoozed until {new Date(item.snoozed_until).toLocaleString()}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-900/20 text-amber-300">
                        Snoozed
                      </span>
                    </div>
                    {item.reason && (
                      <p className="text-gray-500 mt-1">Reason: {item.reason}</p>
                    )}
                    <p className="text-gray-400 mt-1">
                      Set on {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
