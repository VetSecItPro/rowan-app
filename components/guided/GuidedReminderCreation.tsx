'use client';

import { useState } from 'react';
import { Bell, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import StepIndicator from './StepIndicator';
import { useAuth } from '@/lib/contexts/auth-context';
import { remindersService } from '@/lib/services/reminders-service';
import { markFlowComplete } from '@/lib/services/user-progress-service';

interface GuidedReminderCreationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedReminderCreation({ onComplete, onSkip }: GuidedReminderCreationProps) {
  const { user, currentSpace } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  const stepTitles = ['Welcome', 'Details & Time', 'Success'];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateReminder = async () => {
    if (!currentSpace || !user) return;

    try {
      setLoading(true);

      await remindersService.createReminder({
        space_id: currentSpace.id,
        title: title || 'My First Reminder',
        description,
        reminder_time: reminderTime || undefined,
        priority,
      });

      // Mark this guided flow as complete
      await markFlowComplete(user.id, 'first_reminder_created');

      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <StepIndicator currentStep={currentStep} totalSteps={3} stepTitles={stepTitles} />

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pink-100 dark:bg-pink-900 rounded-full">
              <Bell className="w-10 h-10 text-pink-600 dark:text-pink-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Create Your First Reminder
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Never forget important tasks, bills, or appointments.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Set up reminders to stay on top of everything that matters.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
                aria-label="Skip reminder creation"
              >
                Skip for now
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Start creating first reminder"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details & Time */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Set Up Your Reminder
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                What do you want to be reminded about?
              </p>
            </div>

            <div>
              <label htmlFor="reminder-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reminder Title *
              </label>
              <input
                id="reminder-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Pay electricity bill"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all min-h-[44px]"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="reminder-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="reminder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this reminder..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reminder Time (Optional)
              </label>
              <input
                id="reminder-time"
                type="datetime-local"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all min-h-[44px] ${
                      priority === p
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={`Set priority to ${p}`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 justify-between pt-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Go back to previous step"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleCreateReminder}
                disabled={!title.trim() || loading}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                aria-label={loading ? 'Creating reminder...' : 'Create reminder'}
              >
                {loading ? 'Creating...' : 'Create Reminder'}
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <Bell className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Reminder Created Successfully!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your first reminder has been set up.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                You'll receive notifications when it's time.
              </p>
            </div>

            <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                What you can do with reminders:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 mt-0.5">•</span>
                  <span>Set time-based and location-based reminders</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 mt-0.5">•</span>
                  <span>Prioritize reminders by urgency level</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 mt-0.5">•</span>
                  <span>Snooze reminders for later</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 mt-0.5">•</span>
                  <span>Create recurring reminders for regular tasks</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
              aria-label="Go to reminders"
            >
              Go to Reminders
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
