'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity } from 'lucide-react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
import { usePrefetchAllData } from '@/lib/hooks/usePrefetchData';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { WelcomeWidget } from '@/components/dashboard/WelcomeWidget';
import { TodayAtAGlance } from '@/components/dashboard/TodayAtAGlance';
import { StatCardGrid } from '@/components/dashboard/StatCardGrid';
import { CheckInSection } from '@/components/dashboard/CheckInSection';
import { RewardsSection } from '@/components/dashboard/RewardsSection';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';
import { InvitePartnerModal } from '@/components/spaces/InvitePartnerModal';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';

// Lazy-load below-fold heavy components
const CountdownWidget = nextDynamic(
  () => import('@/components/calendar/CountdownWidget').then(mod => ({ default: mod.CountdownWidget })),
  { loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-48" /> }
);

const AIDashboard = nextDynamic(
  () => import('@/components/dashboard/AIDashboard').then(mod => ({ default: mod.AIDashboard })),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-64" /> }
);

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, currentSpace, authLoading, spacesLoading, refreshSpaces } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { mode: dashboardMode, setDashboardMode, mounted: dashModeMounted } = useDashboardMode();

  // Prefetch all feature data immediately for instant navigation
  usePrefetchAllData({ delay: 300 });

  // Handle ?invite=true query parameter from header dropdown
  useEffect(() => {
    if (searchParams?.get('invite') === 'true' && spaceId) {
      setShowInviteModal(true);
      router.replace('/dashboard', { scroll: false });
    }
  }, [searchParams, spaceId, router]);

  const { stats, loading: statsLoading, refreshStats } = useDashboardStats(user, currentSpace, authLoading);

  // Auth protection — redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Loading state while checking authentication and loading spaces
  if (authLoading || spacesLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // AI Dashboard mode — full-page inline chat experience
  if (dashModeMounted && dashboardMode === 'ai') {
    return (
      <PageErrorBoundary pageName="AI Dashboard" pageDescription="your AI-powered dashboard with Rowan">
        <AIDashboard onSwitchToTraditional={() => setDashboardMode('traditional')} />
      </PageErrorBoundary>
    );
  }

  return (
    <PageErrorBoundary pageName="Dashboard" pageDescription="your main dashboard with tasks, stats, and check-ins">
      <FeatureLayout
        breadcrumbItems={[{ label: 'Dashboard' }]}
        backgroundVariant="vibrant"
        enableTimeAware={true}
      >
        <PullToRefresh onRefresh={refreshStats}>
          <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:p-5">
            <h1 className="sr-only">Dashboard</h1>
            <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
              {/* Welcome Greeting */}
              <WelcomeWidget userName={user?.name ?? undefined} />

              {/* Today at a Glance */}
              {spaceId && <TodayAtAGlance spaceId={spaceId} />}

              {/* 8 Feature Stat Cards */}
              <StatCardGrid stats={stats} loading={statsLoading} />

              {/* Real-time indicator */}
              <div className="flex items-center justify-end gap-2 text-xs sm:text-sm text-gray-400 -mt-2">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 animate-pulse" />
                <span>Real-time updates</span>
              </div>

              {/* Countdown Widget */}
              {spaceId && (
                <div className="mb-6">
                  <CountdownWidget
                    spaceId={spaceId}
                    maxItems={6}
                    onEventClick={(eventId) => router.push(`/calendar?event=${eventId}`)}
                    onAddCountdown={() => router.push('/calendar')}
                  />
                </div>
              )}

              {/* Daily Check-In & Activity Feed */}
              {spaceId && <CheckInSection userId={user.id} spaceId={spaceId} />}

              {/* Rewards Section — Points & Leaderboard */}
              {spaceId && <RewardsSection userId={user.id} spaceId={spaceId} />}
            </div>
          </div>

          {/* Space Management Modals */}
          <CreateSpaceModal
            isOpen={showCreateSpaceModal}
            onClose={() => setShowCreateSpaceModal(false)}
            onSpaceCreated={() => {
              refreshSpaces();
              setShowCreateSpaceModal(false);
            }}
          />

          {spaceId && (
            <InvitePartnerModal
              isOpen={showInviteModal}
              onClose={() => setShowInviteModal(false)}
              spaceId={spaceId}
              spaceName={currentSpace?.name || ''}
            />
          )}
        </PullToRefresh>
      </FeatureLayout>
    </PageErrorBoundary>
  );
}
