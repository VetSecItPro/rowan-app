'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Navigation,
  Battery,
  BatteryCharging,
  Home,
  Building,
  School,
  Briefcase,
  ShoppingBag,
  Heart,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Zap,
  Smartphone,
} from 'lucide-react';
import { useFamilyLocation } from '@/hooks/useFamilyLocation';
import { formatDistance, isNative } from '@/lib/native';
import type { FamilyMemberLocation, FamilyPlace } from '@/lib/services/family-location-service';
import { cn } from '@/lib/utils';

interface FamilyMapProps {
  spaceId: string;
  className?: string;
}

// Icon mapping for places
const PLACE_ICONS: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
  home: Home,
  work: Briefcase,
  school: School,
  shopping: ShoppingBag,
  gym: Zap,
  hospital: Heart,
  office: Building,
  'map-pin': MapPin,
};

// Status indicator colors
const STATUS_COLORS = {
  recent: 'bg-green-500',      // < 5 minutes
  moderate: 'bg-yellow-500',   // 5-30 minutes
  stale: 'bg-orange-500',      // 30-60 minutes
  old: 'bg-gray-400',          // > 60 minutes
};

function getStatusColor(minutesAgo: number): string {
  if (minutesAgo < 5) return STATUS_COLORS.recent;
  if (minutesAgo < 30) return STATUS_COLORS.moderate;
  if (minutesAgo < 60) return STATUS_COLORS.stale;
  return STATUS_COLORS.old;
}

