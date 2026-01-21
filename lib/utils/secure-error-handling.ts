/**
 * Secure Error Handling Utilities
 *
 * Prevents technical error details from being exposed to end users
 * while still logging them for debugging purposes.
 */

import { logger } from '@/lib/logger';

export interface SecureError {
  userMessage: string;
  logMessage: string;
  statusCode?: number;
}

/**
 * Maps technical errors to user-friendly messages
 * Logs detailed information only in development
 */
type ErrorDetails = { message?: unknown };

const getErrorMessage = (technicalError: unknown): string => {
  if (technicalError instanceof Error) {
    return technicalError.message;
  }
  if (typeof technicalError === 'string') {
    return technicalError;
  }
  if (technicalError && typeof technicalError === 'object' && 'message' in technicalError) {
    const message = (technicalError as ErrorDetails).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return String(technicalError);
};

export function createSecureError(
  technicalError: unknown,
  context: string,
  fallbackMessage: string = 'Something went wrong. Please try again.'
): SecureError {
  // Always log technical details for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    logger.error(`[${context}] Technical error:`, technicalError, { component: 'lib-secure-error-handling', action: 'service_call' });
  }

  // Determine user-friendly message based on error type
  let userMessage = fallbackMessage;
  let statusCode: number | undefined;

  if (technicalError instanceof Error) {
    const errorMessage = technicalError.message.toLowerCase();

    // Map common technical errors to user-friendly messages
    if (errorMessage.includes('json') ||
        errorMessage.includes('unexpected token') ||
        errorMessage.includes('<!doctype')) {
      userMessage = 'Service temporarily unavailable. Please try again.';
      statusCode = 503;
    } else if (errorMessage.includes('network') ||
               errorMessage.includes('fetch')) {
      userMessage = 'Connection problem. Please check your internet and try again.';
      statusCode = 503;
    } else if (errorMessage.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
      statusCode = 408;
    } else if (errorMessage.includes('already registered') ||
               errorMessage.includes('already exists')) {
      userMessage = 'An account with this email already exists.';
      statusCode = 409;
    } else if (errorMessage.includes('invalid email') ||
               errorMessage.includes('invalid password')) {
      userMessage = 'Invalid email or password format.';
      statusCode = 400;
    }
  }

  return {
    userMessage,
    logMessage: getErrorMessage(technicalError),
    statusCode
  };
}

/**
 * Secure API response handler that prevents information leakage
 */
export async function handleApiResponse(response: Response, context: string): Promise<unknown> {
  try {
    void context;
    // Check if response is ok first
    if (!response.ok) {
      // Handle specific HTTP status codes securely
      switch (response.status) {
        case 404:
          throw new Error('Service endpoint not available');
        case 429:
          throw new Error('Too many requests. Please try again later.');
        case 401:
          throw new Error('Authentication required');
        case 403:
          throw new Error('Access denied');
        case 500:
        case 502:
        case 503:
        case 504:
          throw new Error('Service temporarily unavailable');
        default:
          throw new Error('Service request failed');
      }
    }

    // Try to parse JSON response
    const result = await response.json();
    return result;
  } catch (parseError) {
    // If JSON parsing fails, this likely means we got HTML instead of JSON
    if (parseError instanceof SyntaxError && parseError.message.includes('JSON')) {
      throw new Error('Service temporarily unavailable. Please try again.');
    }
    throw parseError;
  }
}

/**
 * Authentication-specific error messages
 */
export const AUTH_ERROR_MESSAGES = {
  SIGNUP_FAILED: 'Failed to create account. Please try again.',
  SIGNIN_FAILED: 'Sign in failed. Please check your credentials.',
  EMAIL_EXISTS: 'An account with this email already exists.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  RATE_LIMITED: 'Too many attempts. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again.',
  NETWORK_ERROR: 'Connection problem. Please check your internet and try again.',
  VALIDATION_ERROR: 'Please check your information and try again.',
} as const;

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  severity: 'low' | 'medium' | 'high' = 'medium'
) {
  // Use structured logger for all security events
  logger.warn(`[SECURITY-${severity.toUpperCase()}] ${event}`, {
    component: 'security-event',
    action: event,
    details: { severity, ...details }
  });
}
