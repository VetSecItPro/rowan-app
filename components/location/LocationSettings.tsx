'use client';

import { useState } from 'react';
import { showWarning } from '@/lib/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  MapPin,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Clock,
  Trash2,
  Plus,
  Home,
  Building,
  School,
  Briefcase,
  ShoppingBag,
  Heart,
  Zap,
  Check,
} from 'lucide-react';
import { useFamilyLocation } from '@/hooks/useFamilyLocation';
import type { LocationSharingSettings } from '@/lib/services/family-location-service';
import { cn } from '@/lib/utils';

interface LocationSettingsProps {
  spaceId: string;
  className?: string;
}

// Available place icons
const PLACE_ICON_OPTIONS = [
  { id: 'home', Icon: Home, label: 'Home' },
  { id: 'work', Icon: Briefcase, label: 'Work' },
  { id: 'school', Icon: School, label: 'School' },
  { id: 'shopping', Icon: ShoppingBag, label: 'Shopping' },
  { id: 'gym', Icon: Zap, label: 'Gym' },
  { id: 'hospital', Icon: Heart, label: 'Hospital' },
  { id: 'office', Icon: Building, label: 'Office' },
  { id: 'map-pin', Icon: MapPin, label: 'Other' },
];

// Predefined colors
const COLOR_OPTIONS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

const PRECISION_OPTIONS = [
  { value: 'exact', label: 'Exact', description: 'Share your precise location' },
  { value: 'approximate', label: 'Approximate', description: 'Fuzz location to ~500m' },
  { value: 'city', label: 'City only', description: 'Only share city-level location' },
  { value: 'hidden', label: 'Hidden', description: 'Don\'t share location' },
] as const;

