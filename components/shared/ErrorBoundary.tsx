'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showReportButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    logger.error('ErrorBoundary caught an error:', undefined, { component: 'ErrorBoundary', action: 'component_action', details: error, errorInfo });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, {
      //   extra: errorInfo,
      //   tags: {
      //     section: 'ErrorBoundary',
      //   },
      // });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/dashboard';
  };

  handleGoBack = () => {
    // Navigate back
    window.history.back();
  };

  handleReportError = () => {
    const { error, errorInfo } = this.state;

    // Prepare error report
    const errorReport = {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Create mailto link for error reporting
    const subject = encodeURIComponent('Rowan App Error Report');
    const body = encodeURIComponent(
      `I encountered an error while using Rowan:\n\n` +
      `Error: ${errorReport.message}\n\n` +
      `Time: ${errorReport.timestamp}\n` +
      `Page: ${errorReport.url}\n\n` +
      `Technical Details:\n${errorReport.stack}\n\n` +
      `Component Stack:\n${errorReport.componentStack}`
    );

    window.open(`mailto:support@rowan.app?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Show custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>

              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h1>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                We encountered an unexpected error. Don't worry, your data is safe.
                Try refreshing the page or go back to continue using Rowan.
              </p>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={this.handleGoBack}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Home className="w-4 h-4" />
                    Dashboard
                  </button>
                </div>

                {this.props.showReportButton && (
                  <button
                    onClick={this.handleReportError}
                    className="w-full px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors border border-gray-300 dark:border-gray-600 rounded-xl hover:border-gray-400 dark:hover:border-gray-500"
                  >
                    Report this error
                  </button>
                )}
              </div>

              {/* Development error details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-32">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for throwing errors in functional components (for testing)
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}

export default ErrorBoundary;