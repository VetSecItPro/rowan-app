import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration for Rowan Native App
 *
 * This config supports two modes:
 * 1. PRODUCTION: App loads from deployed Vercel URL (keeps API routes working)
 * 2. DEVELOPMENT: App loads from localhost:3000 for testing native features
 *
 * To build for production:
 *   CAPACITOR_SERVER_URL=https://your-app.vercel.app npx cap sync
 *
 * To build for development:
 *   npx cap sync (uses localhost)
 */

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://rowan-app.vercel.app';
const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.rowan.app',
  appName: 'Rowan',

  // Web assets directory (used for static builds, optional with server URL)
  webDir: 'out',

  server: {
    // Load from your deployed Vercel app
    // This keeps all API routes, SSR, and real-time features working
    url: serverUrl,

    // Allow HTTP in development
    cleartext: !isProduction,

    // Handle navigation properly
    androidScheme: 'https',
  },

  plugins: {
    // Push Notifications - Critical for reminders, messages, location alerts
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Geolocation - For family location tracking feature
    Geolocation: {
      // iOS will prompt for background location
    },

    // Camera - For receipt scanning (already have), video messages (future)
    Camera: {
      saveToGallery: false,
    },

    // Status bar styling - Light text for dark app
    StatusBar: {
      style: 'light', // Light text on dark background
      backgroundColor: '#0a0a0a',
    },

    // Splash screen - Dark mode to match app theme
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a', // Dark background to match app
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },

    // Keyboard handling for chat
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },

  // iOS configuration
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'rowan',
    // Background modes will be added in Info.plist:
    // - location (for safe zone monitoring)
    // - remote-notification (for push)
  },

  // Android configuration
  android: {
    allowMixedContent: !isProduction,
    captureInput: true,
    webContentsDebuggingEnabled: !isProduction,
    // Permissions will be added in AndroidManifest.xml:
    // - ACCESS_FINE_LOCATION
    // - ACCESS_COARSE_LOCATION
    // - ACCESS_BACKGROUND_LOCATION
    // - CAMERA
    // - VIBRATE
    // - RECEIVE_BOOT_COMPLETED
  },
};

export default config;
