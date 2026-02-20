'use client';

/**
 * VisitorTracker
 *
 * Invisible component that sends page-view beacons to /api/analytics/visit.
 * Uses sendBeacon for non-blocking fire-and-forget delivery.
 * Respects Do Not Track. Renders nothing.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Extract UTM parameters from the current URL search string */
function getUtmParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
}

/** Send the beacon payload via sendBeacon or fetch fallback */
function sendVisit(payload: Record<string, string | undefined>): void {
  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === 'function') {
    // sendBeacon needs a Blob with proper content type for request.json() to work
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/visit', blob);
  } else {
    fetch('/api/analytics/visit', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Fire-and-forget — swallow errors silently
    });
  }
}

export default function VisitorTracker() {
  const pathname = usePathname();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Respect Do Not Track
    if (navigator.doNotTrack === '1') return;

    // Debounce rapid route changes (500ms)
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const payload: Record<string, string | undefined> = { path: pathname };

      if (isFirstLoad.current) {
        // Capture referrer and UTM params only on the initial page load
        if (document.referrer) payload.referrer = document.referrer;
        Object.assign(payload, getUtmParams(window.location.search));
        isFirstLoad.current = false;
      }

      sendVisit(payload);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pathname]);

  return null;
}
