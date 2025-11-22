'use client';

import React, { useState } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { DashboardSkeleton, SpacesLoadingState } from '@/components/ui/LoadingStates';
import { BetaFeedbackButton } from '@/components/beta/BetaFeedbackButton';

interface AppWithOnboardingProps {
  children: React.ReactNode;
}

export function AppWithOnboarding({ children }: AppWithOnboardingProps) {
  const {
    isAuthenticated,
    authLoading,
    spacesLoading,
    hasZeroSpaces,
    currentSpace,
    refreshSpaces,
    isReady,
  } = useAuthWithSpaces();
  const [retrying, setRetrying] = useState(false);

  // Auth pages are no longer wrapped with this component, but guard just in case
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  if (authLoading || spacesLoading || !isReady) {
    return <DashboardSkeleton />;
  }

  if (!currentSpace) {
    if (!hasZeroSpaces) {
      return <SpacesLoadingState />;
    }

    const handleRetry = async () => {
      try {
        setRetrying(true);

        // First, try normal space refresh
        await refreshSpaces();

        // If still no spaces after refresh, check if user is orphaned and auto-fix
        if (!currentSpace && !hasZeroSpaces) {
          console.log('[AppWithOnboarding] Auto-fixing orphaned user...');

          // Create a space for this orphaned user
          const spaceName = `${user?.email?.split('@')[0] || 'My'} Space`;
          const result = await createSpace(spaceName);

          if (result.success) {
            console.log('[AppWithOnboarding] Successfully created space for orphaned user');
            // Refresh spaces again to load the new space
            await refreshSpaces();
          } else {
            console.error('[AppWithOnboarding] Failed to create space for orphaned user:', result.error);
          }
        }
      } finally {
        setRetrying(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-950 to-black text-center px-4">
        <div className="max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Finalizing your workspace</h1>
            <p className="text-gray-400">
              Your household space is provisioning. This usually takes just a few seconds. Click retry to check again.
            </p>
          </div>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold transition"
          >
            {retrying ? 'Refreshing...' : 'Retry space lookup'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <BetaFeedbackButton />
    </>
  );
}
