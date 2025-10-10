'use client';

import { useState } from 'react';
import { Home, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import StepIndicator from './StepIndicator';
import { useAuth } from '@/lib/contexts/auth-context';
import { choresService } from '@/lib/services/chores-service';
import { markFlowComplete } from '@/lib/services/user-progress-service';

interface GuidedHouseholdCreationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedHouseholdCreation({ onComplete, onSkip }: GuidedHouseholdCreationProps) {
  const { user, currentSpace } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'once'>('weekly');
  const [assignedTo, setAssignedTo] = useState<string>('');

  const stepTitles = ['Welcome', 'Chore Details', 'Success'];

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

  const handleCreateChore = async () => {
    if (!currentSpace || !user) return;

    try {
      setLoading(true);

      await choresService.createChore({
        space_id: currentSpace.id,
        title: title || 'My First Chore',
        description,
        frequency,
        assigned_to: assignedTo || undefined,
        status: 'pending',
      });

      // Mark this guided flow as complete
      await markFlowComplete(user.id, 'first_household_task_created');

      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating chore:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-amber-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <StepIndicator currentStep={currentStep} totalSteps={3} stepTitles={stepTitles} />

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 dark:bg-amber-900 rounded-full">
              <Home className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Create Your First Household Chore
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Keep your home organized by tracking household tasks.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Assign chores and share responsibilities fairly.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
                aria-label="Skip chore creation"
              >
                Skip for now
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Start creating first chore"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Chore Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What needs to be done?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Set up a household task to keep things running smoothly
              </p>
            </div>

            <div>
              <label htmlFor="chore-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chore Title *
              </label>
              <input
                id="chore-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Vacuum living room"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all min-h-[44px]"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="chore-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="chore-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this chore..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frequency *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'once', label: 'Once' },
                ].map((freq) => (
                  <button
                    key={freq.value}
                    onClick={() => setFrequency(freq.value as typeof frequency)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all min-h-[44px] ${
                      frequency === freq.value
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label={`Set frequency to ${freq.label}`}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="assigned-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign To (Optional)
              </label>
              <select
                id="assigned-to"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all min-h-[44px]"
              >
                <option value="">Unassigned</option>
                <option value={user?.id || ''}>Me</option>
              </select>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Tip:</strong> Set recurring chores to automatically track your household routine!
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
                onClick={handleCreateChore}
                disabled={!title.trim() || loading}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                aria-label={loading ? 'Creating chore...' : 'Create chore'}
              >
                {loading ? 'Creating...' : 'Create Chore'}
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <Home className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Chore Created Successfully!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your first household chore has been added.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                You can now track and manage household tasks together.
              </p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                What you can do with household chores:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                  <span>Track daily, weekly, or monthly recurring chores</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                  <span>Assign chores to split responsibilities fairly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                  <span>Mark chores as complete and track progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                  <span>See completion statistics and maintain a clean home</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
              aria-label="Go to household chores"
            >
              Go to Household Chores
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
