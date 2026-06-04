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

const config: CapacitorConfig = {
  appId: 'com.rowan.app',
  appName: 'Rowan',

  // Web assets directory (used for static builds, optional with server URL)
  webDir: 'out',

  server: {
    // Load from your deployed Vercel app
    // This keeps all API routes, SSR, and real-time features working
    url: serverUrl,

    // Always disallow HTTP cleartext traffic for security
    cleartext: false,

    // Handle navigation properly
    androidScheme: 'https',
  },

  plugins: {
    // Push Notifications - Critical for reminders and messages
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
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
      backgroundColor: '#000000', // Pure black to match splash images
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
    // Background modes in Info.plist:
    // - remote-notification (for push)
    // NOTE: family-location tracking was removed 2026-04-26 (see CLAUDE.md).
    // Do not re-add location background modes / NSLocation* keys.
  },

  // Android configuration
  android: {
    // Always false for security; dev overrides via environment-specific config
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Permissions in AndroidManifest.xml:
    // - CAMERA
    // - VIBRATE
    // NOTE: family-location tracking was removed 2026-04-26 (see CLAUDE.md).
    // Do NOT re-add ACCESS_*_LOCATION / BACKGROUND_LOCATION / RECEIVE_BOOT_COMPLETED
    // (the last was only for the location BootReceiver). Run `npx cap sync` after
    // pulling this to regenerate clean native projects (the gitignored /android,
    // /ios may hold stale location artifacts from before the removal).
  },
};

export default config;
