'use client';

import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}

export default function StepIndicator({ currentStep, totalSteps, stepTitles }: StepIndicatorProps) {
  return (
    <div className="w-full mb-8">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-4">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={stepNumber} className="flex items-center flex-1">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-200
                    ${isCompleted
                      ? 'bg-purple-600 text-white'
                      : isCurrent
                      ? 'bg-purple-600 text-white ring-4 ring-purple-200 dark:ring-purple-900'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{stepNumber}</span>
                  )}
                </div>

                {/* Step title (mobile: only current, desktop: all) */}
                <p
                  className={`
                    mt-2 text-sm font-medium text-center
                    ${isCurrent ? 'block' : 'hidden sm:block'}
                    ${isCompleted || isCurrent
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {stepTitles[index]}
                </p>
              </div>

              {/* Connecting line */}
              {index < totalSteps - 1 && (
                <div
                  className={`
                    h-1 flex-1 mx-2 mt-0 sm:mt-0
                    transition-all duration-200
                    ${isCompleted
                      ? 'bg-purple-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                    }
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step title for mobile */}
      <div className="sm:hidden text-center">
        <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
          Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
        </p>
      </div>
    </div>
  );
}
