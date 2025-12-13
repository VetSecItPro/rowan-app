import { NextRequest, NextResponse } from 'next/server';
import {
  validateCsrfToken,
  requiresCsrfProtection,
  isCsrfExempt,
  CSRF_HEADER_NAME,
} from './csrf';
import { logger } from '@/lib/logger';

/**
 * CSRF Validation Helper for API Routes
 *
 * Use this in API route handlers that perform state-changing operations.
 *
 * Usage:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const csrfError = validateCsrfRequest(request);
 *   if (csrfError) return csrfError;
 *
 *   // ... rest of handler
 * }
 * ```
 */
export function validateCsrfRequest(request: NextRequest): NextResponse | null {
  const method = request.method;
  const pathname = new URL(request.url).pathname;

  // Skip validation for safe methods
  if (!requiresCsrfProtection(method)) {
    return null;
  }

  // Skip validation for exempt routes
  if (isCsrfExempt(pathname)) {
    return null;
  }

  // Validate CSRF token
  if (!validateCsrfToken(request)) {
    logger.warn('CSRF validation failed', {
      component: 'csrf-validation',
      action: 'validation_failed',
      pathname,
      method,
      hasHeader: !!request.headers.get(CSRF_HEADER_NAME),
    });

    return NextResponse.json(
      {
        error: 'CSRF validation failed',
        message: 'Please refresh the page and try again',
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Wrapper function for API route handlers with automatic CSRF validation
 *
 * Usage:
 * ```ts
 * export const POST = withCsrfValidation(async (request: NextRequest) => {
 *   // Handler code - CSRF already validated
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCsrfValidation(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const csrfError = validateCsrfRequest(request);
    if (csrfError) {
      return csrfError;
    }

    return handler(request);
  };
}

/**
 * Check if CSRF protection is enabled for the environment
 * Can be used to conditionally skip in development if needed
 */
export function isCsrfEnabled(): boolean {
  // Always enabled in production
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  // In development, can be disabled with env var for testing
  // Default is enabled even in development
  return process.env.DISABLE_CSRF !== 'true';
}
