# Rowan Offline & Low-Connectivity Support

> **Single source of truth** for offline mode and poor network handling.

---

## Goal

Make Rowan resilient to poor 4G coverage with instant app loading, optimistic updates, and background sync.

## What This Enables

- **Instant app open** - App shell loads from cache, no network wait
- **Works on 2G/3G** - Graceful degradation with timeout fallbacks
- **Actions never lost** - Mutations queue offline, sync when connected
- **User knows status** - Clear indicators for connection quality and sync state

---

## Current State

| Feature | Status | Location |
|---------|--------|----------|
| Service Worker | ✅ Solid | `public/sw.js` (v2, cache strategies) |
| Offline Queue Hook | ✅ Complete | `lib/hooks/useOfflineQueue.ts` (localStorage) |
| Network Status UI | ✅ Exists | `components/ui/NetworkStatus.tsx` |
| React Query Prefetch | ✅ Extensive | `lib/services/prefetch-service.ts` |
| Optimistic Mutations | ✅ Pattern exists | `lib/hooks/useOptimisticMutation.ts` |
| @capacitor/network | ✅ Installed | `package.json` |

---

## Implementation Checklist

### Phase 1: Native Network Detection Bridge ✅
- [x] Create `lib/native/network.ts` with Capacitor bridge
- [x] Export from `lib/native/index.ts`
- [x] Detect connection type (wifi, 4g, 3g, 2g, none)
- [x] Provide quality levels (excellent, good, poor, offline)
- [x] Add timeout recommendations based on quality

### Phase 2: Enhanced Service Worker Precaching ✅
- [x] Update `public/sw.js` with app shell precaching
- [x] Add network-first-with-timeout strategy (3s timeout)
- [x] Precache critical routes (/, /dashboard, /tasks, /calendar, etc.)
- [x] Version-based cache busting (v3)
- [x] Precache on install for instant loading

### Phase 3: React Query Offline Persistence ✅
- [x] Install persistence dependencies (idb-keyval)
- [x] Create `lib/react-query/offline-persistence.ts`
- [x] Update query client for offlineFirst mode
- [x] Persist cache to IndexedDB
- [x] Auto-restore on app load
- [x] Backup to localStorage on page unload

### Phase 4: Enhanced Network Status UI ✅
- [x] Create `hooks/useNetworkStatus.ts` React hook
- [x] Create `components/ui/ConnectionQuality.tsx` badge
- [x] Update `components/ui/NetworkStatus.tsx` with quality indicator
- [x] Add poor connection warning banner
- [x] Connection quality badge component

### Phase 5: Mutation Queue Integration (Future)
- [ ] Create `lib/react-query/mutation-queue.ts`
- [ ] Integrate offline queue with React Query mutations
- [ ] Background sync via service worker
- [ ] Conflict resolution for stale data

### Phase 6: Request Optimization (Future)
- [ ] Create `lib/performance/request-optimizer.ts`
- [ ] Network-aware request timeouts
- [ ] Smaller payloads on 2G/3G
- [ ] Request batching

---

## File Locations

| File | Purpose |
|------|---------|
| `lib/native/network.ts` | Capacitor network bridge |
| `public/sw.js` | Service worker with offline strategies |
| `lib/react-query/offline-persistence.ts` | IndexedDB cache persistence |
| `hooks/useNetworkStatus.ts` | React hook for network state |
| `components/ui/ConnectionQuality.tsx` | Connection quality badge |
| `components/ui/NetworkStatus.tsx` | Offline banner with sync status |

---

## Testing

### Offline Mode
1. Open app → load data
2. Toggle airplane mode (or DevTools → Network → Offline)
3. Verify: App shows cached data instantly
4. Verify: Mutations queue and show pending count
5. Re-enable network → queued actions sync

### Poor Connectivity
1. Chrome DevTools → Network → Slow 3G
2. Navigate around app
3. Verify: Cached pages load instantly
4. Verify: New requests timeout after 3s → fallback to cache

### Native App
1. Run on iOS/Android simulator
2. Use network conditioning (Xcode/Android Studio)
3. Verify: Connection quality badge updates (wifi/4G/3G/2G)

---

*Last updated: January 2026*
