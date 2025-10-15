'use client';

import { useState } from 'react';
import { CheckSquare, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import StepIndicator from './StepIndicator';
import { useAuth } from '@/lib/contexts/auth-context';
import { tasksService } from '@/lib/services/tasks-service';
import { markFlowComplete } from '@/lib/services/user-progress-service';

interface GuidedTaskCreationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedTaskCreation({ onComplete, onSkip }: GuidedTaskCreationProps) {
  const { user, currentSpace } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');

  const stepTitles = ['Welcome', 'Task Details', 'Due Date', 'Success'];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateTask = async () => {
    if (!currentSpace || !user) return;

    try {
      setLoading(true);

      await tasksService.createTask({
        space_id: currentSpace.id,
        title: title || 'My First Task',
        description,
        due_date: dueDate || undefined,
        priority,
        status: 'pending',
      });

      // Mark this guided flow as complete
      await markFlowComplete(user.id, 'first_task_created');

      setCurrentStep(4);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <StepIndicator currentStep={currentStep} totalSteps={4} stepTitles={stepTitles} />

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full">
              <CheckSquare className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Create Your First Task
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Tasks help you stay organized and track what needs to be done.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Let's create your first task together in just a few steps.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 min-h-[44px]"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Task Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What needs to be done?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Give your task a clear title and optional description
              </p>
            </div>

            <div>
              <label htmlFor="field-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Buy groceries"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[44px]"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="field-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details about this task..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['low', 'medium', 'high'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all min-h-[44px] ${
                      priority === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
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
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!title.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Due Date */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                When should this be done?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Set an optional due date for your task
              </p>
            </div>

            <div>
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[44px]"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Tip:</strong> You can always add or change the due date later from the task list.
              </p>
            </div>

            <div className="flex gap-4 justify-between pt-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleCreateTask}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {loading ? 'Creating...' : 'Create Task'}
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {currentStep === 4 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <CheckSquare className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Task Created Successfully!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your first task has been added to your task list.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                You can now view, edit, or mark it as complete from the Tasks page.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                What you can do with tasks:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>Mark tasks as complete when done</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>Assign tasks to yourself or your partner</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>Set priorities and due dates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>Organize tasks by category</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
            >
              Go to Task List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
