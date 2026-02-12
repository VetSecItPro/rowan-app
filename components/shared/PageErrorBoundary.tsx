'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { logger } from '@/lib/logger';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
  pageDescription?: string;
}

export default function PageErrorBoundary({
  children,
  pageName = 'Page',
  pageDescription
}: PageErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error with page context
    logger.error('${pageName} error:', undefined, { component: 'PageErrorBoundary', action: 'component_action', details: error, errorInfo });

    // In production, this could send to error reporting service with page context
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, {
      //   extra: errorInfo,
      //   tags: {
      //     section: pageName,
      //     type: 'page-error',
      //   },
      // });
    }
  };

  // Custom fallback UI for page-level errors
  const PageErrorFallback = (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-6 shadow-lg">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>

          <h2 className="text-lg font-bold text-white mb-2">
            {pageName} Error
          </h2>

          <p className="text-sm text-gray-400 mb-4">
            {pageDescription
              ? `Something went wrong while loading ${pageDescription}. Your data is safe.`
              : `Something went wrong on this page. Your data is safe.`
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>

            <button
              onClick={() => window.history.back()}
              className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={PageErrorFallback}
    >
      {children}
    </ErrorBoundary>
  );
}