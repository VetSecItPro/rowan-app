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

// Secure storage
export {
  secureSet,
  secureGet,
  secureRemove,
  secureClear,
} from './secure-storage';

// Voice recorder
export {
  isRecordingAvailable,
  requestAudioPermission,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
} from './voice-recorder';

// App badge
export {
  isBadgeSupported,
  setBadgeCount,
  getBadgeCount,
  clearBadge,
} from './badge';

// In-app review
export {
  isReviewAvailable,
  requestReview,
} from './in-app-review';

// File picker
export {
  pickFile,
  pickImages,
  type PickedFile,
} from './file-picker';

// Local notifications
export {
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
  getPendingNotifications,
  checkPermissions as checkNotificationPermissions,
  requestPermissions as requestNotificationPermissions,
  type ScheduleNotificationOptions,
  type PendingNotification,
} from './local-notifications';

// Share
export {
  shareContent,
  canShare,
  type ShareOptions,
} from './share';

// Camera
export {
  takePicture,
  pickImage,
  isCameraAvailable,
  type CameraResult,
  type CameraPictureOptions,
} from './camera';

// Storage (Preferences)
export {
  setItem,
  getItem,
  removeItem,
  clear as clearStorage,
  keys as storageKeys,
} from './storage';

// Contacts
export {
  pickContact,
  getContacts,
  isContactsAvailable,
  type ContactInfo,
} from './contacts';

// Biometric authentication
export {
  isBiometricAvailable,
  getBiometricType,
  authenticate,
  type BiometricType,
} from './biometric-auth';
