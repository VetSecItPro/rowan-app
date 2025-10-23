'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface ClientErrorBoundaryProps {
  children: ReactNode;
}

export default function ClientErrorBoundary({ children }: ClientErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error for debugging
    console.error('App-level error caught:', error, errorInfo);

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