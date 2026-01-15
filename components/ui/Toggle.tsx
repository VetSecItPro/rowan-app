'use client';

import { forwardRef } from 'react';

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'blue' | 'green' | 'red' | 'orange';
  label?: string;
  description?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ id, checked, onChange, disabled = false, size = 'md', color = 'purple', label, description }, ref) => {
    // iOS-style toggle sizing (width should be about 2x height)
    const sizeClasses = {
      sm: {
        container: 'w-10 h-5',
        thumb: 'w-4 h-4',
        padding: 'p-0.5',
        translateOn: 'translate-x-5', // Move right when ON
      },
      md: {
        container: 'w-12 h-6',
        thumb: 'w-5 h-5',
        padding: 'p-0.5',
        translateOn: 'translate-x-6', // Move right when ON
      },
      lg: {
        container: 'w-16 h-8',
        thumb: 'w-7 h-7',
        padding: 'p-0.5',
        translateOn: 'translate-x-8', // Move right when ON
      },
    };

    const colorClasses = {
      purple: 'bg-purple-600',
      blue: 'bg-blue-600',
      green: 'bg-green-600',
      red: 'bg-red-600',
      orange: 'bg-orange-600',
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
    };

    return (
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className="sr-only peer"
          />

          {/* Toggle container - pill background */}
          <div
            className={`
              relative
              ${sizeClasses[size].container}
              ${sizeClasses[size].padding}
              ${checked ? colorClasses[color] : 'bg-gray-600'}
              rounded-full
              transition-all
              duration-300
              ease-in-out
              peer-disabled:opacity-50
              peer-disabled:cursor-not-allowed
              peer-focus:outline-none
              peer-focus:ring-2
              peer-focus:ring-purple-500
              peer-focus:ring-offset-2
              shadow-inner
            `}
          >
            {/* Toggle thumb - sliding circle */}
            <div
              className={`
                absolute
                top-0.5
                left-0.5
                bg-white
                rounded-full
                ${sizeClasses[size].thumb}
                transition-all
                duration-300
                ease-in-out
                shadow-lg
                ${checked ? sizeClasses[size].translateOn : 'translate-x-0'}
                transform
              `}
            />
          </div>
        </label>

        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={id}
                className="text-sm font-medium text-white cursor-pointer hover:text-purple-400 transition-colors"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-gray-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';