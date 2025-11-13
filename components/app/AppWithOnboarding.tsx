'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useZeroSpacesDetection, useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { FirstSpaceOnboarding } from '@/components/ui/FirstSpaceOnboarding';
import { SmartOnboarding } from '@/components/onboarding/SmartOnboarding';
import { DashboardSkeleton } from '@/components/ui/LoadingStates';
import { featureFlags } from '@/lib/constants/feature-flags';
import { usePathname } from 'next/navigation';

/**
 * APP WITH ONBOARDING WRAPPER - PHASE 4 INTEGRATION
 *
 * This component integrates zero-spaces detection with the FirstSpaceOnboarding UI.
 * It intercepts the app flow when users have zero spaces and guides them through
 * creating their first workspace.
 *
 * Flow:
 * 1. Show authentication loading while auth is being checked
 * 2. Show spaces loading while spaces are being loaded
 * 3. If user has zero spaces, show FirstSpaceOnboarding
 * 4. Otherwise, render normal app content
 *
 * This resolves the original zero-spaces issue that caused login spinning.
 */

interface AppWithOnboardingProps {
  children: React.ReactNode;
}

export function AppWithOnboarding({ children }: AppWithOnboardingProps) {
  const pathname = usePathname();
  const authRoutes = ['/login', '/signup', '/reset-password', '/forgot-password', '/restore-account'];
  const isAuthRoute = pathname ? authRoutes.some(route => pathname === route || pathname?.startsWith(`${route}/`)) : false;

  const { shouldShowOnboarding, isCheckingSpaces } = useZeroSpacesDetection();
  const {
    user,
    authLoading,
    spacesLoading,
    isAuthenticated,
    hasZeroSpaces,
    refreshSpaces,
    createSpace
  } = useAuthWithSpaces();

  const [loadingTimeoutReached, setLoadingTimeoutReached] = useState(false);

  const handleCreateFirstSpace = useCallback(async () => {
    const defaultName = user?.name ? `${user.name}'s Space` : 'Personal Workspace';
    const result = await createSpace(defaultName);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create space');
    }
    await refreshSpaces();
  }, [createSpace, refreshSpaces, user?.name]);

  // Timeout guard for spaces loading (12 seconds max)
  useEffect(() => {
    if (isAuthenticated && (isCheckingSpaces || spacesLoading) && !loadingTimeoutReached) {
      const timeoutTimer = setTimeout(() => {
        console.warn('[AppWithOnboarding] Loading timeout reached - showing warning');
        setLoadingTimeoutReached(true);
      }, 12000); // 12 second timeout

      return () => clearTimeout(timeoutTimer);
    }
  }, [isAuthenticated, isCheckingSpaces, spacesLoading, loadingTimeoutReached]);

  // Reset timeout when spaces loading completes
  useEffect(() => {
    if (!spacesLoading && !isCheckingSpaces) {
      setLoadingTimeoutReached(false);
    }
  }, [spacesLoading, isCheckingSpaces]);

  // OPTIMIZED: Optimistic UI - show skeleton immediately while auth loads
  // This eliminates the 500ms blocking spinner and provides instant visual feedback
  if (authLoading) {
    return isAuthRoute ? <>{children}</> : <DashboardSkeleton />;
  }

  if (isAuthRoute) {
    return <>{children}</>;
  }

  // If not authenticated, show normal app (login page will handle this)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // OPTIMIZED: Show content with skeleton overlay instead of full blocking
  // Users can see the interface structure while spaces load
  if (isCheckingSpaces || spacesLoading) {
    // If timeout reached, show error banner but allow app to continue
    if (loadingTimeoutReached) {
      return (
        <>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>Loading is taking longer than expected.</strong> The app may not function correctly.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Check your internet connection and try refreshing the page.
                </p>
              </div>
              <button
                onClick={() => {
                  setLoadingTimeoutReached(false);
                  refreshSpaces();
                }}
                className="ml-4 px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
              >
                Retry
              </button>
            </div>
          </div>
          {children}
        </>
      );
    }

    // Show skeleton if spaces are still loading (first 12 seconds)
    return (
      <>
        {/* Show children with skeleton overlay */}
        <div className="relative">
          {children}
          {/* Optional: could add a subtle overlay here if needed */}
        </div>
      </>
    );
  }

  // Show onboarding for zero-spaces scenario
  if (shouldShowOnboarding && hasZeroSpaces) {
    // Use Smart Onboarding if feature flag is enabled, otherwise fall back to traditional onboarding
    if (featureFlags.isSmartOnboardingEnabled()) {
      return (
        <SmartOnboarding
          isOpen={true}
          onClose={() => {
            console.log('Smart onboarding completed - user should now have access to the app');
            // The SmartOnboarding component handles its own space creation and navigation
            // No additional action needed here as refreshSpaces() is called internally
          }}
        />
      );
    }

    // Traditional onboarding fallback
    return (
      <FirstSpaceOnboarding
        userName={user?.name || user?.email?.split('@')[0] || 'there'}
        onCreateSpace={handleCreateFirstSpace}
        onSkip={() => {
          console.log('User skipped onboarding - continuing to app');
        }}
      />
    );
  }

  // Normal app flow - user is authenticated and has spaces (or chose to skip onboarding)
  return <>{children}</>;
}

/**
 * Type definitions for TypeScript support
 */
export interface OnboardingWrapperProps {
  children: React.ReactNode;
}