export function LocationSettings({ spaceId, className }: LocationSettingsProps) {
  const {
    places,
    settings,
    isLoading,
    updateSettings,
    createPlace,
    deletePlace,
    currentLocation,
  } = useFamilyLocation(spaceId, { enableTracking: false });

  const [showAddPlace, setShowAddPlace] = useState(false);
  const [deletingPlaceId, setDeletingPlaceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // New place form state
  const [newPlace, setNewPlace] = useState({
    name: '',
    icon: 'home',
    color: '#3b82f6',
    latitude: 0,
    longitude: 0,
    address: null as string | null,
    radius_meters: 150,
    notify_on_arrival: true,
    notify_on_departure: true,
  });

  const handleSettingChange = async (key: keyof LocationSharingSettings, value: boolean | string | number) => {
    setIsSaving(true);
    await updateSettings({ [key]: value });
    setIsSaving(false);
  };

  const handleAddPlace = async () => {
    if (!newPlace.name.trim()) return;

    // Use current location if available
    const lat = newPlace.latitude || currentLocation?.latitude || 0;
    const lng = newPlace.longitude || currentLocation?.longitude || 0;

    if (!lat || !lng) {
      showWarning('Please enable location to add a place, or enter coordinates manually.');
      return;
    }

    const success = await createPlace({
      ...newPlace,
      latitude: lat,
      longitude: lng,
    });

    if (success) {
      setShowAddPlace(false);
      setNewPlace({
        name: '',
        icon: 'home',
        color: '#3b82f6',
        latitude: 0,
        longitude: 0,
        address: null,
        radius_meters: 150,
        notify_on_arrival: true,
        notify_on_departure: true,
      });
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    setDeletingPlaceId(placeId);
    await deletePlace(placeId);
    setDeletingPlaceId(null);
  };

  const useCurrentLocation = () => {
    if (currentLocation) {
      setNewPlace((prev) => ({
        ...prev,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }));
    }
  };

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-gray-700 bg-gray-800 p-6', className)}>
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-gray-700 bg-gray-800 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center">
          <Settings className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Location Settings</h3>
          <p className="text-sm text-gray-400">Manage your location sharing preferences</p>
        </div>
      </div>

      {/* Sharing Settings */}
      <div className="p-4 space-y-4">
        {/* Sharing Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.sharing_enabled ? (
              <Eye className="w-5 h-5 text-green-600" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium text-white">Share my location</p>
              <p className="text-sm text-gray-400">Let family members see where you are</p>
            </div>
          </div>
          <button
            onClick={() => handleSettingChange('sharing_enabled', !settings?.sharing_enabled)}
            disabled={isSaving}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              settings?.sharing_enabled ? 'bg-green-500' : 'bg-gray-600'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                settings?.sharing_enabled && 'translate-x-6'
              )}
            />
          </button>
        </div>

        {/* Precision Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Location precision
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRECISION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSettingChange('precision', option.value)}
                disabled={isSaving}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  settings?.precision === option.value
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 hover:border-gray-600'
                )}
              >
                <p className="font-medium text-white text-sm">{option.label}</p>
                <p className="text-xs text-gray-400">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">Notifications</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="text-white">Arrival notifications</span>
            </div>
            <button
              onClick={() => handleSettingChange('notify_arrivals', !settings?.notify_arrivals)}
              disabled={isSaving}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                settings?.notify_arrivals ? 'bg-blue-500' : 'bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  settings?.notify_arrivals && 'translate-x-6'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 text-gray-400" />
              <span className="text-white">Departure notifications</span>
            </div>
            <button
              onClick={() => handleSettingChange('notify_departures', !settings?.notify_departures)}
              disabled={isSaving}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                settings?.notify_departures ? 'bg-blue-500' : 'bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  settings?.notify_departures && 'translate-x-6'
                )}
              />
            </button>
          </div>
        </div>

        {/* History Retention */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Clock className="w-4 h-4 inline mr-2" />
            Keep location history for
          </label>
          <select
            value={settings?.history_retention_days ?? 7}
            onChange={(e) => handleSettingChange('history_retention_days', parseInt(e.target.value))}
            disabled={isSaving}
            className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white"
          >
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
      </div>

      {/* Saved Places */}
      <div className="border-t border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-white">Saved Places</h4>
            <button
              onClick={() => setShowAddPlace(true)}
              className="flex items-center gap-1.5 text-sm text-blue-400 hover:underline"
            >
              <Plus className="w-4 h-4" />
              Add place
            </button>
          </div>

          {places.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No saved places yet. Add home, work, or other important locations.
            </p>
          ) : (
            <div className="space-y-2">
              {places.map((place) => {
                const IconComponent = PLACE_ICON_OPTIONS.find((o) => o.id === place.icon)?.Icon || MapPin;
                return (
                  <div
                    key={place.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${place.color}20` }}
                      >
                        <IconComponent className="w-5 h-5" style={{ color: place.color }} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{place.name}</p>
                        <p className="text-xs text-gray-400">
                          {place.radius_meters}m radius
                          {place.notify_on_arrival && ' • Arrival alerts'}
                          {place.notify_on_departure && ' • Departure alerts'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePlace(place.id)}
                      disabled={deletingPlaceId === place.id}
                      className="p-2 text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      {deletingPlaceId === place.id ? (
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Place Modal */}
      <AnimatePresence>
        {showAddPlace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAddPlace(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold text-white">Add New Place</h3>
              </div>

              <div className="p-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Place name
                  </label>
                  <input
                    type="text"
                    value={newPlace.name}
                    onChange={(e) => setNewPlace((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Home, Work, School"
                    className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-white"
                  />
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLACE_ICON_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setNewPlace((prev) => ({ ...prev, icon: option.id }))}
                        className={cn(
                          'p-2 rounded-lg border transition-colors',
                          newPlace.icon === option.id
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-gray-700'
                        )}
                        title={option.label}
                      >
                        <option.Icon className="w-5 h-5" style={{ color: newPlace.color }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewPlace((prev) => ({ ...prev, color }))}
                        className={cn(
                          'w-8 h-8 rounded-full transition-transform',
                          newPlace.color === color && 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {newPlace.color === color && <Check className="w-4 h-4 text-white mx-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Location
                  </label>
                  <button
                    onClick={useCurrentLocation}
                    disabled={!currentLocation}
                    className="w-full mb-2 px-3 py-2 rounded-lg border border-dashed border-gray-600 hover:border-blue-400 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                  >
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Use current location
                  </button>
                  {newPlace.latitude !== 0 && (
                    <p className="text-sm text-gray-400">
                      {newPlace.latitude.toFixed(6)}, {newPlace.longitude.toFixed(6)}
                    </p>
                  )}
                </div>

                {/* Radius */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Geofence radius: {newPlace.radius_meters}m
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={50}
                    value={newPlace.radius_meters}
                    onChange={(e) => setNewPlace((prev) => ({ ...prev, radius_meters: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>50m</span>
                    <span>1000m</span>
                  </div>
                </div>

                {/* Notifications */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPlace.notify_on_arrival}
                      onChange={(e) => setNewPlace((prev) => ({ ...prev, notify_on_arrival: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Notify on arrival</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPlace.notify_on_departure}
                      onChange={(e) => setNewPlace((prev) => ({ ...prev, notify_on_departure: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Notify on departure</span>
                  </label>
                </div>
              </div>

              <div className="p-4 border-t border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowAddPlace(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlace}
                  disabled={!newPlace.name.trim() || (newPlace.latitude === 0 && !currentLocation)}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Place
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
