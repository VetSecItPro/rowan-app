import { NextResponse } from 'next/server';

/**
 * Standardized API error response.
 * Returns { success: false, error: message } with the given HTTP status.
 */
export function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Standardized API success response.
 * Returns { success: true, ...data } with the given HTTP status (default 200).
 */
export function apiSuccess(data?: Record<string, unknown>, status: number = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}
