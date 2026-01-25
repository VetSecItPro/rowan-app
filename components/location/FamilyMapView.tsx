'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Navigation,
  RefreshCw,
  Smartphone,
  Users,
  Battery,
  BatteryCharging,
  Clock,
  Home,
  Building,
  School,
  Briefcase,
  ShoppingBag,
  Heart,
  Zap,
  AlertCircle,
  X,
} from 'lucide-react';
import { useFamilyLocation } from '@/hooks/useFamilyLocation';
import { isNative } from '@/lib/native';
import type { FamilyMemberLocation, FamilyPlace } from '@/lib/services/family-location-service';
import { cn } from '@/lib/utils';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

interface FamilyMapViewProps {
  spaceId: string;
  className?: string;
}

// Icon mapping for places
const PLACE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  work: Briefcase,
  school: School,
  shopping: ShoppingBag,
  gym: Zap,
  hospital: Heart,
  office: Building,
  'map-pin': MapPin,
};

function getTimeAgo(minutesAgo: number): string {
  if (minutesAgo < 1) return 'Just now';
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FamilyMapView({ spaceId, className }: FamilyMapViewProps) {
  const {
    familyLocations,
    places,
    currentLocation,
    isLoading,
    isTracking,
    error,
    startTracking,
    refreshFamilyLocations,
  } = useFamilyLocation(spaceId, {
    enableTracking: isNative,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMemberLocation | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Import Leaflet CSS on client side only
  useEffect(() => {
    // Dynamically add Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Use requestAnimationFrame to defer state update outside the effect execution
    const rafId = requestAnimationFrame(() => {
      setMapReady(true);
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.head.removeChild(link);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFamilyLocations();
    setIsRefreshing(false);
  };

  // Calculate map center based on family locations
  const mapCenter = useMemo(() => {
    if (currentLocation) {
      return [currentLocation.latitude, currentLocation.longitude] as [number, number];
    }
    if (familyLocations.length > 0) {
      const avgLat = familyLocations.reduce((sum, m) => sum + m.latitude, 0) / familyLocations.length;
      const avgLng = familyLocations.reduce((sum, m) => sum + m.longitude, 0) / familyLocations.length;
      return [avgLat, avgLng] as [number, number];
    }
    // Default to Dallas
    return [32.7767, -96.7970] as [number, number];
  }, [currentLocation, familyLocations]);

  // Loading state
  if (isLoading || !mapReady) {
    return (
      <div className={cn('rounded-xl border border-gray-700 bg-gray-800 overflow-hidden', className)}>
        <div className="flex flex-col items-center justify-center h-96">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading map...</p>
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
            <h3 className="font-semibold text-white">Family Map</h3>
            <p className="text-sm text-gray-400">
              <Users className="w-3.5 h-3.5 inline mr-1" />
              {familyLocations.length} {familyLocations.length === 1 ? 'member' : 'members'}
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

      {/* Desktop app download prompt */}
      {!isNative && (
        <div className="px-4 py-2 bg-blue-900/20 border-b border-blue-800">
          <div className="flex items-center gap-2 text-blue-300 text-sm">
            <Smartphone className="w-4 h-4 flex-shrink-0" />
            <span>Download the Rowan app to share your location</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="relative h-80 md:h-96">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Family member markers */}
          {familyLocations.map((member) => (
            <FamilyMemberMarker
              key={member.user_id}
              member={member}
              onClick={() => setSelectedMember(member)}
            />
          ))}

          {/* Place markers and geofence circles */}
          {places.map((place) => (
            <PlaceMarker key={place.id} place={place} />
          ))}

          {/* Current user's location (if tracking) */}
          {currentLocation && isTracking && (
            <CurrentLocationMarker
              latitude={currentLocation.latitude}
              longitude={currentLocation.longitude}
            />
          )}
        </MapContainer>

        {/* No locations overlay */}
        {familyLocations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg text-center max-w-xs">
              <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                No family members are sharing their location yet.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Family members list */}
      <div className="border-t border-gray-700">
        <div className="p-3 bg-gray-900/50">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Family Members</h4>
          <div className="flex flex-wrap gap-2">
            {familyLocations.map((member) => (
              <button
                key={member.user_id}
                onClick={() => setSelectedMember(selectedMember?.user_id === member.user_id ? null : member)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors',
                  selectedMember?.user_id === member.user_id
                    ? 'bg-blue-900/30 border-blue-700'
                    : 'bg-gray-800 border-gray-700 hover:border-blue-300'
                )}
              >
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-300">{member.name}</span>
                <span className="text-xs text-gray-500">{getTimeAgo(member.minutes_ago)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected member details panel */}
      {selectedMember && (
        <div className="border-t border-gray-700 p-4 bg-blue-900/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {selectedMember.avatar_url ? (
                <img src={selectedMember.avatar_url} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-white">{selectedMember.name}</p>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  {getTimeAgo(selectedMember.minutes_ago)}
                  {selectedMember.battery_level !== null && (
                    <>
                      <span>•</span>
                      {selectedMember.is_charging ? (
                        <BatteryCharging className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Battery className="w-3.5 h-3.5" />
                      )}
                      {Math.round(selectedMember.battery_level * 100)}%
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedMember(null)}
              className="p-1 rounded hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          {selectedMember.current_place && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              {(() => {
                const Icon = PLACE_ICONS[selectedMember.current_place.icon] || MapPin;
                return <Icon className="w-4 h-4" />;
              })()}
              <span className="text-gray-300">
                At {selectedMember.current_place.name}
              </span>
            </div>
          )}
          <a
            href={`https://www.google.com/maps?q=${selectedMember.latitude},${selectedMember.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}

// Family member marker component
function FamilyMemberMarker({
  member,
  onClick,
}: {
  member: FamilyMemberLocation;
  onClick: () => void;
}) {
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  if (!L) return null;

  // Create custom icon for family member
  const icon = L.divIcon({
    className: 'family-member-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 14px;
      ">
        ${member.avatar_url ? `<img src="${member.avatar_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />` : member.name.charAt(0).toUpperCase()}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  return (
    <Marker
      position={[member.latitude, member.longitude]}
      icon={icon}
      eventHandlers={{ click: onClick }}
    >
      <Popup>
        <div className="text-center">
          <p className="font-medium">{member.name}</p>
          <p className="text-sm text-gray-500">{getTimeAgo(member.minutes_ago)}</p>
        </div>
      </Popup>
    </Marker>
  );
}

// Place marker with geofence circle
function PlaceMarker({ place }: { place: FamilyPlace }) {
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  if (!L) return null;

  const icon = L.divIcon({
    className: 'place-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${place.color}20;
        border: 2px solid ${place.color};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${place.color}" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <>
      <Marker position={[place.latitude, place.longitude]} icon={icon}>
        <Popup>
          <div className="text-center">
            <p className="font-medium">{place.name}</p>
            <p className="text-sm text-gray-500">{place.radius_meters}m radius</p>
          </div>
        </Popup>
      </Marker>
      <Circle
        center={[place.latitude, place.longitude]}
        radius={place.radius_meters}
        pathOptions={{
          color: place.color,
          fillColor: place.color,
          fillOpacity: 0.1,
          weight: 2,
        }}
      />
    </>
  );
}

// Current location marker (pulsing blue dot)
function CurrentLocationMarker({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  if (!L) return null;

  const icon = L.divIcon({
    className: 'current-location-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid white;
        box-shadow: 0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return (
    <Marker position={[latitude, longitude]} icon={icon}>
      <Popup>
        <p className="text-center font-medium">Your location</p>
      </Popup>
    </Marker>
  );
}
