'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PublicHeader } from '@/components/layout/PublicHeader';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  beta_check_failed: {
    title: 'Unable to Verify Access',
    description: 'We encountered a temporary issue verifying your beta access. This is usually resolved quickly.',
  },
  beta_check_error: {
    title: 'Service Temporarily Unavailable',
    description: 'We\'re experiencing technical difficulties. Please try again in a few moments.',
  },
  default: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams?.get('code') || 'default';
  const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES.default;

  const handleRefresh = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          {errorInfo.title}
        </h1>

        <p className="text-gray-400 mb-8">
          {errorInfo.description}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </div>

        {code !== 'default' && (
          <p className="mt-8 text-xs text-gray-400">
            Error code: {code}
          </p>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
