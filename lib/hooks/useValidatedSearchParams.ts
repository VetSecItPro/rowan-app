'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { z } from 'zod';

/**
 * Hook for validated URL search parameters
 *
 * Security: Validates and sanitizes URL parameters using Zod schemas
 * to prevent injection attacks and ensure type safety.
 *
 * @param schema - Zod schema defining expected parameters
 * @returns Validated parameters or null if validation fails
 */
export function useValidatedSearchParams<T extends z.ZodTypeAny>(
  schema: T
): {
  params: z.infer<T> | null;
  error: z.ZodError | null;
  raw: URLSearchParams | null;
} {
  const searchParams = useSearchParams();

  return useMemo(() => {
    if (!searchParams) {
      return { params: null, error: null, raw: null };
    }

    // Convert URLSearchParams to object
    const paramsObject: Record<string, string | string[]> = {};
    searchParams.forEach((value, key) => {
      const existing = paramsObject[key];
      if (existing) {
        // Handle multiple values for same key
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          paramsObject[key] = [existing, value];
        }
      } else {
        paramsObject[key] = value;
      }
    });

    // Validate with schema
    const result = schema.safeParse(paramsObject);

    if (result.success) {
      return { params: result.data, error: null, raw: searchParams };
    } else {
      return { params: null, error: result.error, raw: searchParams };
    }
  }, [searchParams, schema]);
}

// =====================================================
// PRE-BUILT SCHEMAS FOR COMMON PAGE PATTERNS
// =====================================================

/**
 * Schema for pages that accept a token parameter
 * Used by: invitation accept, unsubscribe, password reset
 */
export const TokenParamsSchema = z.object({
  token: z.string()
    .min(1, 'Token is required')
    .max(500, 'Token too long')
    .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Invalid token format')
    .optional(),
});

/**
 * Schema for OAuth/auth callback pages
 * Used by: reset-password, magic link
 */
export const AuthCallbackParamsSchema = z.object({
  access_token: z.string().max(2000).optional(),
  refresh_token: z.string().max(2000).optional(),
  token: z.string().max(500).regex(/^[a-zA-Z0-9_\-\.]+$/).optional(),
  type: z.enum(['recovery', 'signup', 'invite', 'magiclink', 'email_change']).optional(),
  error: z.string().max(200).optional(),
  error_description: z.string().max(500).optional(),
});

/**
 * Schema for login page
 * Used by: login page redirect handling
 */
export const LoginParamsSchema = z.object({
  redirect: z.string().max(500).optional(),
  registered: z.enum(['true', 'false']).optional(),
  error: z.string().max(200).optional(),
});

/**
 * Schema for payment success page
 */
export const PaymentSuccessParamsSchema = z.object({
  tier: z.enum(['pro', 'family', 'free']).optional().default('pro'),
  period: z.enum(['monthly', 'annual']).optional().default('monthly'),
  session_id: z.string().max(200).optional(),
});

/**
 * Schema for unsubscribe page
 */
export const UnsubscribeParamsSchema = z.object({
  token: z.string()
    .min(1, 'Token is required')
    .max(500, 'Token too long')
    .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Invalid token format')
    .optional(),
  type: z.enum(['email', 'sms', 'all']).optional().default('email'),
});

/**
 * Schema for error page
 */
export const ErrorPageParamsSchema = z.object({
  error: z.string().max(200).optional(),
  message: z.string().max(500).optional(),
  code: z.string().max(50).optional(),
});

/**
 * Schema for settings page with tab persistence
 */
export const SettingsParamsSchema = z.object({
  tab: z.string().max(50).optional(),
  success: z.string().max(100).optional(),
  error: z.string().max(200).optional(),
  message: z.string().max(500).optional(),
  connection_id: z.string().uuid().optional(),
});

/**
 * Schema for dashboard/projects page with tab persistence
 */
export const TabParamsSchema = z.object({
  tab: z.string().max(50).optional(),
});

/**
 * Schema for upgrade page
 */
export const UpgradeParamsSchema = z.object({
  plan: z.enum(['pro', 'family']).optional(),
  period: z.enum(['monthly', 'annual']).optional(),
  feature: z.string().max(100).optional(),
});

// Type exports for convenience
export type TokenParams = z.infer<typeof TokenParamsSchema>;
export type AuthCallbackParams = z.infer<typeof AuthCallbackParamsSchema>;
export type LoginParams = z.infer<typeof LoginParamsSchema>;
export type PaymentSuccessParams = z.infer<typeof PaymentSuccessParamsSchema>;
export type UnsubscribeParams = z.infer<typeof UnsubscribeParamsSchema>;
export type ErrorPageParams = z.infer<typeof ErrorPageParamsSchema>;
export type SettingsParams = z.infer<typeof SettingsParamsSchema>;
export type TabParams = z.infer<typeof TabParamsSchema>;
export type UpgradeParams = z.infer<typeof UpgradeParamsSchema>;
