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
        container: 'w-8 h-4',
        thumb: 'w-3 h-3',
        translate: 'translate-x-4',
      },
      md: {
        container: 'w-11 h-6',
        thumb: 'w-5 h-5',
        translate: 'translate-x-5',
      },
      lg: {
        container: 'w-14 h-7',
        thumb: 'w-6 h-6',
        translate: 'translate-x-7',
      },
    };

    const colorClasses = {
      purple: 'peer-checked:bg-purple-600 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800',
      blue: 'peer-checked:bg-blue-600 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800',
      green: 'peer-checked:bg-green-600 peer-focus:ring-green-300 dark:peer-focus:ring-green-800',
      red: 'peer-checked:bg-red-600 peer-focus:ring-red-300 dark:peer-focus:ring-red-800',
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
              ${checked ? colorClasses[color].split(' ')[0] : 'bg-gray-200 dark:bg-gray-700'}
              peer-focus:outline-none
              peer-focus:ring-4
              ${colorClasses[color].split(' ').slice(1).join(' ')}
              rounded-full
              peer-disabled:opacity-50
              peer-disabled:cursor-not-allowed
              transition-all
              duration-200
              ease-in-out
            `}
          >
            <div
              className={`
                absolute
                top-0.5
                left-0.5
                bg-white
                rounded-full
                ${sizeClasses[size].thumb}
                transition-transform
                duration-200
                ease-in-out
                shadow
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