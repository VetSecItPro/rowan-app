/**
 * Error Alerting System
 * Phase 9.2: Error monitoring and alerting for monetization flows
 *
 * Provides:
 * - Critical error detection and alerting
 * - Email notifications for payment failures
 * - Webhook error tracking
 * - Error aggregation and threshold alerts
 *
 * SECURITY: Server-side only - never expose to client
 */

import { Resend } from 'resend';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertConfig {
  enabled: boolean;
  emailRecipients: string[];
  thresholds: {
    paymentFailureRate: number; // Percentage (e.g., 10 = 10%)
    webhookErrorCount: number; // Number of errors in window
    checkoutAbandonRate: number; // Percentage
  };
  windowMinutes: number; // Time window for threshold checks
}

export interface AlertEvent {
  severity: AlertSeverity;
  type: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: AlertConfig = {
  enabled: process.env.NODE_ENV === 'production',
  emailRecipients: [process.env.ADMIN_ALERT_EMAIL || 'admin@example.com'],
  thresholds: {
    paymentFailureRate: 10, // Alert if >10% payments fail
    webhookErrorCount: 5, // Alert after 5 webhook errors
    checkoutAbandonRate: 50, // Alert if >50% checkouts abandoned
  },
  windowMinutes: 60, // 1 hour window
};

// In-memory error tracking (for quick threshold checks)
interface ErrorTracker {
  paymentFailures: number;
  paymentAttempts: number;
  webhookErrors: number;
  checkoutStarts: number;
  checkoutAbandons: number;
  windowStart: Date;
}

let errorTracker: ErrorTracker = {
  paymentFailures: 0,
  paymentAttempts: 0,
  webhookErrors: 0,
  checkoutStarts: 0,
  checkoutAbandons: 0,
  windowStart: new Date(),
};

// ============================================================================
// ALERT FUNCTIONS
// ============================================================================

/**
 * Reset error tracker if window has expired
 */
function checkAndResetWindow(config: AlertConfig = DEFAULT_CONFIG): void {
  const now = new Date();
  const windowMs = config.windowMinutes * 60 * 1000;

  if (now.getTime() - errorTracker.windowStart.getTime() > windowMs) {
    errorTracker = {
      paymentFailures: 0,
      paymentAttempts: 0,
      webhookErrors: 0,
      checkoutStarts: 0,
      checkoutAbandons: 0,
      windowStart: now,
    };
  }
}

/**
 * Send alert email via Resend
 */
async function sendAlertEmail(alert: AlertEvent): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    logger.error('[ERROR_ALERTING] RESEND_API_KEY not configured', undefined, { component: 'lib-error-alerting', action: 'service_call' });
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);

    const severityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨',
    };

    const severityColor = {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    };

    await resend.emails.send({
      from: 'Rowan Alerts <alerts@rowanapp.com>',
      to: DEFAULT_CONFIG.emailRecipients,
      subject: `${severityEmoji[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${severityColor[alert.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${severityEmoji[alert.severity]} ${alert.title}</h1>
            <p style="margin: 8px 0 0; opacity: 0.9;">Severity: ${alert.severity.toUpperCase()}</p>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">${alert.description}</p>

            <div style="margin-top: 20px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 12px; color: #111827; font-size: 14px; font-weight: 600;">Details</h3>
              <table style="width: 100%; font-size: 14px; color: #6b7280;">
                <tr>
                  <td style="padding: 4px 0;"><strong>Type:</strong></td>
                  <td style="padding: 4px 0;">${alert.type}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Timestamp:</strong></td>
                  <td style="padding: 4px 0;">${alert.timestamp.toISOString()}</td>
                </tr>
                ${
                  alert.metadata
                    ? Object.entries(alert.metadata)
                        .map(
                          ([key, value]) => `
                  <tr>
                    <td style="padding: 4px 0;"><strong>${key}:</strong></td>
                    <td style="padding: 4px 0;">${JSON.stringify(value)}</td>
                  </tr>
                `
                        )
                        .join('')
                    : ''
                }
              </table>
            </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <a href="https://rowanapp.com/admin/analytics" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                View Dashboard →
              </a>
            </div>
          </div>
          <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
            Rowan App Monitoring System
          </div>
        </div>
      `,
    });

    logger.info(`[ERROR_ALERTING] Alert email sent: ${alert.title}`, { component: 'lib-error-alerting' });
    return true;
  } catch (error) {
    logger.error('[ERROR_ALERTING] Failed to send alert email:', error, { component: 'lib-error-alerting', action: 'service_call' });
    return false;
  }
}

/**
 * Check if threshold is exceeded and send alert if needed
 */
