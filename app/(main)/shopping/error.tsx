'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ShoppingCart, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function ShoppingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <ShoppingCart className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">
          Shopping Error
        </h2>
        <p className="text-gray-400 mb-6">
          Something went wrong loading your shopping lists. Your items are safe — try refreshing.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
