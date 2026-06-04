/**
 * Production environment validation (Phase 13.4).
 *
 * Several subsystems fail SILENTLY when their env var is missing in production:
 * a missing CRON_SECRET makes every cron endpoint reject (or, worse, a
 * misconfig opens them), a missing RESEND_API_KEY drops every notification
 * email, a missing FIREBASE_SERVICE_ACCOUNT kills push. None of these throw at
 * the call site in a way that's obvious from the outside - you just notice the
 * emails stopped a week later.
 *
 * `checkProductionEnv` runs once at server startup (from instrumentation.ts) and
 * surfaces any missing required var to Sentry + logs, so the gap is visible
 * immediately instead of being discovered by a missed payment alert.
 */

export type EnvSeverity = 'critical' | 'warn';

export interface RequiredEnvVar {
  name: string;
  /** What breaks when this is absent - shown in the alert. */
  reason: string;
  /** critical: a core/security path is broken. warn: a feature is degraded. */
  severity: EnvSeverity;
}

/**
 * Vars that must be present in production. NEXT_PUBLIC_* and Supabase/Polar core
 * vars are validated elsewhere (build-time / client) - this list is the
 * server-only, silently-failing set.
 */
export const PRODUCTION_REQUIRED_ENV: readonly RequiredEnvVar[] = [
  { name: 'CRON_SECRET', reason: 'auth gate for every /api/cron endpoint', severity: 'critical' },
  { name: 'RESEND_API_KEY', reason: 'transactional + notification email delivery', severity: 'critical' },
  { name: 'ADMIN_SESSION_SECRET', reason: 'admin session signing', severity: 'critical' },
  { name: 'ADMIN_ALERT_EMAIL', reason: 'destination for admin/ops alert emails', severity: 'warn' },
  { name: 'FIREBASE_SERVICE_ACCOUNT', reason: 'push-notification delivery', severity: 'warn' },
];

export interface EnvCheckResult {
  ok: boolean;
  missingCritical: RequiredEnvVar[];
  missingWarn: RequiredEnvVar[];
}

/**
 * Pure check - no side effects. Returns which required vars are absent/empty.
 * `ok` is false only when a CRITICAL var is missing (warnings don't fail it).
 */
export function checkProductionEnv(
  env: NodeJS.ProcessEnv = process.env,
): EnvCheckResult {
  const isMissing = (name: string) => {
    const v = env[name];
    return v === undefined || v.trim() === '';
  };

  const missingCritical = PRODUCTION_REQUIRED_ENV.filter(
    (e) => e.severity === 'critical' && isMissing(e.name),
  );
  const missingWarn = PRODUCTION_REQUIRED_ENV.filter(
    (e) => e.severity === 'warn' && isMissing(e.name),
  );

  return {
    ok: missingCritical.length === 0,
    missingCritical,
    missingWarn,
  };
}
