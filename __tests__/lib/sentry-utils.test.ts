/**
 * Unit tests for lib/sentry-utils.ts
 *
 * Tests:
 * - setSentryUser: calls Sentry.setUser with correct shape, clears user on null
 * - addSentryBreadcrumb: calls Sentry.addBreadcrumb with correct params
 * - captureSentryException: calls Sentry.captureException with tags and extra context
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock fns
// ---------------------------------------------------------------------------
const { mockSetUser, mockAddBreadcrumb, mockCaptureException } = vi.hoisted(() => ({
  mockSetUser: vi.fn(),
  mockAddBreadcrumb: vi.fn(),
  mockCaptureException: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  setUser: mockSetUser,
  addBreadcrumb: mockAddBreadcrumb,
  captureException: mockCaptureException,
}));

import {
  setSentryUser,
  addSentryBreadcrumb,
  captureSentryException,
} from '@/lib/sentry-utils';

import type { User } from '@supabase/supabase-js';

afterEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// setSentryUser
// ---------------------------------------------------------------------------
describe('setSentryUser', () => {
  it('calls Sentry.setUser(null) when user is null', () => {
    setSentryUser(null);
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });

  it('calls Sentry.setUser(null) when user is undefined', () => {
    setSentryUser(undefined);
    expect(mockSetUser).toHaveBeenCalledWith(null);
  });

  it('sets user with id and email', () => {
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'alice@example.com',
      user_metadata: {},
    } as unknown as User;

    setSentryUser(user);
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'alice@example.com',
      })
    );
  });

  it('uses name from user_metadata as username', () => {
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'alice@example.com',
      user_metadata: { name: 'Alice Smith' },
    } as unknown as User;

    setSentryUser(user);
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'Alice Smith' })
    );
  });

  it('falls back to email prefix as username when name is absent', () => {
    const user = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'bob@example.com',
      user_metadata: {},
    } as unknown as User;

    setSentryUser(user);
    expect(mockSetUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'bob' })
    );
  });
});

// ---------------------------------------------------------------------------
// addSentryBreadcrumb
// ---------------------------------------------------------------------------
describe('addSentryBreadcrumb', () => {
  it('calls Sentry.addBreadcrumb with message, category, and default level "info"', () => {
    addSentryBreadcrumb('User logged in', 'auth');
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User logged in',
        category: 'auth',
        level: 'info',
      })
    );
  });

  it('forwards custom log level', () => {
    addSentryBreadcrumb('Payment failed', 'payments', 'error');
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'error' })
    );
  });

  it('forwards data payload', () => {
    addSentryBreadcrumb('Task created', 'tasks', 'info', { taskId: 't1', count: 5 });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ data: { taskId: 't1', count: 5 } })
    );
  });

  it('includes a numeric timestamp', () => {
    addSentryBreadcrumb('Event', 'test');
    const call = mockAddBreadcrumb.mock.calls[0][0];
    expect(typeof call.timestamp).toBe('number');
    expect(call.timestamp).toBeGreaterThan(0);
  });

  it('timestamp is in seconds (Sentry convention)', () => {
    const before = Date.now() / 1000;
    addSentryBreadcrumb('Now', 'time');
    const after = Date.now() / 1000;
    const ts = mockAddBreadcrumb.mock.calls[0][0].timestamp;
    expect(ts).toBeGreaterThanOrEqual(before - 1);
    expect(ts).toBeLessThanOrEqual(after + 1);
  });

  it('accepts debug level', () => {
    addSentryBreadcrumb('Debug event', 'debug', 'debug');
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'debug' })
    );
  });

  it('accepts warning level', () => {
    addSentryBreadcrumb('Warning event', 'warn', 'warning');
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warning' })
    );
  });
});

// ---------------------------------------------------------------------------
// captureSentryException
// ---------------------------------------------------------------------------
describe('captureSentryException', () => {
  it('calls Sentry.captureException with the error', () => {
    const err = new Error('test failure');
    captureSentryException(err, { endpoint: '/api/tasks', method: 'POST' });
    expect(mockCaptureException).toHaveBeenCalledWith(err, expect.any(Object));
  });

  it('forwards endpoint and method as tags', () => {
    const err = new Error('404');
    captureSentryException(err, { endpoint: '/api/goals', method: 'GET' });
    expect(mockCaptureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        tags: expect.objectContaining({
          endpoint: '/api/goals',
          method: 'GET',
        }),
      })
    );
  });

  it('includes full context in extra', () => {
    const err = new Error('ctx test');
    captureSentryException(err, {
      endpoint: '/api/tasks',
      method: 'DELETE',
      userId: 'u1',
      spaceId: 's1',
    });
    expect(mockCaptureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        extra: expect.objectContaining({
          userId: 'u1',
          spaceId: 's1',
        }),
      })
    );
  });

  it('includes a timestamp in extra', () => {
    captureSentryException(new Error('ts test'), { endpoint: '/api/test', method: 'POST' });
    const extra = mockCaptureException.mock.calls[0][1].extra;
    expect(typeof extra.timestamp).toBe('string');
    // ISO 8601 format
    expect(new Date(extra.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('works with non-Error values (strings, objects)', () => {
    captureSentryException('string error', { endpoint: '/api/test', method: 'POST' });
    expect(mockCaptureException).toHaveBeenCalledWith('string error', expect.any(Object));
  });
});
