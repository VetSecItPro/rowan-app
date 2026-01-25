# Rowan Mobile App

> **Single source of truth** for native iOS/Android app development.

---

## Quick Status

| Area | Status |
|------|--------|
| Capacitor Setup | ✅ Complete |
| Dark Mode | ✅ Complete |
| Mobile Web UX | ✅ 95% Ready |
| Push Notifications | ✅ Code Ready |
| Location Tracking | ✅ Code Ready |
| Firebase Setup | ⏳ Pending |
| App Store Submission | ⏳ Pending |

---

## Table of Contents

1. [Architecture](#architecture)
2. [Capacitor Plugins](#capacitor-plugins)
3. [Firebase Setup](#firebase-setup)
4. [Native Permissions](#native-permissions)
5. [Implementation Checklist](#implementation-checklist)
6. [App Store Submission](#app-store-submission)
7. [Post-Launch Enhancements](#post-launch-enhancements)

---

## Architecture

### How It Works

```
Next.js App (Vercel)
        ↓
   https://rowan-app.vercel.app
        ↓
┌───────┴───────┐
│   iOS App     │  ← WebView loading Vercel URL
│  Android App  │  ← With native plugin bridges
└───────────────┘
```

### Key Points

- **Single codebase**: React/Next.js on Vercel
- **Native shells**: iOS/Android are WebView wrappers
- **Instant updates**: Push to Vercel = users see changes (no App Store review)
- **App Store reviews only needed for**: New plugins, Capacitor upgrades, icons/splash

### Config Files

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Plugin settings, server URL |
| `android/app/google-services.json` | Firebase Android config |
| `ios/App/App/GoogleService-Info.plist` | Firebase iOS config |
| `android/app/src/main/AndroidManifest.xml` | Android permissions |
| `ios/App/App/Info.plist` | iOS permissions |

---

## Capacitor Plugins

### Currently Installed

| Plugin | Status | Purpose |
|--------|--------|---------|
| @capacitor/core | ✅ 8.0.1 | Core runtime |
| @capacitor/ios | ✅ 8.0.1 | iOS platform |
| @capacitor/android | ✅ 8.0.1 | Android platform |
| @capacitor/app | ✅ 8.0.0 | App lifecycle, deep links |
| @capacitor/camera | ✅ 8.0.0 | Receipt scanning, photos |
| @capacitor/geolocation | ✅ 8.0.0 | Family location |
| @capacitor/haptics | ✅ 8.0.0 | Tactile feedback |
| @capacitor/keyboard | ✅ 8.0.0 | Chat input |
| @capacitor/push-notifications | ✅ 8.0.0 | Firebase push |
| @capacitor/splash-screen | ✅ 8.0.0 | Launch screen |
| @capacitor/status-bar | ✅ 8.0.0 | Dark styling |

### Plugins to Add

Install all now to avoid future App Store reviews.

#### Tier 1: Essential

| Plugin | Install | Purpose |
|--------|---------|---------|
| @capacitor/local-notifications | ⬜ | Scheduled reminders |
| @capacitor/share | ⬜ | Share lists/invites |
| @capacitor/network | ⬜ | Offline detection |
| @capacitor/preferences | ⬜ | Local settings |
| @capacitor/browser | ⬜ | Stripe, OAuth |
| @capacitor/clipboard | ⬜ | Copy links |
| @capacitor/device | ⬜ | Analytics |
| @capacitor/dialog | ⬜ | Native alerts |
| @capacitor/toast | ⬜ | Quick feedback |

#### Tier 2: Enhanced UX

| Plugin | Install | Purpose |
|--------|---------|---------|
| @capacitor/action-sheet | ⬜ | Action menus |
| @capawesome/capacitor-badge | ⬜ | App icon badge |
| @capacitor/screen-reader | ⬜ | Accessibility |

#### Tier 3: Future Features

| Plugin | Install | Purpose |
|--------|---------|---------|
| @capacitor-community/barcode-scanner | ⬜ | Scan products |
| @capacitor-community/contacts | ⬜ | Invite from contacts |
| @capacitor-community/calendar | ⬜ | Sync to device calendar |
| @capacitor-community/apple-sign-in | ⬜ | Native Apple login |
| @capawesome/capacitor-file-picker | ⬜ | Import files |
| @capacitor/filesystem | ⬜ | Save/export files |

### Installation Command

```bash
# All plugins at once
npm install \
  @capacitor/local-notifications \
  @capacitor/share \
  @capacitor/network \
  @capacitor/preferences \
  @capacitor/browser \
  @capacitor/clipboard \
  @capacitor/device \
  @capacitor/dialog \
  @capacitor/toast \
  @capacitor/action-sheet \
  @capawesome/capacitor-badge \
  @capacitor/screen-reader \
  @capacitor-community/barcode-scanner \
  @capacitor-community/contacts \
  @capacitor-community/calendar \
  @capacitor-community/apple-sign-in \
  @capawesome/capacitor-file-picker \
  @capacitor/filesystem

# Sync to native projects
npx cap sync
```

---

## Firebase Setup

### Step 1: Create Firebase Project

- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Create project: `Rowan`
- [ ] Disable Google Analytics (not needed for push)

### Step 2: Add Android App

- [ ] Click Android icon → Add app
- [ ] Package name: `com.rowan.app`
- [ ] App nickname: `Rowan Android`
- [ ] Download `google-services.json`
- [ ] Place at: `android/app/google-services.json`

### Step 3: Add iOS App

- [ ] Click iOS icon → Add app
- [ ] Bundle ID: `com.rowan.app`
- [ ] App nickname: `Rowan iOS`
- [ ] Download `GoogleService-Info.plist`
- [ ] Place at: `ios/App/App/GoogleService-Info.plist`

### Step 4: iOS Push (APNs)

- [ ] Go to [Apple Developer Keys](https://developer.apple.com/account/resources/authkeys/list)
- [ ] Create key: `Rowan Push Key`
- [ ] Enable: Apple Push Notifications service (APNs)
- [ ] Download `.p8` file (only downloadable once!)
- [ ] Note the Key ID
- [ ] In Firebase Console → Cloud Messaging → iOS
- [ ] Upload `.p8` file with Key ID and Team ID

### Step 5: Sync

- [ ] Run `npx cap sync`

---

## Native Permissions

### iOS (Info.plist)

Add to `ios/App/App/Info.plist`:

```xml
<!-- Location -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Rowan uses your location to show family members where you are</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Rowan uses background location to notify family when you arrive at places</string>

<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>Rowan uses the camera to scan receipts and take photos</string>

<!-- Contacts (for invites) -->
<key>NSContactsUsageDescription</key>
<string>Rowan can invite family members from your contacts</string>

<!-- Calendar -->
<key>NSCalendarsUsageDescription</key>
<string>Rowan can sync events to your calendar</string>

<!-- Photos -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Rowan can access photos for receipts and profiles</string>

<!-- Microphone (voice messages) -->
<key>NSMicrophoneUsageDescription</key>
<string>Rowan uses the microphone for voice messages</string>
```

### Android (AndroidManifest.xml)

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Location -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Camera -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Notifications -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Contacts -->
<uses-permission android:name="android.permission.READ_CONTACTS" />

<!-- Calendar -->
<uses-permission android:name="android.permission.READ_CALENDAR" />
<uses-permission android:name="android.permission.WRITE_CALENDAR" />

<!-- Storage -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- Audio -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## Implementation Checklist

### Phase 1: Setup (Current)

- [x] Capacitor 8.x installed
- [x] iOS/Android projects generated
- [x] Dark mode configured
- [x] Push notification code ready
- [x] Location tracking code ready
- [x] Database tables created
- [ ] Install additional plugins (18 plugins)
- [ ] Firebase project created
- [ ] Firebase config files placed
- [ ] APNs key uploaded
- [ ] Run `npx cap sync`

### Phase 2: Testing

- [ ] Test on iOS Simulator
- [ ] Test on Android Emulator
- [ ] Test push notifications
- [ ] Test location tracking
- [ ] Test camera/photos
- [ ] Test offline mode

### Phase 3: App Store Prep

- [ ] App icons (all sizes)
- [ ] Splash screens
- [ ] Screenshots (all devices)
- [ ] App description
- [ ] Privacy policy URL
- [ ] Keywords

### Phase 4: Submission

- [ ] Apple Developer account setup
- [ ] Google Play Console setup
- [ ] TestFlight beta
- [ ] Play Store internal testing
- [ ] App Store submission
- [ ] Play Store submission

---

## App Store Submission

### iOS Requirements

| Item | Status |
|------|--------|
| Apple Developer membership ($99/year) | ⬜ |
| App icon 1024x1024 | ⬜ |
| Screenshots (6.7", 6.5", 5.5" iPhones, iPad Pro) | ⬜ |
| Privacy policy URL | ⬜ |
| App Store description | ⬜ |
| Keywords | ⬜ |
| Age rating questionnaire | ⬜ |
| Build uploaded via Xcode | ⬜ |

### Android Requirements

| Item | Status |
|------|--------|
| Google Play Console ($25 one-time) | ⬜ |
| App icon 512x512 | ⬜ |
| Feature graphic 1024x500 | ⬜ |
| Screenshots (phone, 7" tablet, 10" tablet) | ⬜ |
| Privacy policy URL | ⬜ |
| Play Store description | ⬜ |
| Content rating questionnaire | ⬜ |
| AAB bundle uploaded | ⬜ |

---

## Post-Launch Enhancements

### Mobile UX (Optional)

| Enhancement | Priority | Effort |
|-------------|----------|--------|
| Pull-to-refresh | Low | 2 hours |
| Swipe gestures (swipe to complete) | Low | 4 hours |
| List virtualization (100+ items) | Medium | 4 hours |
| Navigation menu drawer | Medium | 3 hours |
| Filter dropdown on mobile | Low | 2 hours |

### Platform Features (Future)

| Feature | Platform | Notes |
|---------|----------|-------|
| Apple Watch companion | iOS | Quick task management |
| Siri Shortcuts | iOS | Voice task creation |
| Android widgets | Android | Home screen tasks |
| Live Activities | iOS 16+ | Ongoing events |
| Dynamic Island | iOS 14 Pro+ | Active timers |

---

## Native Bridge Files

TypeScript wrappers in `lib/native/`:

| File | Status | Purpose |
|------|--------|---------|
| capacitor.ts | ✅ | Platform detection |
| push-notifications.ts | ✅ | Push notifications |
| geolocation.ts | ⬜ | Location tracking |
| local-notifications.ts | ⬜ | Scheduled reminders |
| share.ts | ⬜ | Share sheet |
| network.ts | ⬜ | Connection status |
| storage.ts | ⬜ | Local preferences |
| camera.ts | ⬜ | Camera access |
| contacts.ts | ⬜ | Contact picker |
| calendar.ts | ⬜ | Calendar sync |
| barcode.ts | ⬜ | Barcode scanner |
| haptics.ts | ⬜ | Vibration feedback |

---

## Feature → Plugin Mapping

| Rowan Feature | Plugins Used |
|--------------|--------------|
| Reminders | local-notifications, push-notifications, badge |
| Family Location | geolocation, push-notifications |
| Messages | push-notifications, badge, haptics |
| Shopping Lists | share, barcode-scanner, clipboard |
| Receipts/Expenses | camera, filesystem |
| Calendar/Events | calendar, local-notifications |
| Invite Family | contacts, share |
| Offline Mode | network, preferences |
| Authentication | apple-sign-in, browser |
| Export Reports | filesystem, share |

---

## Commands Reference

```bash
# Development
npm run dev                    # Start Next.js dev server
npm run native:dev             # Sync with localhost URL
npm run native:prod            # Sync with Vercel URL

# Capacitor
npx cap sync                   # Sync web assets + plugins
npx cap sync ios               # iOS only
npx cap sync android           # Android only
npx cap open ios               # Open in Xcode
npx cap open android           # Open in Android Studio

# Build shortcuts
npm run cap:build:ios          # Sync + open Xcode
npm run cap:build:android      # Sync + open Android Studio
```

---

## Troubleshooting

### Push notifications not working

1. Check Firebase config files are in correct locations
2. Verify APNs key is uploaded to Firebase
3. Check device has notification permissions
4. Check `push_tokens` table in Supabase

### Location not updating

1. Check location permissions granted
2. Verify background location enabled (iOS)
3. Check `user_locations` table in Supabase

### App not loading

1. Check Vercel deployment is live
2. Verify `server.url` in `capacitor.config.ts`
3. Check network connectivity
4. Clear app cache and reload

---

## Related Docs (Archived)

These docs are superseded by this file:

- `docs/features/rowan-mobile-optimization.md` - Strategy (archived)
- `docs/native/capacitor-plugins-plan.md` - Plugin details (merged here)
- `docs/archive/mobile-optimization-audit-2025-10-14.md` - UX audit (completed)

---

*Last updated: January 2026*
