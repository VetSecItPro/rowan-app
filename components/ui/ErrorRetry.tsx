'use client';

import { RefreshCw, WifiOff, AlertCircle, ServerCrash } from 'lucide-react';
import { useState } from 'react';

interface ErrorRetryProps {
  /** The error message to display */
  message?: string;
  /** Custom error title */
  title?: string;
  /** Function to call when retry is clicked */
  onRetry: () => void | Promise<void>;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Error type for appropriate icon */
  errorType?: 'network' | 'server' | 'generic';
}

/**
 * A reusable error component with retry functionality.
 * Shows an appropriate error message and a retry button.
 * Designed for mobile-first with large touch targets.
 */
export function ErrorRetry({
  message = 'Something went wrong. Please try again.',
  title,
  onRetry,
  className = '',
  size = 'md',
  errorType = 'generic',
}: ErrorRetryProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Small delay to show loading state
      setTimeout(() => setIsRetrying(false), 300);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'p-4',
      icon: 'w-8 h-8',
      title: 'text-base',
      message: 'text-sm',
      button: 'px-4 py-2 text-sm min-h-[40px]',
    },
    md: {
      container: 'p-6',
      icon: 'w-12 h-12',
      title: 'text-lg',
      message: 'text-base',
      button: 'px-5 py-3 text-base min-h-[48px]',
    },
    lg: {
      container: 'p-8',
      icon: 'w-16 h-16',
      title: 'text-xl',
      message: 'text-lg',
      button: 'px-6 py-4 text-lg min-h-[56px]',
    },
  };

  const classes = sizeClasses[size];

  // Select icon based on error type
  const IconComponent = {
    network: WifiOff,
    server: ServerCrash,
    generic: AlertCircle,
  }[errorType];

  // Default titles based on error type
  const defaultTitles = {
    network: 'Connection Problem',
    server: 'Server Error',
    generic: 'Oops!',
  };

  const displayTitle = title || defaultTitles[errorType];

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        bg-gray-800/50
        border border-gray-700
        rounded-xl
        ${classes.container}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Error Icon */}
      <div
        className={`
          ${classes.icon}
          text-gray-400
          mb-4
        `}
      >
        <IconComponent className="w-full h-full" />
      </div>

      {/* Title */}
      <h3
        className={`
          ${classes.title}
          font-semibold
          text-white
          mb-2
        `}
      >
        {displayTitle}
      </h3>

      {/* Message */}
      <p
        className={`
          ${classes.message}
          text-gray-400
          mb-6
          max-w-sm
        `}
      >
        {message}
      </p>

      {/* Retry Button - Mobile optimized with large touch target */}
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className={`
          ${classes.button}
          inline-flex items-center justify-center gap-2
          bg-blue-600 hover:bg-blue-700
          disabled:bg-blue-400
          text-white font-medium
          rounded-xl
          transition-all duration-200
          active:scale-[0.98]
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30
          disabled:cursor-not-allowed
          touch-manipulation
        `}
        aria-label={isRetrying ? 'Retrying...' : 'Try again'}
      >
        <RefreshCw
          className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`}
        />
        {isRetrying ? 'Retrying...' : 'Try Again'}
      </button>
    </div>
  );
}

/**
 * Inline variant for smaller error states within content
 */
export function ErrorRetryInline({
  message = 'Failed to load',
  onRetry,
  className = '',
}: Omit<ErrorRetryProps, 'size' | 'title' | 'errorType'>) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => setIsRetrying(false), 300);
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-3
        bg-red-900/20
        border border-red-800
        rounded-lg
        ${className}
      `}
      role="alert"
    >
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <span className="text-sm text-red-300 flex-1">
        {message}
      </span>
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="
          px-3 py-1.5 min-h-[36px]
          text-sm font-medium
          text-red-400
          hover:bg-red-900/30
          rounded-lg
          transition-colors
          active:scale-[0.98]
          touch-manipulation
        "
        aria-label={isRetrying ? 'Retrying...' : 'Retry'}
      >
        <RefreshCw
          className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`}
        />
      </button>
    </div>
  );
}

/**
 * Full-page error state for route-level errors
 */
export function ErrorRetryFullPage({
  message = 'We couldn\'t load this page. Please check your connection and try again.',
  title = 'Something Went Wrong',
  onRetry,
  errorType = 'generic',
}: Omit<ErrorRetryProps, 'size' | 'className'>) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <ErrorRetry
        title={title}
        message={message}
        onRetry={onRetry}
        errorType={errorType}
        size="lg"
        className="max-w-md w-full"
      />
    </div>
  );
}
