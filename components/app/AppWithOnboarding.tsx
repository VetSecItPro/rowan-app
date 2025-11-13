'use client';

import React, { useMemo, useCallback } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { DashboardSkeleton } from '@/components/ui/LoadingStates';
import { usePathname } from 'next/navigation';

interface AppWithOnboardingProps {
  children: React.ReactNode;
}

export function AppWithOnboarding({ children }: AppWithOnboardingProps) {
  const pathname = usePathname();
  const authRoutes = useMemo(
    () => ['/login', '/signup', '/reset-password', '/forgot-password', '/restore-account'],
    []
  );
  const isAuthRoute = useMemo(() => {
    if (!pathname) return false;
    return authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  }, [authRoutes, pathname]);

  const {
    user,
    authLoading,
    spacesLoading,
    isAuthenticated,
    hasZeroSpaces,
    refreshSpaces,
    createSpace,
  } = useAuthWithSpaces();

  const handleCreateSpace = useCallback(async () => {
    try {
      const defaultName = user?.name ? `${user.name}'s Space` : 'My Space';
      const result = await createSpace(defaultName);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create space');
      }
      await refreshSpaces();
    } catch (error) {
      console.error('Failed to create space:', error);
    }
  }, [createSpace, refreshSpaces, user?.name]);

  if (authLoading) {
    return isAuthRoute ? <>{children}</> : <DashboardSkeleton />;
  }

  if (!isAuthenticated || isAuthRoute) {
    return <>{children}</>;
  }

  if (spacesLoading) {
    return <DashboardSkeleton />;
  }

  if (hasZeroSpaces) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-950 to-black text-center px-4">
        <div className="max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to Rowan</h1>
            <p className="text-gray-400">
              Create your first space to start organizing tasks, reminders, and goals together.
            </p>
          </div>

          <button
            onClick={handleCreateSpace}
            className="w-full px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition"
          >
            Create Your Space
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
