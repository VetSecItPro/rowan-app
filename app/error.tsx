'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500">
      <div className="text-center p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">Oops!</h1>
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          We're sorry, but something unexpected happened. Please try again.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
