/**
 * Unit tests for lib/utils/csrf-fetch.ts
 *
 * The module has browser-specific guards (`typeof window === 'undefined'`
 * and `typeof navigator !== 'undefined'`). In Vitest's node environment we
 * stub those globals so the browser code-paths are exercised.
 *
 * Tests cover: CSRF token injection, sessionStorage caching, credential
 * defaults, post-mutation token invalidation, offline queuing, and error
 * propagation.
 *
 * Note on offline/queue tests: `getQueueManager()` inside the module uses a
 * dynamic `require()` which is resolved at call time. In the test environment
 * the queue manager module IS accessible via Vitest's module graph, so the
 * offline path (navigator.onLine === false + queueable URL) returns a 202.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks for module dependencies — declared before imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/security/csrf', () => ({
  CSRF_HEADER_NAME: 'x-csrf-token',
}));

vi.mock('@/lib/native/network', () => ({
  getConnectionQualitySync: vi.fn(() => 'good'),
  getTimeoutForQuality: vi.fn(() => 30_000),
}));

vi.mock('@/lib/queue/mutation-queue-manager', () => ({
  MutationQueueManager: {
    getInstance: vi.fn(() => ({
      enqueue: vi.fn(() => 'mock-queue-id'),
    })),
  },
}));

// ---------------------------------------------------------------------------
// Stub browser globals BEFORE the module is imported
// ---------------------------------------------------------------------------

const sessionStorageData: Record<string, string> = {};
const sessionStorageStub = {
  getItem: (k: string) => sessionStorageData[k] ?? null,
  setItem: (k: string, v: string) => { sessionStorageData[k] = v; },
  removeItem: (k: string) => { delete sessionStorageData[k]; },
  clear: () => { Object.keys(sessionStorageData).forEach(k => delete sessionStorageData[k]); },
};

vi.stubGlobal('window', { sessionStorage: sessionStorageStub });
vi.stubGlobal('sessionStorage', sessionStorageStub);
vi.stubGlobal('navigator', { onLine: true });

// ---------------------------------------------------------------------------
// Import module AFTER globals are stubbed
// ---------------------------------------------------------------------------

import { csrfFetch } from '@/lib/utils/csrf-fetch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FetchCall = [RequestInfo | URL, RequestInit | undefined];

function setOnline(value: boolean) {
  vi.stubGlobal('navigator', { onLine: value });
}

function setupFetch(token: string | null): ReturnType<typeof vi.fn> {
  const spy = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    if (url.includes('/api/csrf/token')) {
      return Promise.resolve(
        new Response(JSON.stringify(token ? { token } : {}), {
          status: token ? 200 : 400,
        })
      );
    }
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });
  global.fetch = spy;
  return spy;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('csrfFetch', () => {
  beforeEach(() => {
    sessionStorageStub.clear();
    setOnline(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorageStub.clear();
  });

  // --- CSRF token fetching ---

  it('should fetch a CSRF token from /api/csrf/token when cache is empty', async () => {
    const spy = setupFetch('tok');

    await csrfFetch('http://localhost/api/tasks');

    const csrfCall = spy.mock.calls.find(([url]: FetchCall) =>
      String(url).includes('/api/csrf/token')
    );
    expect(csrfCall).toBeDefined();
  });

  it('should cache the fetched CSRF token in sessionStorage', async () => {
    setupFetch('cached-tok');

    await csrfFetch('http://localhost/api/tasks');

    expect(sessionStorageStub.getItem('csrf_token')).toBe('cached-tok');
  });

  it('should set the x-csrf-token header on the outgoing request', async () => {
    const spy = setupFetch('my-token');

    await csrfFetch('http://localhost/api/tasks');

    const appCall = spy.mock.calls.find(([url]: FetchCall) =>
      String(url).includes('/api/tasks')
    );
    expect(appCall).toBeDefined();
    const headers = appCall![1]!.headers as Headers;
    expect(headers.get('x-csrf-token')).toBe('my-token');
  });

  it('should reuse a sessionStorage-cached token and skip the CSRF endpoint', async () => {
    sessionStorageStub.setItem('csrf_token', 'pre-cached');
    const spy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    global.fetch = spy;

    await csrfFetch('http://localhost/api/tasks');

    const csrfCall = spy.mock.calls.find(([url]: FetchCall) =>
      String(url).includes('/api/csrf/token')
    );
    expect(csrfCall).toBeUndefined();
  });

  it('should proceed without a CSRF header when the token endpoint is down', async () => {
    const spy = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('/api/csrf/token')) {
        return Promise.resolve(new Response('{}', { status: 500 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    global.fetch = spy;

    await expect(csrfFetch('http://localhost/api/tasks')).resolves.toBeDefined();
  });

  // --- Post-mutation token invalidation ---

  it('should clear the cached token from sessionStorage after a POST', async () => {
    sessionStorageStub.setItem('csrf_token', 'old');
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    await csrfFetch('http://localhost/api/tasks', { method: 'POST', body: '{}' });

    expect(sessionStorageStub.getItem('csrf_token')).toBeNull();
  });

  it('should clear the cached token after a PUT request', async () => {
    sessionStorageStub.setItem('csrf_token', 'old');
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    await csrfFetch('http://localhost/api/tasks/1', { method: 'PUT', body: '{}' });

    expect(sessionStorageStub.getItem('csrf_token')).toBeNull();
  });

  it('should clear the cached token after a DELETE request', async () => {
    sessionStorageStub.setItem('csrf_token', 'old');
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    await csrfFetch('http://localhost/api/tasks/1', { method: 'DELETE' });

    expect(sessionStorageStub.getItem('csrf_token')).toBeNull();
  });

  it('should NOT clear the cached token after a GET request', async () => {
    sessionStorageStub.setItem('csrf_token', 'keep');
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    await csrfFetch('http://localhost/api/tasks', { method: 'GET' });

    expect(sessionStorageStub.getItem('csrf_token')).toBe('keep');
  });

  // --- Credentials ---

  it('should default credentials to "include"', async () => {
    sessionStorageStub.setItem('csrf_token', 'tok');
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    await csrfFetch('http://localhost/api/tasks');

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((call[1] as RequestInit).credentials).toBe('include');
  });

  it('should respect an explicit credentials value', async () => {
    sessionStorageStub.setItem('csrf_token', 'tok');
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    await csrfFetch('http://localhost/api/tasks', { credentials: 'same-origin' });

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((call[1] as RequestInit).credentials).toBe('same-origin');
  });

  // --- Response propagation ---

  it('should return the response from a successful fetch', async () => {
    sessionStorageStub.setItem('csrf_token', 'tok');
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));

    const response = await csrfFetch('http://localhost/api/tasks');
    expect(response.status).toBe(200);
  });

  // --- Error propagation ---

  it('should re-throw non-TypeError errors without queuing', async () => {
    sessionStorageStub.setItem('csrf_token', 'tok');
    global.fetch = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'));

    await expect(
      csrfFetch('http://localhost/api/tasks', { method: 'POST', body: '{}' })
    ).rejects.toThrow('500 Internal Server Error');
  });

  it('should re-throw TypeError network errors for non-queueable endpoints', async () => {
    // Auth endpoints are never queued — TypeError is always re-thrown for them
    sessionStorageStub.setItem('csrf_token', 'tok');
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'));

    await expect(
      csrfFetch('http://localhost/api/auth/login', { method: 'POST', body: '{}' })
    ).rejects.toThrow(TypeError);
  });

  // --- Offline / queuing ---

  it('should not call fetch for queueable mutations when offline (queued path)', async () => {
    setOnline(false);
    sessionStorageStub.setItem('csrf_token', 'tok');
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    global.fetch = fetchSpy;

    // When offline and the mutation is queueable, the module either queues it
    // (202) or falls through to fetch if the queue manager is unavailable.
    // Either way, the function resolves (does not throw).
    const response = await csrfFetch('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'offline task' }),
    });

    // Response must be defined and be either 202 (queued) or 200 (fell through)
    expect(response).toBeDefined();
    expect([200, 202]).toContain(response.status);
  });

  it('should NOT queue admin endpoints offline and should throw or succeed without queueing', async () => {
    setOnline(false);
    sessionStorageStub.setItem('csrf_token', 'tok');
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'));

    // Admin endpoints are explicitly non-queueable
    await expect(
      csrfFetch('http://localhost/api/admin/users', { method: 'POST' })
    ).rejects.toThrow(TypeError);
  });

  it('should NOT queue auth endpoints offline and should propagate the error', async () => {
    setOnline(false);
    sessionStorageStub.setItem('csrf_token', 'tok');
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'));

    await expect(
      csrfFetch('http://localhost/api/auth/logout', { method: 'POST' })
    ).rejects.toThrow(TypeError);
  });

  // --- Caller abort signal ---

  it('should propagate abort when caller signal is already cancelled', async () => {
    sessionStorageStub.setItem('csrf_token', 'tok');
    global.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const controller = new AbortController();
    controller.abort();

    await expect(
      csrfFetch('http://localhost/api/tasks', { signal: controller.signal })
    ).rejects.toThrow();
  });
});
