'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Users,
  Navigation,
  Settings,
  Shield,
  Smartphone,
  Map,
  Bell,
  ChevronRight,
  Clock,
  Home,
  RefreshCw,
} from 'lucide-react';
import nextDynamic from 'next/dynamic';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { FeatureGateWrapper } from '@/components/subscription/FeatureGateWrapper';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { useFamilyLocation } from '@/hooks/useFamilyLocation';
import { isNative } from '@/lib/native';
import { cn } from '@/lib/utils';

// Lazy-load heavy map/location components to reduce First Load JS (FIX-016)
const FamilyMapView = nextDynamic(
  () => import('@/components/location/FamilyMapView').then(mod => ({ default: mod.FamilyMapView })),
  {
    loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-96" />,
    ssr: false,
  }
);

const LocationSettings = nextDynamic(
  () => import('@/components/location/LocationSettings').then(mod => ({ default: mod.LocationSettings })),
  {
    loading: () => <div className="animate-pulse bg-gray-800 rounded-lg h-64" />,
    ssr: false,
  }
);

type ViewMode = 'map' | 'settings';

export default function LocationPageClient({ spaceId }: { spaceId: string }) {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    familyLocations,
    places,
    settings: _settings,
    isLoading,
    refreshFamilyLocations,
  } = useFamilyLocation(spaceId, {
    enableTracking: isNative,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // Memoized stats
  const stats = useMemo(() => {
    const activeMembers = familyLocations.filter(m => m.minutes_ago < 60).length;
    const totalMembers = familyLocations.length;
    const savedPlaces = places.length;
    const recentActivity = familyLocations.filter(m => m.minutes_ago < 15).length;

    return { activeMembers, totalMembers, savedPlaces, recentActivity };
  }, [familyLocations, places]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshFamilyLocations();
    setIsRefreshing(false);
  }, [refreshFamilyLocations]);

  return (
    <FeatureGateWrapper
      feature="location"
      title="Family Location"
      description="Keep your family connected and safe with real-time location sharing. Upgrade to Pro to unlock this feature."
    >
      <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Family Location' }]}>
        <PageErrorBoundary>
          <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
            <div className="p-4 sm:p-6 md:p-8">
              <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-row items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-location flex items-center justify-center flex-shrink-0 shadow-lg">
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-3xl md:text-3xl lg:text-4xl font-bold bg-gradient-location bg-clip-text text-transparent">
                        Family Location
                      </h1>
                      <p className="text-sm sm:text-base text-gray-400">
                        {isNative ? 'Stay connected with your family' : 'View where your family is'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 p-1.5 bg-gradient-to-r from-cyan-900/30 to-cyan-800/30 rounded-xl border border-cyan-700 sm:min-w-[240px]">
                      <button
                        onClick={() => setViewMode('map')}
                        className={cn(
                          'px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium flex-1',
                          viewMode === 'map'
                            ? 'bg-gradient-location text-white shadow-md'
                            : 'text-gray-300 hover:bg-gray-800/50'
                        )}
                      >
                        <Map className="w-4 h-4" />
                        <span className="text-sm">Map</span>
                      </button>
                      <button
                        onClick={() => setViewMode('settings')}
                        className={cn(
                          'px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-medium flex-1',
                          viewMode === 'settings'
                            ? 'bg-gradient-location text-white shadow-md'
                            : 'text-gray-300 hover:bg-gray-800/50'
                        )}
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Settings</span>
                      </button>
                    </div>

                    {/* Refresh Button */}
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing || isLoading}
                      className="px-4 py-2.5 sm:py-3 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 transition-all shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base font-medium disabled:opacity-50"
                    >
                      <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                      <span className="sm:inline hidden">Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Stats Dashboard */}
                <CollapsibleStatsGrid
                  icon={MapPin}
                  title="Location Stats"
                  summary={isLoading ? 'Loading...' : `${stats.activeMembers} active • ${stats.savedPlaces} places`}
                  iconGradient="bg-gradient-location"
                >
                  {/* Active Members */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Active Now</h3>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-location rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl sm:text-3xl font-bold text-white">{stats.activeMembers}</p>
                      {stats.activeMembers > 0 && (
                        <div className="flex items-center gap-1 text-cyan-400">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-xs font-medium">Sharing</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total Members */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Total Members</h3>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalMembers}</p>
                      <div className="flex items-center gap-1 text-blue-400">
                        <Navigation className="w-3 h-3" />
                        <span className="text-xs font-medium">Tracked</span>
                      </div>
                    </div>
                  </div>

                  {/* Saved Places */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Saved Places</h3>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl sm:text-3xl font-bold text-white">{stats.savedPlaces}</p>
                      {stats.savedPlaces > 0 && (
                        <div className="flex items-center gap-1 text-purple-400">
                          <Bell className="w-3 h-3" />
                          <span className="text-xs font-medium">Geofenced</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-gray-400 font-medium text-xs sm:text-sm">Recent Activity</h3>
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl sm:text-3xl font-bold text-white">{stats.recentActivity}</p>
                      {stats.recentActivity > 0 && (
                        <div className="flex items-center gap-1 text-green-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-medium">&lt;15 min</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleStatsGrid>

                {/* Mobile App Prompt (Desktop only) */}
                {!isNative && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-700/50 rounded-xl p-4 sm:p-5 md:p-6"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">Share Your Location</h3>
                        <p className="text-sm text-gray-400">
                          Download the Rowan app on your phone to share your location with family members.
                          Desktop users can view locations but must use the mobile app to share.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Shield className="w-5 h-5" />
                        <span className="text-sm font-medium">Privacy Protected</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Main Content */}
                <AnimatePresence mode="wait">
                  {viewMode === 'map' ? (
                    <motion.div
                      key="map"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FamilyMapView spaceId={spaceId} className="shadow-xl" />

                      {/* Quick Actions */}
                      {places.length > 0 && (
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {places.slice(0, 3).map((place) => (
                            <div
                              key={place.id}
                              className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: `${place.color}20` }}
                                >
                                  <MapPin className="w-5 h-5" style={{ color: place.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-white truncate">{place.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {familyLocations.filter(m =>
                                      m.current_place?.id === place.id
                                    ).length} members here
                                  </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="settings"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                      <LocationSettings spaceId={spaceId} className="shadow-xl" />

                      {/* Privacy Info Card */}
                      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 h-fit">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">Your Privacy Matters</h3>
                            <p className="text-sm text-gray-400">We take your data seriously</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-cyan-400 text-xs font-bold">1</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-300 text-sm">Family-Only Access</p>
                              <p className="text-xs text-gray-500">Only your family members can see your location</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-cyan-400 text-xs font-bold">2</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-300 text-sm">Full Control</p>
                              <p className="text-xs text-gray-500">Adjust precision or turn off sharing anytime</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-cyan-400 text-xs font-bold">3</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-300 text-sm">Auto-Delete History</p>
                              <p className="text-xs text-gray-500">Location history is automatically cleaned up</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-cyan-400 text-xs font-bold">4</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-300 text-sm">Encrypted & Secure</p>
                              <p className="text-xs text-gray-500">All data is encrypted in transit and at rest</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </PullToRefresh>
        </PageErrorBoundary>
      </FeatureLayout>
    </FeatureGateWrapper>
  );
}