async function checkThresholds(): Promise<void> {
  checkAndResetWindow();

  // Check payment failure rate
  if (errorTracker.paymentAttempts > 0) {
    const failureRate =
      (errorTracker.paymentFailures / errorTracker.paymentAttempts) * 100;
    if (failureRate > DEFAULT_CONFIG.thresholds.paymentFailureRate) {
      await sendAlertEmail({
        severity: 'high',
        type: 'payment_failure_threshold',
        title: 'High Payment Failure Rate Detected',
        description: `Payment failure rate (${failureRate.toFixed(1)}%) has exceeded the threshold of ${DEFAULT_CONFIG.thresholds.paymentFailureRate}%.`,
        metadata: {
          failureRate: `${failureRate.toFixed(1)}%`,
          failures: errorTracker.paymentFailures,
          attempts: errorTracker.paymentAttempts,
          window: `${DEFAULT_CONFIG.windowMinutes} minutes`,
        },
        timestamp: new Date(),
      });
    }
  }

  // Check webhook error count
  if (errorTracker.webhookErrors >= DEFAULT_CONFIG.thresholds.webhookErrorCount) {
    await sendAlertEmail({
      severity: 'high',
      type: 'webhook_error_threshold',
      title: 'Multiple Webhook Errors Detected',
      description: `${errorTracker.webhookErrors} webhook errors have occurred in the last ${DEFAULT_CONFIG.windowMinutes} minutes.`,
      metadata: {
        errorCount: errorTracker.webhookErrors,
        threshold: DEFAULT_CONFIG.thresholds.webhookErrorCount,
        window: `${DEFAULT_CONFIG.windowMinutes} minutes`,
      },
      timestamp: new Date(),
    });
    // Reset after alert to prevent spam
    errorTracker.webhookErrors = 0;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Track a payment attempt
 */
export function trackPaymentAttempt(): void {
  checkAndResetWindow();
  errorTracker.paymentAttempts++;
}

/**
 * Track a payment failure and potentially trigger alert
 */
export async function trackPaymentFailure(data: {
  userId?: string;
  amount?: number;
  error: string;
  polarSubscriptionId?: string;
}): Promise<void> {
  checkAndResetWindow();
  errorTracker.paymentFailures++;

  // Always log critical payment failures (sanitized - no sensitive data in production logs)
  logger.error('[ERROR_ALERTING] Payment failure', undefined, {
    component: 'error-alerting',
    action: 'payment_failure',
    details: { error: data.error, hasAmount: !!data.amount }
  });

  // Check thresholds
  await checkThresholds();

  // Send immediate alert for critical amounts
  if (data.amount && data.amount >= 100) {
    await sendAlertEmail({
      severity: 'high',
      type: 'high_value_payment_failure',
      title: 'High Value Payment Failed',
      description: `A payment of $${data.amount} has failed.`,
      metadata: {
        userId: data.userId || 'unknown',
        amount: `$${data.amount}`,
        error: data.error,
        subscriptionId: data.polarSubscriptionId || 'N/A',
      },
      timestamp: new Date(),
    });
  }
}

/**
 * Track a webhook error and potentially trigger alert
 */
export async function trackWebhookError(data: {
  eventType: string;
  polarEventId: string;
  error: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  checkAndResetWindow();
  errorTracker.webhookErrors++;

  logger.error('[ERROR_ALERTING] Webhook error', undefined, {
    component: 'error-alerting',
    action: 'webhook_error',
    details: { eventType: data.eventType, eventId: data.polarEventId }
  });

  // Check thresholds
  await checkThresholds();
}

/**
 * Track checkout session start
 */
export function trackCheckoutStart(): void {
  checkAndResetWindow();
  errorTracker.checkoutStarts++;
}

/**
 * Track checkout abandonment
 */
export function trackCheckoutAbandon(): void {
  checkAndResetWindow();
  errorTracker.checkoutAbandons++;
}

/**
 * Send a custom alert
 */
export async function sendCustomAlert(alert: Omit<AlertEvent, 'timestamp'>): Promise<boolean> {
  return sendAlertEmail({
    ...alert,
    timestamp: new Date(),
  });
}

/**
 * Get current error tracking stats (for admin dashboard)
 */
export function getErrorStats(): {
  paymentFailureRate: number;
  webhookErrors: number;
  checkoutAbandonRate: number;
  windowStart: Date;
} {
  checkAndResetWindow();

  return {
    paymentFailureRate:
      errorTracker.paymentAttempts > 0
        ? (errorTracker.paymentFailures / errorTracker.paymentAttempts) * 100
        : 0,
    webhookErrors: errorTracker.webhookErrors,
    checkoutAbandonRate:
      errorTracker.checkoutStarts > 0
        ? (errorTracker.checkoutAbandons / errorTracker.checkoutStarts) * 100
        : 0,
    windowStart: errorTracker.windowStart,
  };
}

/**
 * Send critical system alert (for manual triggering)
 */
export async function sendCriticalAlert(
  title: string,
  description: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  return sendAlertEmail({
    severity: 'critical',
    type: 'system_critical',
    title,
    description,
    metadata,
    timestamp: new Date(),
  });
}
