'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { logger } from '@/lib/logger';

interface ClientErrorBoundaryProps {
  children: ReactNode;
}

/** Wraps children in a client-side error boundary with fallback UI. */
export default function ClientErrorBoundary({ children }: ClientErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error for debugging
    logger.error('App-level error caught:', undefined, { component: 'ClientErrorBoundary', action: 'component_action', details: error, errorInfo });

    // In production, this could send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, {
      //   extra: errorInfo,
      //   tags: {
      //     section: 'RootLayout',
      //   },
      // });
    }
  };

  return (
    <ErrorBoundary
      onError={handleError}
      showReportButton={true}
    >
      {children}
    </ErrorBoundary>
  );
}