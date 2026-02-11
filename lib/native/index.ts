/**
 * Native Bridge Exports
 *
 * Central export for all native capabilities.
 * Import from '@/lib/native' in components.
 */

// Platform detection
export {
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  isPluginAvailable,
  getPlatform,
  convertFileSrc,
  getDeviceInfo,
} from './capacitor';

// Push notifications
export {
  isPushAvailable,
  requestPushPermissions,
  registerForPush,
  setupNotificationListeners,
  getDeliveredNotifications,
  removeDeliveredNotifications,
  removeAllDeliveredNotifications,
  type PushNotificationToken,
  type NotificationPayload,
} from './push-notifications';

// Geolocation / Location tracking
export {
  isGeolocationAvailable,
  checkLocationPermissions,
  requestLocationPermissions,
  getCurrentPosition,
  watchPosition,
  calculateDistance,
  isWithinGeofence,
  formatDistance,
  getRecommendedUpdateInterval,
  type LocationData,
  type LocationPermissionStatus,
} from './geolocation';

// Barcode scanning
export {
  isScannerAvailable,
  startScanner,
  stopScanner,
  scanFromFile,
  type ScanResult,
  type ScannerOptions,
} from './barcode';

// Calendar sync
export {
  isCalendarAvailable,
  requestCalendarPermission,
  checkCalendarPermission,
  addEventToCalendar,
  deleteCalendarEvent,
  getDeviceCalendars,
  openDeviceCalendar,
  type CalendarEvent,
  type CalendarPermissionStatus,
} from './calendar';

// Haptic feedback
export {
  triggerHaptic,
  triggerSelectionHaptic,
  ImpactStyle,
} from './haptics';

// Network status
export {
  isNetworkAvailable,
  getNetworkStatus,
  isOnline,
  getConnectionQuality,
  watchNetworkStatus,
  getTimeoutForQuality,
  shouldDeferRequest,
  type NetworkStatus,
  type ConnectionQuality,
} from './network';
