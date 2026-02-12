'use client';

import React from 'react';

export function AuthLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0c0c12] to-[#0f0f14]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-400">Loading authentication...</p>
      </div>
    </div>
  );
}

/**
 * OPTIMIZED: Dashboard Skeleton for Instant Loading
 *
 * Shows the actual dashboard layout while auth data loads in background
 * Provides immediate visual feedback instead of blocking spinner
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0c0c12] to-[#0f0f14]">
      {/* Header Skeleton */}
      <header className="bg-[#0a0a0f]/95 border-b border-gray-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg animate-pulse"></div>
              <div className="w-20 h-8 bg-gray-700 rounded animate-pulse"></div>
            </div>

            {/* Nav Items */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-700 rounded-md animate-pulse"></div>
              <div className="w-10 h-10 bg-gray-700 rounded-md animate-pulse"></div>
              <div className="w-32 h-10 bg-gray-700 rounded-full animate-pulse hidden sm:block"></div>
              <div className="w-20 h-10 bg-emerald-800 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="w-64 h-8 bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="w-96 h-6 bg-gray-800 rounded animate-pulse"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 bg-gray-600 rounded animate-pulse"></div>
                <div className="w-12 h-6 bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="w-20 h-8 bg-gray-600 rounded animate-pulse mb-2"></div>
              <div className="w-32 h-4 bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-32 h-6 bg-gray-600 rounded animate-pulse"></div>
                  <div className="w-20 h-6 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-gray-600 rounded animate-pulse"></div>
                      <div className="flex-1 h-4 bg-gray-700 rounded animate-pulse"></div>
                      <div className="w-16 h-4 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="w-24 h-6 bg-gray-600 rounded animate-pulse mb-4"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-4 bg-gray-700 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay with subtle loading indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-gray-800/95 rounded-lg px-3 py-2 shadow-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-400">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpacesLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#0c0c12] to-[#0f0f14]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your spaces...</p>
      </div>
    </div>
  );
}