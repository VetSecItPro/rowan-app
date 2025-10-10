'use client';

import { useState } from 'react';
import { Calendar, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import StepIndicator from './StepIndicator';
import { useAuth } from '@/lib/contexts/auth-context';
import { calendarService } from '@/lib/services/calendar-service';
import { markFlowComplete } from '@/lib/services/user-progress-service';

interface GuidedEventCreationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedEventCreation({ onComplete, onSkip }: GuidedEventCreationProps) {
  const { user, currentSpace } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<'work' | 'personal' | 'family' | 'health' | 'social'>('personal');
  const [location, setLocation] = useState('');

  const stepTitles = ['Welcome', 'Event Details', 'Success'];

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

  const handleCreateEvent = async () => {
    if (!currentSpace || !user) return;

    try {
      setLoading(true);

      // Convert date/time to ISO format
      const start = new Date(startTime).toISOString();
      const end = endTime ? new Date(endTime).toISOString() : undefined;

      await calendarService.createEvent({
        space_id: currentSpace.id,
        title: title || 'My First Event',
        description,
        start_time: start,
        end_time: end,
        category,
        location: location || undefined,
      });

      // Mark this guided flow as complete
      await markFlowComplete(user.id, 'first_event_created');

      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <StepIndicator currentStep={currentStep} totalSteps={3} stepTitles={stepTitles} />

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Calendar className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Create Your First Event
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Calendar events help you schedule important moments and never miss a date.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Add appointments, reminders, anniversaries, and more to your shared calendar.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Skip event creation"
              >
                Skip for now
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Start creating first event"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Event Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What's happening?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Add the details of your event
              </p>
            </div>

            <div>
              <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Title *
              </label>
              <input
                id="event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Anniversary Dinner"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[44px]"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about the event..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="event-start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  id="event-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="event-end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time (Optional)
                </label>
                <input
                  id="event-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location (Optional)
              </label>
              <input
                id="event-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Home, Restaurant, Park"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'personal', label: 'Personal' },
                  { value: 'family', label: 'Family' },
                  { value: 'work', label: 'Work' },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value as typeof category)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all min-h-[44px] ${
                      category === cat.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={`Set category to ${cat.label}`}
                  >
                    {cat.label}
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
                onClick={handleCreateEvent}
                disabled={!title.trim() || !startTime || loading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                aria-label={loading ? 'Creating event...' : 'Create event'}
              >
                {loading ? 'Creating...' : 'Create Event'}
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <Calendar className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Event Created Successfully!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your first event has been added to the calendar.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                You and your partner can now see it on the shared calendar.
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                What you can do with events:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                  <span>Schedule appointments, dates, and special occasions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                  <span>Set reminders so you never forget important events</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                  <span>View events in monthly, weekly, or daily formats</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                  <span>Color-code events by category (work, family, personal)</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
              aria-label="Go to calendar"
            >
              Go to Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
