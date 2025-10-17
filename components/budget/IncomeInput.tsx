'use client';

import { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, Check } from 'lucide-react';
import { safeValidateMonthlyIncome } from '@/lib/validations/budget-templates';

interface IncomeInputProps {
  value: number;
  onChange: (value: number) => void;
  onValidChange?: (isValid: boolean) => void;
  label?: string;
  helpText?: string;
  required?: boolean;
  className?: string;
  showValidation?: boolean;
}

export function IncomeInput({
  value,
  onChange,
  onValidChange,
  label = 'Monthly Income',
  helpText = 'Enter your total monthly household income',
  required = true,
  className = '',
  showValidation = true,
}: IncomeInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value.toString() || '');
  }, [value]);

  // Validate input
  const validateInput = (valueStr: string): boolean => {
    if (!valueStr.trim()) {
      if (required) {
        setError('Monthly income is required');
        return false;
      }
      setError(null);
      return true;
    }

    const numValue = parseFloat(valueStr);

    // Check if it's a valid number
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return false;
    }

    // Validate with Zod schema
    const validation = safeValidateMonthlyIncome(numValue);

    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || 'Invalid income value';
      setError(errorMessage);
      return false;
    }

    setError(null);
    return true;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Only validate after user has touched the field
    if (touched) {
      const isValid = validateInput(newValue);
      onValidChange?.(isValid);
    }

    // Update parent value if valid number
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    } else if (newValue === '') {
      onChange(0);
    }
  };

  // Handle blur (when user leaves the field)
  const handleBlur = () => {
    setTouched(true);
    const isValid = validateInput(inputValue);
    onValidChange?.(isValid);
  };

  const isValid = !error && touched && inputValue.trim() !== '';
  const showError = showValidation && touched && error;
  const showSuccess = showValidation && isValid && !error;

  return (
    <div className={className}>
      {/* Label */}
      {label && (
        <label
          htmlFor="income-input"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Field */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          $
        </span>
        <input
          id="income-input"
          type="number"
          step="100"
          min="0"
          max="10000000"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="5000"
          className={`w-full pl-8 pr-12 py-3 bg-white dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors ${
            showError
              ? 'border-red-500 dark:border-red-500'
              : showSuccess
              ? 'border-green-500 dark:border-green-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={error ? 'income-error' : helpText ? 'income-help' : undefined}
        />

        {/* Validation Icon */}
        {showValidation && touched && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {error ? (
              <AlertCircle className="w-5 h-5 text-red-500" aria-label="Invalid input" />
            ) : isValid ? (
              <Check className="w-5 h-5 text-green-500" aria-label="Valid input" />
            ) : null}
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && !showError && (
        <p id="income-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {showError && (
        <p
          id="income-error"
          className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}

      {/* Success Message (optional) */}
      {showSuccess && value > 0 && (
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          ${value.toLocaleString()}/month
        </p>
      )}
    </div>
  );
}
