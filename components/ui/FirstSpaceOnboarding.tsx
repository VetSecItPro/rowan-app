'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface FirstSpaceOnboardingProps {
  userName?: string;
  onCreateSpace?: () => Promise<void>;
  onSkip?: () => void;
}

export function FirstSpaceOnboarding({ userName, onCreateSpace, onSkip }: FirstSpaceOnboardingProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!onCreateSpace || isCreating) return;
    setIsCreating(true);
    setError(null);
    try {
      await onCreateSpace();
    } catch (err) {
      console.error('[FirstSpaceOnboarding] Space creation failed', err);
      setError(err instanceof Error ? err.message : 'Failed to create space.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md mx-auto text-center p-8 bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl backdrop-blur border border-white/40 dark:border-gray-800/40 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Rowan
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {userName ? `Hi ${userName}, ` : ''}create your first space to get started organizing your life.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 transition disabled:opacity-70 disabled:cursor-not-allowed"
          onClick={handleCreate}
          disabled={isCreating || !onCreateSpace}
        >
          {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
          {isCreating ? 'Creating Space...' : 'Create Your First Space'}
        </button>

        {onSkip && (
          <button
            className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onSkip}
            disabled={isCreating}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
