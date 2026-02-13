import { CSRF_HEADER_NAME } from '@/lib/security/csrf';
import { getConnectionQualitySync, getTimeoutForQuality } from '@/lib/native/network';

/**
 * Mutation methods that can be queued when offline
 */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * API prefixes that must NOT be queued offline.
 * Auth, payment, admin, and destructive operations should fail immediately
 * so the user sees an appropriate error rather than silent queueing.
 */
const NON_QUEUEABLE_PREFIXES = [
  '/api/auth/',
  '/api/admin/',
  '/api/polar/',
  '/api/user/',
  '/api/privacy/',
  '/api/ccpa/',
  '/api/csrf/',
  '/api/settings/',
  '/api/storage/delete',
];

let csrfTokenPromise: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = sessionStorage.getItem('csrf_token');
  if (stored) {
    return stored;
  }

  const response = await fetch('/api/csrf/token', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (data?.token) {
    sessionStorage.setItem('csrf_token', data.token);
    return data.token;
  }

  return null;
}

async function getCsrfToken(): Promise<string | null> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken().finally(() => {
      csrfTokenPromise = null;
    });
  }
  return csrfTokenPromise;
}

/**
 * Check if a URL is eligible for offline queueing
 */
function isQueueable(url: string): boolean {
  return !NON_QUEUEABLE_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Build a synthetic 202 Accepted response for queued mutations
 */
function syntheticQueuedResponse(id: string): Response {
  return new Response(
    JSON.stringify({ queued: true, id: `pending-${id}` }),
    {
      status: 202,
      statusText: 'Accepted',
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Lazily get the MutationQueueManager to avoid circular imports.
 * Returns null on server or if the module isn't available.
 */
function getQueueManager() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MutationQueueManager } = require('@/lib/queue/mutation-queue-manager');
    return MutationQueueManager.getInstance();
  } catch {
    return null;
  }
}

/**
 * Try to enqueue a mutation for offline replay.
 * Returns a synthetic Response if queued, or null if queueing isn't possible.
 */
function tryEnqueue(
  url: string,
  method: string,
  headers: Headers,
  init: RequestInit
): Response | null {
  // Can't serialize FormData
  if (init.body instanceof FormData) return null;

  // Only queue mutation methods
  if (!MUTATION_METHODS.has(method)) return null;

  // Skip non-queueable endpoints
  if (!isQueueable(url)) return null;

  const manager = getQueueManager();
  if (!manager) return null;

  // Serialize only safe headers for localStorage persistence
  // Exclude auth/CSRF tokens which will be refreshed on replay
  const SAFE_HEADERS = ['content-type', 'accept', 'x-request-id'];
  const headerObj: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (SAFE_HEADERS.includes(key.toLowerCase())) {
      headerObj[key] = value;
    }
  });

  const body = typeof init.body === 'string' ? init.body : undefined;
  const id = manager.enqueue(url, method, headerObj, body);
  return syntheticQueuedResponse(id);
}

export async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = await getCsrfToken();

  if (token) {
    headers.set(CSRF_HEADER_NAME, token);
  }

  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init.method || 'GET').toUpperCase();

  // --- Offline path: queue mutations immediately ---
  if (typeof navigator !== 'undefined' && !navigator.onLine && MUTATION_METHODS.has(method)) {
    const queued = tryEnqueue(url, method, headers, init);
    if (queued) return queued;
    // If not queueable (auth, FormData, etc.), fall through and let fetch throw
  }

  // --- Online path: quality-aware timeout ---
  const quality = getConnectionQualitySync();
  const timeout = getTimeoutForQuality(quality);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Merge caller's signal with our timeout signal
  const callerSignal = init.signal;
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason);
    } else {
      callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), {
        once: true,
      });
    }
  }

  try {
    const response = await fetch(input, {
      ...init,
      headers,
      credentials: init.credentials ?? 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // After a state-changing request, the server rotates the CSRF cookie.
    // Clear cached token so the next request fetches the fresh one.
    if (MUTATION_METHODS.has(method)) {
      try {
        sessionStorage.removeItem('csrf_token');
      } catch {
        // sessionStorage unavailable
      }
    }

    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // On network error for a mutation, try to queue it
    if (
      MUTATION_METHODS.has(method) &&
      error instanceof TypeError // fetch network errors are TypeErrors
    ) {
      const queued = tryEnqueue(url, method, headers, init);
      if (queued) return queued;
    }

    throw error;
  }
}
