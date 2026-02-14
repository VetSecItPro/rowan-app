'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  MapPin,
  Navigation,
  ArrowDownCircle,
  ArrowUpCircle,
  Battery,
  Zap,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import type { UserLocation, GeofenceEvent, FamilyPlace } from '@/lib/services/family-location-service';
import { cn } from '@/lib/utils';

interface TimelineEntry {
  type: 'location' | 'geofence';
  timestamp: string;
  location?: UserLocation;
  event?: GeofenceEvent & { place?: FamilyPlace };
}

interface LocationTimelineProps {
  spaceId: string;
  className?: string;
}

/** Displays a chronological timeline of location history events. */
export function LocationTimeline({ spaceId, className }: LocationTimelineProps) {
  const [history, setHistory] = useState<UserLocation[]>([]);
  const [events, setEvents] = useState<(GeofenceEvent & { place?: FamilyPlace })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [historyRes, eventsRes] = await Promise.all([
        fetch(`/api/location/history?space_id=${spaceId}&hours=${hours}`),
        fetch(`/api/location/events?space_id=${spaceId}&hours=${hours}`),
      ]);

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.data ?? []);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data ?? []);
      }
    } catch {
      setError('Failed to load location history');
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, hours]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Merge location updates and geofence events into a single timeline
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = [];

    // Add location points (sample every 5th to avoid overwhelming the timeline)
    const sampledHistory = sampleLocations(history, 30);
    for (const loc of sampledHistory) {
      entries.push({ type: 'location', timestamp: loc.recorded_at, location: loc });
    }

    // Add geofence events
    for (const event of events) {
      entries.push({ type: 'geofence', timestamp: event.occurred_at, event });
    }

    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return entries;
  }, [history, events]);

  // Group by day
  const groupedTimeline = useMemo(() => {
    const groups: { label: string; entries: TimelineEntry[] }[] = [];
    let currentLabel = '';

    for (const entry of timeline) {
      const date = new Date(entry.timestamp);
      let label: string;
      if (isToday(date)) label = 'Today';
      else if (isYesterday(date)) label = 'Yesterday';
      else label = format(date, 'EEEE, MMM d');

      if (label !== currentLabel) {
        groups.push({ label, entries: [entry] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    }

    return groups;
  }, [timeline]);

  return (
    <div className={cn('bg-gray-800 border border-gray-700 rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          <h3 className="font-semibold text-white text-sm sm:text-base">Location Activity</h3>
          {!isLoading && (
            <span className="text-xs text-gray-400 ml-1">
              {history.length} points
            </span>
          )}
        </div>

        {/* Time range selector */}
        <div className="relative">
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="appearance-none bg-gray-700 border border-gray-600 text-gray-300 text-xs sm:text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value={6}>Last 6h</option>
            <option value={12}>Last 12h</option>
            <option value={24}>Last 24h</option>
            <option value={48}>Last 2 days</option>
            <option value={168}>Last 7 days</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" aria-hidden="true" />
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <span className="ml-2 text-gray-400 text-sm">Loading history...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <MapPin className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-gray-400 text-sm">{error}</p>
            <button
              onClick={fetchHistory}
              className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Navigation className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-gray-400 text-sm">No location history yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Location data appears here when you share your location from the mobile app
            </p>
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-4 space-y-6">
            <AnimatePresence initial={false}>
              {groupedTimeline.map((group) => (
                <motion.div
                  key={group.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1"
                >
                  {/* Day label */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    {group.label}
                  </p>

                  {/* Timeline entries */}
                  <div className="relative pl-6 space-y-0">
                    {/* Vertical line */}
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-700" />

                    {group.entries.map((entry, idx) => (
                      <TimelineItem key={`${entry.type}-${entry.timestamp}-${idx}`} entry={entry} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const time = format(new Date(entry.timestamp), 'h:mm a');
  const relativeTime = formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true });

  if (entry.type === 'geofence' && entry.event) {
    const isArrival = entry.event.event_type === 'arrival';
    const Icon = isArrival ? ArrowDownCircle : ArrowUpCircle;
    const placeName = entry.event.place?.name ?? 'Unknown place';

    return (
      <div className="relative flex items-start gap-3 py-2.5 group">
        {/* Dot */}
        <div className={cn(
          'absolute left-[-15px] w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center',
          isArrival
            ? 'bg-green-500/20 border-green-500'
            : 'bg-orange-500/20 border-orange-500'
        )}>
          <Icon className={cn(
            'w-2.5 h-2.5',
            isArrival ? 'text-green-400' : 'text-orange-400'
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">
            {isArrival ? 'Arrived at' : 'Left'}{' '}
            <span className={isArrival ? 'text-green-400' : 'text-orange-400'}>
              {placeName}
            </span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {time} · {relativeTime}
          </p>
        </div>
      </div>
    );
  }

  if (entry.type === 'location' && entry.location) {
    const loc = entry.location;
    const hasBattery = loc.battery_level !== null;
    const batteryPct = loc.battery_level ? Math.round(loc.battery_level * 100) : null;
    const speed = loc.speed !== null ? Math.round(loc.speed * 3.6) : null; // m/s → km/h

    return (
      <div className="relative flex items-start gap-3 py-2 group">
        {/* Dot */}
        <div className="absolute left-[-15px] w-[18px] h-[18px] rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-300">
              Location update
            </p>
            {speed !== null && speed > 5 && (
              <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                {speed} km/h
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
            <span>{time}</span>
            {loc.accuracy && (
              <span>±{Math.round(loc.accuracy)}m</span>
            )}
            {hasBattery && batteryPct !== null && (
              <span className="flex items-center gap-0.5">
                {loc.is_charging ? (
                  <Zap className="w-3 h-3 text-yellow-400" aria-hidden="true" />
                ) : (
                  <Battery className={cn(
                    'w-3 h-3',
                    batteryPct > 50 ? 'text-green-400' :
                    batteryPct > 20 ? 'text-yellow-400' : 'text-red-400'
                  )} aria-hidden="true" />
                )}
                {batteryPct}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Sample location points to avoid overwhelming the timeline.
 * Keeps the first and last points, then evenly samples up to maxPoints.
 */
function sampleLocations(locations: UserLocation[], maxPoints: number): UserLocation[] {
  if (locations.length <= maxPoints) return locations;

  const result: UserLocation[] = [locations[0]];
  const step = (locations.length - 1) / (maxPoints - 1);

  for (let i = 1; i < maxPoints - 1; i++) {
    result.push(locations[Math.round(i * step)]);
  }

  result.push(locations[locations.length - 1]);
  return result;
}
