'use client';

import { forwardRef } from 'react';

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'blue' | 'green' | 'red';
  label?: string;
  description?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ id, checked, onChange, disabled = false, size = 'md', color = 'purple', label, description }, ref) => {
    const sizeClasses = {
      sm: {
        container: 'w-9 h-5 p-0.5',
        thumb: 'w-4 h-4',
        translate: 'translate-x-4',
      },
      md: {
        container: 'w-12 h-6 p-0.5',
        thumb: 'w-5 h-5',
        translate: 'translate-x-5',
      },
      lg: {
        container: 'w-14 h-8 p-0.5',
        thumb: 'w-7 h-7',
        translate: 'translate-x-5',
      },
    };

    const colorClasses = {
      purple: 'bg-purple-600',
      blue: 'bg-blue-600',
      green: 'bg-green-600',
      red: 'bg-red-600',
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
          <div
            className={`
              relative
              ${sizeClasses[size].container}
              ${checked ? colorClasses[color] : 'bg-gray-300 dark:bg-gray-600'}
              rounded-full
              transition-colors
              duration-200
              ease-in-out
              peer-disabled:opacity-50
              peer-disabled:cursor-not-allowed
              peer-focus:outline-none
              peer-focus:ring-2
              peer-focus:ring-purple-500
              peer-focus:ring-offset-2
              flex
              items-center
            `}
          >
            <div
              className={`
                bg-white
                rounded-full
                ${sizeClasses[size].thumb}
                transition-transform
                duration-200
                ease-in-out
                shadow-md
                ${checked ? sizeClasses[size].translate : 'translate-x-0'}
              `}
            />
          </div>
        </label>

        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={id}
                className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
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