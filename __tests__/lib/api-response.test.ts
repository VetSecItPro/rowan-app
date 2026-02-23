/**
 * Unit tests for lib/api-response.ts
 *
 * Tests standardized JSON response helpers:
 * - apiError: wraps message in { success: false, error } with given HTTP status
 * - apiSuccess: wraps data in { success: true, ...data } with given HTTP status (default 200)
 */

import { describe, it, expect } from 'vitest';
import { apiError, apiSuccess } from '@/lib/api-response';

// NextResponse.json is available in the Node test environment via the next/server mock
// bundled with Next.js. We verify the JSON body and status code on the returned Response.

async function bodyOf(response: Response): Promise<unknown> {
  return response.json();
}

describe('apiError', () => {
  it('returns success: false with the error message', async () => {
    const res = apiError('Not found', 404);
    const body = await bodyOf(res);
    expect(body).toEqual({ success: false, error: 'Not found' });
  });

  it('sets the correct HTTP status code', () => {
    const res = apiError('Unauthorized', 401);
    expect(res.status).toBe(401);
  });

  it('sets the correct HTTP status for server errors', () => {
    const res = apiError('Internal Server Error', 500);
    expect(res.status).toBe(500);
  });

  it('returns a 400 status for bad request', async () => {
    const res = apiError('Invalid input', 400);
    expect(res.status).toBe(400);
    const body = await bodyOf(res);
    expect(body).toMatchObject({ success: false, error: 'Invalid input' });
  });

  it('returns a 403 status for forbidden', async () => {
    const res = apiError('Forbidden', 403);
    expect(res.status).toBe(403);
    const body = await bodyOf(res);
    expect(body).toEqual({ success: false, error: 'Forbidden' });
  });

  it('handles empty error message', async () => {
    const res = apiError('', 400);
    const body = await bodyOf(res);
    expect(body).toEqual({ success: false, error: '' });
  });
});

describe('apiSuccess', () => {
  it('returns success: true with no extra data', async () => {
    const res = apiSuccess();
    const body = await bodyOf(res);
    expect(body).toEqual({ success: true });
  });

  it('defaults to HTTP status 200', () => {
    const res = apiSuccess();
    expect(res.status).toBe(200);
  });

  it('spreads provided data into the response body', async () => {
    const res = apiSuccess({ user: { id: '1', name: 'Alice' } });
    const body = await bodyOf(res);
    expect(body).toEqual({ success: true, user: { id: '1', name: 'Alice' } });
  });

  it('merges multiple data keys', async () => {
    const res = apiSuccess({ count: 5, items: ['a', 'b'] });
    const body = await bodyOf(res);
    expect(body).toEqual({ success: true, count: 5, items: ['a', 'b'] });
  });

  it('respects a custom HTTP status', async () => {
    const res = apiSuccess({ created: true }, 201);
    expect(res.status).toBe(201);
    const body = await bodyOf(res);
    expect(body).toEqual({ success: true, created: true });
  });

  it('does not include undefined fields from sparse data', async () => {
    const res = apiSuccess({ message: 'ok' }, 200);
    const body = await bodyOf(res) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.message).toBe('ok');
  });
});
