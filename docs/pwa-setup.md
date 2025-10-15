# PWA (Progressive Web App) Setup Guide

## Overview

Rowan is now configured as a Progressive Web App, allowing users to install it on their devices for an app-like experience.

## Features Enabled

✅ **Installable** - Users can add Rowan to their home screen
✅ **Standalone Mode** - Runs in full-screen without browser chrome
✅ **App Shortcuts** - Quick access to common actions (Tasks, Reminders, Shopping, Calendar)
✅ **Theme Color** - Matches system dark/light mode
✅ **Share Target** - Can receive shared content from other apps

## Icon Requirements

### Current Setup
- Using: `/public/rowan-logo.png`
- Sizes needed: 192x192px, 512x512px

### Recommended Icons to Create

Create the following icon files in `/public/icons/`:

1. **App Icons** (Required)
   - `icon-192.png` - 192x192px (minimum for PWA)
   - `icon-512.png` - 512x512px (high-res icon)
   - `icon-maskable-192.png` - 192x192px with safe zone
   - `icon-maskable-512.png` - 512x512px with safe zone

2. **Feature Shortcut Icons** (Optional)
   - `task.png` - 96x96px
   - `reminder.png` - 96x96px
   - `shopping.png` - 96x96px
   - `calendar.png` - 96x96px

3. **Apple Touch Icons** (iOS)
   - `apple-touch-icon.png` - 180x180px

### Icon Design Guidelines

**Maskable Icons** (for Android adaptive icons):
- Icon should fit within safe zone (80% of canvas)
- Background should extend to edges
- Use Maskable.app to preview: https://maskable.app/

**Standard Icons**:
- PNG format
- Transparent or solid background
- Simple, recognizable design
- High contrast for visibility

## Splash Screens (iOS)

Create splash screen images for iOS devices:

```
/public/splash/
├── apple-splash-2048-2732.png  (iPad Pro 12.9")
├── apple-splash-1668-2388.png  (iPad Pro 11")
├── apple-splash-1536-2048.png  (iPad 10.2")
├── apple-splash-1170-2532.png  (iPhone 13 Pro)
├── apple-splash-1125-2436.png  (iPhone 13)
└── apple-splash-750-1334.png   (iPhone SE)
```

Then add to `app/layout.tsx`:

```typescript
<head>
  <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.png"
        media="(device-width: 1024px) and (device-height: 1366px)" />
  {/* Add more splash screens for different sizes */}
</head>
```

## Screenshots

For app stores and install prompts, add screenshots:

```
/public/screenshots/
├── mobile-dashboard.png   (750x1334px)
├── mobile-tasks.png       (750x1334px)
├── desktop-dashboard.png  (1920x1080px)
└── desktop-calendar.png   (1920x1080px)
```

## Testing PWA Installation

### Desktop (Chrome/Edge)
1. Open https://your-domain.com
2. Look for install icon in address bar (⊕)
3. Click "Install Rowan"
4. App opens in standalone window

### Mobile (iOS Safari)
1. Open https://your-domain.com in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Tap "Add"
5. App icon appears on home screen

### Mobile (Android Chrome)
1. Open https://your-domain.com in Chrome
2. Tap menu (⋮)
3. Tap "Add to Home screen" or "Install app"
4. Tap "Install"
5. App icon appears on home screen

## App Shortcuts

Users can long-press the app icon to access shortcuts:
- New Task
- New Reminder
- Shopping List
- Calendar

## Share Target

Other apps can share content to Rowan:
1. User shares text/link from another app
2. Rowan appears in share menu
3. Content is received at `/share` route
4. Implement share handler in `/app/share/page.tsx`

## Service Worker (Optional - for Offline Support)

To add offline functionality, create `/public/sw.js`:

```javascript
const CACHE_NAME = 'rowan-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/tasks',
  '/reminders',
  '/shopping',
  '/calendar',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('/offline'))
  );
});
```

Then register in `app/layout.tsx`:

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);
```

## Manifest Configuration

The PWA manifest is located at `/public/manifest.json`:

```json
{
  "name": "Rowan - Your Life, Organized",
  "short_name": "Rowan",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000"
}
```

## Metadata in layout.tsx

PWA metadata is configured in `/app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Rowan',
  },
  icons: {
    icon: '/rowan-logo.png',
    apple: '/rowan-logo.png',
  },
};
```

## Verification

Use these tools to verify PWA setup:

1. **Lighthouse** (Chrome DevTools)
   - Run PWA audit
   - Check for PWA criteria compliance

2. **PWA Builder**
   - https://www.pwabuilder.com
   - Test manifest and service worker

3. **Maskable.app**
   - https://maskable.app
   - Preview maskable icons

## Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Safari (iOS 11.3+)
- ✅ Firefox (Desktop & Mobile)
- ✅ Samsung Internet
- ⚠️ iOS Safari has limited PWA support (no push notifications)

## Deployment Checklist

- [ ] Create all required icon sizes
- [ ] Create maskable icons for Android
- [ ] Add iOS splash screens
- [ ] Take app screenshots
- [ ] Test installation on iOS
- [ ] Test installation on Android
- [ ] Test installation on Desktop
- [ ] Test app shortcuts
- [ ] Verify manifest in DevTools
- [ ] Run Lighthouse PWA audit
- [ ] Implement service worker (optional)
- [ ] Create offline page (optional)

## Next Steps

1. Generate proper icon files (use a tool like https://realfavicongenerator.net/)
2. Create splash screens for iOS devices
3. Take screenshots for app stores
4. Test installation across devices
5. Consider implementing service worker for offline support
6. Consider push notifications (requires service worker)

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Manifest Generator](https://www.simicart.com/manifest-generator.html/)
- [Icon Generator](https://realfavicongenerator.net/)
- [Maskable Icons](https://maskable.app/)
- [PWA Builder](https://www.pwabuilder.com)
