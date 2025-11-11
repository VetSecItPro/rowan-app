'use client';

import React from 'react';

/**
 * Authentication Error States
 *
 * Provides consistent error UI components for the new authentication architecture.
 * Integrates with existing design language and error handling patterns.
 *
 * Used for:
 * - Authentication failures
 * - Session expiry
 * - Space loading errors
 * - Network connectivity issues
 * - Permission denied scenarios
 * - Zero spaces handling
 * - General app errors
 */

// Base error icon component matching existing design patterns
function ErrorIcon({ size = 'md', className = '' }: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 ${sizeClasses[size]} ${className}`}
    >
      <svg
        className={`text-red-600 dark:text-red-400 ${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        role="img"
        aria-label="Error"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </div>
  );
}

/**
 * Full-screen error state for authentication failures
 * Used when user session is invalid or authentication fails
 */
export function AuthErrorState({
  onRetry,
  onSignOut,
  message = "Authentication failed"
}: {
  onRetry?: () => void;
  onSignOut?: () => void;
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="text-center p-8 max-w-md">
        <ErrorIcon size="lg" className="mx-auto mb-6" />
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {message}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            There was a problem with your authentication. Please try again or sign out to continue.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Full-screen error state for spaces loading failures
 * Used when user's workspaces cannot be loaded
 */
export function SpacesErrorState({
  onRetry,
  onCreateSpace,
  error = "Failed to load workspaces"
}: {
  onRetry?: () => void;
  onCreateSpace?: () => void;
  error?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="text-center p-8 max-w-md">
        <ErrorIcon size="lg" className="mx-auto mb-6" />
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Workspace Loading Error
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error}. This might be a temporary network issue.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Reload Workspaces
            </button>
          )}
          {onCreateSpace && (
            <button
              onClick={onCreateSpace}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Create New Workspace
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Error state for zero spaces scenario
 * Used when user has no workspaces and needs to create their first one
 */
export function NoSpacesFoundState({
  onCreateSpace,
  onRefresh,
  userName = "there"
}: {
  onCreateSpace?: () => void;
  onRefresh?: () => void;
  userName?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="text-center p-8 max-w-lg">
        {/* Welcome icon instead of error */}
        <div className="flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/20 h-16 w-16 mx-auto mb-6">
          <svg
            className="text-indigo-600 dark:text-indigo-400 h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0v-4a2 2 0 012-2h4a2 2 0 012 2v4"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Welcome to Rowan, {userName}!
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            It looks like you don't have any workspaces yet. Let's create your first workspace to get started with organizing your life.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          {onCreateSpace && (
            <button
              onClick={onCreateSpace}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Create Your First Workspace
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Network error state for connectivity issues
 * Used when API calls fail due to network problems
 */
export function NetworkErrorState({
  onRetry,
  message = "Connection lost"
}: {
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="text-center p-8 max-w-md">
        {/* Network icon */}
        <div className="flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20 h-16 w-16 mx-auto mb-6">
          <svg
            className="text-yellow-600 dark:text-yellow-400 h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {message}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please check your internet connection and try again.
          </p>
        </div>

        {onRetry && (
          <div className="mt-6">
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Permission denied error state
 * Used when user lacks permission to access a resource
 */
export function PermissionDeniedState({
  onGoBack,
  resource = "this resource"
}: {
  onGoBack?: () => void;
  resource?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="text-center p-8 max-w-md">
        {/* Shield icon */}
        <div className="flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 h-16 w-16 mx-auto mb-6">
          <svg
            className="text-red-600 dark:text-red-400 h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM6 18L18 6"
            />
          </svg>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You don't have permission to access {resource}. Please contact your administrator if you believe this is an error.
          </p>
        </div>

        {onGoBack && (
          <div className="mt-6">
            <button
              onClick={onGoBack}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline error state for components
 * Used within pages when specific features encounter errors
 */
export function InlineErrorState({
  message = "Something went wrong",
  onRetry,
  size = 'md',
  className = ''
}: {
  message?: string;
  onRetry?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <ErrorIcon size={size} className="mb-3" />
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Modal error state for async operations within modals
 * Used when modal operations fail
 */
export function ModalErrorState({
  message = "Operation failed",
  onRetry,
  onClose
}: {
  message?: string;
  onRetry?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <ErrorIcon size="md" className="mb-4" />
      <div className="text-center space-y-3 mb-6">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{message}</p>
      </div>

      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Retry
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Generic app error boundary fallback
 * Used as a fallback when unexpected errors occur
 */
export function AppErrorState({
  onReload,
  errorId,
  isDevelopment = false
}: {
  onReload?: () => void;
  errorId?: string;
  isDevelopment?: boolean;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center p-8 max-w-lg">
        <ErrorIcon size="lg" className="mx-auto mb-6" />

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            An unexpected error occurred. Our team has been notified and is working on a fix.
          </p>

          {isDevelopment && errorId && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mt-4">
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                Error ID: {errorId}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 mt-8">
          {onReload && (
            <button
              onClick={onReload}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Reload App
            </button>
          )}
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// All components are already exported above with 'export function' declarations

// Type definitions for better TypeScript support
export type ErrorSize = 'sm' | 'md' | 'lg';
export type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  size?: ErrorSize;
  className?: string;
};

export type ErrorHandlers = {
  onRetry?: () => void;
  onClose?: () => void;
  onSignOut?: () => void;
  onGoBack?: () => void;
  onReload?: () => void;
};