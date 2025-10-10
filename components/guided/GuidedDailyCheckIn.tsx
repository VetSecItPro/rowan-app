'use client';

import { useState } from 'react';
import { Heart, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import StepIndicator from './StepIndicator';
import { useAuth } from '@/lib/contexts/auth-context';
import { checkInsService } from '@/lib/services/checkins-service';
import { markFlowComplete } from '@/lib/services/user-progress-service';

interface DailyCheckInProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function DailyCheckIn({ onComplete, onSkip }: DailyCheckInProps) {
  const { user, currentSpace } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('3');
  const [gratitude, setGratitude] = useState('');
  const [goals, setGoals] = useState('');

  const stepTitles = ['Welcome', 'Check-in', 'Success'];

  const moodOptions = [
    { value: 'great', emoji: '😄', label: 'Great' },
    { value: 'good', emoji: '🙂', label: 'Good' },
    { value: 'okay', emoji: '😐', label: 'Okay' },
    { value: 'meh', emoji: '😕', label: 'Meh' },
    { value: 'rough', emoji: '😢', label: 'Rough' },
  ];

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

  const handleCheckIn = async () => {
    if (!currentSpace || !user) return;

    try {
      setLoading(true);

      await checkInsService.createCheckIn(user.id, {
        space_id: currentSpace.id,
        mood: mood || 'okay',
        note: goals || undefined,
        gratitude: gratitude || undefined,
      });

      // Mark this guided flow as complete (reusing first_message_sent field)
      await markFlowComplete(user.id, 'first_message_sent');

      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating check-in:', error);
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
              <Heart className="w-10 h-10 text-pink-600 dark:text-pink-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Complete Your Daily Check-In
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Take a moment to reflect on your day and share how you're feeling.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Daily check-ins help you stay connected with yourself and your partner.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
                aria-label="Skip check-in"
              >
                Skip for now
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Start daily check-in"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Check-in Questions */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                How are you feeling today?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Take a moment to reflect on your current state
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Mood Rating *
              </label>
              <div className="grid grid-cols-5 gap-2">
                {moodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setMood(option.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg font-medium transition-all min-h-[44px] ${
                      mood === option.value
                        ? 'bg-pink-600 text-white ring-2 ring-pink-300 dark:ring-pink-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={`Set mood to ${option.label}`}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="text-xs">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="energy-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Energy Level: {energy}/5
              </label>
              <input
                id="energy-level"
                type="range"
                min="1"
                max="5"
                value={energy}
                onChange={(e) => setEnergy(e.target.value)}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-600"
                aria-label="Energy level slider"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            <div>
              <label htmlFor="gratitude" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What are you grateful for today? (Optional)
              </label>
              <textarea
                id="gratitude"
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="Something that made you smile or feel thankful..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="goals" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Goals for today (Optional)
              </label>
              <textarea
                id="goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="What do you want to accomplish today?"
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
              <p className="text-sm text-pink-800 dark:text-pink-300">
                <strong>Tip:</strong> Daily check-ins help build self-awareness and improve communication with your partner!
              </p>
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
                onClick={handleCheckIn}
                disabled={!mood || loading}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                aria-label={loading ? 'Saving check-in...' : 'Complete check-in'}
              >
                {loading ? 'Saving...' : 'Complete Check-In'}
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <Heart className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Check-In Complete!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your daily check-in has been recorded.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Keep the streak going and check in daily to track your well-being.
              </p>
            </div>

            <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                What you can do with check-ins:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 mt-0.5">•</span>
                  <span>Track your mood and energy patterns over time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 mt-0.5">•</span>
                  <span>Build a streak by checking in daily</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 mt-0.5">•</span>
                  <span>Share your feelings with your partner</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 mt-0.5">•</span>
                  <span>Practice gratitude and set daily intentions</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
              aria-label="View check-in history"
            >
              View Check-In History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