function getTimeAgo(minutesAgo: number): string {
  if (minutesAgo < 1) return 'Just now';
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FamilyMap({ spaceId, className }: FamilyMapProps) {
  const {
    familyLocations,
    places,
    currentLocation,
    isLoading,
    isTracking,
    error,
    permissionStatus,
    startTracking,
    stopTracking: _stopTracking,
    refreshFamilyLocations,
  } = useFamilyLocation(spaceId, {
    // Only enable tracking on native mobile apps - desktop just views
    enableTracking: isNative,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const [selectedMember, setSelectedMember] = useState<FamilyMemberLocation | null>(null);
  const [_showAddPlace, _setShowAddPlace] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFamilyLocations();
    setIsRefreshing(false);
  };

  // Desktop/Web: Show "download app" prompt instead of location permission
  if (!isNative && (permissionStatus === 'prompt' || permissionStatus === 'denied' || permissionStatus === 'unavailable')) {
    // On desktop, skip permission prompt and just show the family locations
    // The component will continue to render the family view below
  }

  // Mobile only: Permission request prompt
  if (isNative && (permissionStatus === 'prompt' || permissionStatus === 'denied')) {
    return (
      <div className={cn('rounded-xl border border-gray-700 bg-gray-800 p-6', className)}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-900/30 flex items-center justify-center mb-4">
            <Navigation className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Enable Location Sharing
          </h3>
          <p className="text-gray-400 mb-6 max-w-sm">
            Share your location with family members to stay connected and ensure everyone&apos;s safety.
          </p>
          {permissionStatus === 'denied' && (
            <div className="flex items-center gap-2 text-amber-400 mb-4">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Location access was denied. Please enable it in your device settings.</span>
            </div>
          )}
          <button
            onClick={startTracking}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Enable Location
          </button>
        </div>
      </div>
    );
  }

  // Mobile only: Unavailable state
  if (isNative && permissionStatus === 'unavailable') {
    return (
      <div className={cn('rounded-xl border border-gray-700 bg-gray-800 p-6', className)}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Location Not Available
          </h3>
          <p className="text-gray-400 max-w-sm">
            Location services are not available on this device or browser.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-gray-700 bg-gray-800 p-6', className)}>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading family locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-gray-700 bg-gray-800 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Family Location</h3>
            <p className="text-sm text-gray-400">
              {familyLocations.length} {familyLocations.length === 1 ? 'member' : 'members'} sharing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Refresh locations"
          >
            <RefreshCw className={cn('w-5 h-5 text-gray-400', isRefreshing && 'animate-spin')} />
          </button>
          {/* Only show tracking status on native mobile */}
          {isNative ? (
            isTracking ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-900/30 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            ) : (
              <button
                onClick={startTracking}
                className="text-xs font-medium text-blue-400 hover:underline"
              >
                Start sharing
              </button>
            )
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-800 px-2 py-1 rounded-full">
              <Smartphone className="w-3 h-3" />
              View only
            </span>
          )}
        </div>
      </div>

      {/* Desktop prompt to download app */}
      {!isNative && (
        <div className="px-4 py-3 bg-blue-900/20 border-b border-blue-800">
          <div className="flex items-center gap-2 text-blue-300">
            <Smartphone className="w-4 h-4" />
            <span className="text-sm">Download the Rowan app on your phone to share your location with family.</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-4 py-3 bg-red-900/20 border-b border-red-800">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Family Members List */}
      <div className="divide-y divide-gray-700">
        {familyLocations.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No family members are sharing their location yet.</p>
          </div>
        ) : (
          familyLocations.map((member) => (
            <FamilyMemberCard
              key={member.user_id}
              member={member}
              places={places}
              currentLocation={currentLocation}
              isSelected={selectedMember?.user_id === member.user_id}
              onClick={() => setSelectedMember(selectedMember?.user_id === member.user_id ? null : member)}
            />
          ))
        )}
      </div>

      {/* Saved Places Section */}
      {places.length > 0 && (
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Saved Places</h4>
          <div className="flex flex-wrap gap-2">
            {places.map((place) => {
              const Icon = PLACE_ICONS[place.icon] || MapPin;
              return (
                <div
                  key={place.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700"
                >
                  <Icon className="w-4 h-4" color={place.color} />
                  <span className="text-sm text-gray-300">{place.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Member Details */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-700 overflow-hidden"
          >
            <MemberDetails member={selectedMember} places={places} currentLocation={currentLocation} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FamilyMemberCardProps {
  member: FamilyMemberLocation;
  places: FamilyPlace[];
  currentLocation: { latitude: number; longitude: number } | null;
  isSelected: boolean;
  onClick: () => void;
}

function FamilyMemberCard({ member, places: _places, currentLocation, isSelected, onClick }: FamilyMemberCardProps) {
  // Find if member is at a known place
  const currentPlace = member.current_place;
  const statusColor = getStatusColor(member.minutes_ago);
  const timeAgo = getTimeAgo(member.minutes_ago);

  // Calculate distance from current user
  let distanceText = '';
  if (currentLocation && member.latitude && member.longitude) {
    const distance = formatDistance(
      Math.sqrt(
        Math.pow((currentLocation.latitude - member.latitude) * 111320, 2) +
        Math.pow((currentLocation.longitude - member.longitude) * 111320 * Math.cos(currentLocation.latitude * Math.PI / 180), 2)
      )
    );
    distanceText = distance;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 flex items-center gap-4 hover:bg-gray-700/50 transition-colors text-left',
        isSelected && 'bg-blue-900/20'
      )}
    >
      {/* Avatar with status indicator */}
      <div className="relative">
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {member.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-800',
            statusColor
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{member.name}</span>
          {member.battery_level !== null && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              {member.is_charging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Battery className={cn('w-3.5 h-3.5', member.battery_level < 0.2 ? 'text-red-500' : 'text-gray-400')} />
              )}
              {Math.round(member.battery_level * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {currentPlace ? (
            <span className="flex items-center gap-1">
              {(() => {
                const Icon = PLACE_ICONS[currentPlace.icon] || MapPin;
                return <Icon className="w-3.5 h-3.5" color={currentPlace.color} />;
              })()}
              {currentPlace.name}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {distanceText ? `${distanceText} away` : 'Location shared'}
            </span>
          )}
          <span className="text-gray-400">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className={cn('w-5 h-5 text-gray-400 transition-transform', isSelected && 'rotate-90')} />
    </button>
  );
}

interface MemberDetailsProps {
  member: FamilyMemberLocation;
  places: FamilyPlace[];
  currentLocation: { latitude: number; longitude: number } | null;
}

function MemberDetails({ member, places: _places, currentLocation: _currentLocation }: MemberDetailsProps) {
  return (
    <div className="p-4 bg-gray-900/50">
      <div className="grid grid-cols-2 gap-4">
        {/* Accuracy */}
        {member.accuracy && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Accuracy</p>
            <p className="text-sm font-medium text-white">
              ±{Math.round(member.accuracy)}m
            </p>
          </div>
        )}

        {/* Battery */}
        {member.battery_level !== null && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Battery</p>
            <div className="flex items-center gap-2">
              {member.is_charging ? (
                <BatteryCharging className="w-4 h-4 text-green-500" />
              ) : (
                <Battery className={cn('w-4 h-4', member.battery_level < 0.2 ? 'text-red-500' : 'text-gray-500')} />
              )}
              <span className="text-sm font-medium text-white">
                {Math.round(member.battery_level * 100)}%
                {member.is_charging && ' (charging)'}
              </span>
            </div>
          </div>
        )}

        {/* Coordinates */}
        <div className="p-3 bg-gray-800 rounded-lg col-span-2">
          <p className="text-xs text-gray-400 mb-1">Coordinates</p>
          <p className="text-sm font-mono text-white">
            {member.latitude.toFixed(6)}, {member.longitude.toFixed(6)}
          </p>
        </div>

        {/* Privacy indicator */}
        <div className="p-3 bg-gray-800 rounded-lg col-span-2">
          <p className="text-xs text-gray-400 mb-1">Sharing precision</p>
          <div className="flex items-center gap-2">
            {member.precision === 'exact' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-white">Exact location</span>
              </>
            )}
            {member.precision === 'approximate' && (
              <>
                <MapPin className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-white">Approximate (~500m)</span>
              </>
            )}
            {member.precision === 'city' && (
              <>
                <Building className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-white">City level only</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Open in Maps button */}
      <a
        href={`https://www.google.com/maps?q=${member.latitude},${member.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        <Navigation className="w-4 h-4" />
        Open in Maps
      </a>
    </div>
  );
}
