'use client';

import { useState } from 'react';
import { X, Calendar, Clock, Bell } from 'lucide-react';
import { ShoppingList } from '@/lib/services/shopping-service';

interface ScheduleTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (eventData: {
    title: string;
    date: string;
    time: string;
    duration: number;
    reminderMinutes?: number;
  }) => Promise<void>;
  list: ShoppingList;
}

export function ScheduleTripModal({ isOpen, onClose, onSchedule, list }: ScheduleTripModalProps) {
  const [title, setTitle] = useState(`Shopping Trip: ${list.title}`);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;

    try {
      setIsScheduling(true);
      await onSchedule({
        title,
        date,
        time,
        duration,
        reminderMinutes: reminderMinutes > 0 ? reminderMinutes : undefined,
      });
      onClose();
      // Reset form
      setTitle(`Shopping Trip: ${list.title}`);
      setDate('');
      setTime('10:00');
      setDuration(60);
      setReminderMinutes(15);
    } catch (error) {
      console.error('Failed to schedule trip:', error);
      alert('Failed to schedule shopping trip. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schedule Shopping Trip</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Shopping Trip"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="event-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Duration (minutes)
            </label>
            <select
              id="event-duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
            </select>
          </div>

          <div>
            <label htmlFor="reminder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminder
            </label>
            <select
              id="reminder"
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value={0}>No reminder</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={120}>2 hours before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              📋 This will create a calendar event linked to your shopping list "{list.title}"
              {list.store_name && ` at ${list.store_name}`}.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isScheduling || !date || !time}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isScheduling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Schedule Trip
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
