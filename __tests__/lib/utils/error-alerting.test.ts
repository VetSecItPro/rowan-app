/**
 * Unit tests for lib/utils/error-alerting.ts
 *
 * Tests payment/webhook tracking, error stat calculation, threshold
 * logic, and custom/critical alert sending.
 *
 * Note: The module uses an in-memory errorTracker singleton. Tests account
 * for accumulated state rather than resetting the module between suites.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock: create the email sender spy before any imports so it is
// available both in the vi.mock factory and in the test assertions.
// ---------------------------------------------------------------------------

const { mockEmailsSend } = vi.hoisted(() => {
  const mockEmailsSend = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null });
  return { mockEmailsSend };
});

// The Resend constructor MUST use the `function` keyword (not an arrow fn)
// so Vitest can detect it as a class-like mock without warnings.
vi.mock('resend', () => {
  function ResendMock() {
    return { emails: { send: mockEmailsSend } };
  }
  return { Resend: ResendMock };
});

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Set RESEND_API_KEY so sendAlertEmail can proceed
// ---------------------------------------------------------------------------

process.env.RESEND_API_KEY = 'test-resend-key';

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import {
  trackPaymentAttempt,
  trackPaymentFailure,
  trackWebhookError,
  trackCheckoutStart,
  trackCheckoutAbandon,
  sendCustomAlert,
  sendCriticalAlert,
  getErrorStats,
} from '@/lib/utils/error-alerting';

// ---------------------------------------------------------------------------
// getErrorStats
// ---------------------------------------------------------------------------

describe('getErrorStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return numeric rates that are >= 0', () => {
    const stats = getErrorStats();
    expect(stats.paymentFailureRate).toBeGreaterThanOrEqual(0);
    expect(stats.webhookErrors).toBeGreaterThanOrEqual(0);
    expect(stats.checkoutAbandonRate).toBeGreaterThanOrEqual(0);
  });

  it('should return a windowStart that is a Date instance', () => {
    expect(getErrorStats().windowStart).toBeInstanceOf(Date);
  });

  it('should return numeric stats (shape check)', () => {
    const stats = getErrorStats();
    expect(typeof stats.paymentFailureRate).toBe('number');
    expect(typeof stats.webhookErrors).toBe('number');
    expect(typeof stats.checkoutAbandonRate).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// trackPaymentAttempt
// ---------------------------------------------------------------------------

describe('trackPaymentAttempt', () => {
  it('should not throw', () => {
    expect(() => trackPaymentAttempt()).not.toThrow();
  });

  it('should be callable multiple times without error', () => {
    expect(() => {
      trackPaymentAttempt();
      trackPaymentAttempt();
      trackPaymentAttempt();
    }).not.toThrow();
  });

  it('should return undefined (void)', () => {
    expect(trackPaymentAttempt()).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// trackPaymentFailure
// ---------------------------------------------------------------------------

describe('trackPaymentFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
    // Drive denominator high so the failure rate threshold is not accidentally
    // triggered during these tests (threshold = 10 %)
    for (let i = 0; i < 100; i++) trackPaymentAttempt();
  });

  it('should resolve without throwing for a basic error', async () => {
    await expect(trackPaymentFailure({ error: 'insufficient_funds' })).resolves.toBeUndefined();
  });

  it('should send an immediate alert email when amount >= 100', async () => {
    await trackPaymentFailure({ error: 'card_declined', amount: 150, userId: 'u1' });

    expect(mockEmailsSend).toHaveBeenCalled();
    const lastCall = mockEmailsSend.mock.calls[mockEmailsSend.mock.calls.length - 1];
    expect((lastCall[0] as { subject: string }).subject).toContain('High Value Payment Failed');
  });

  it('should not throw when optional fields are absent', async () => {
    await expect(trackPaymentFailure({ error: 'unknown_error' })).resolves.toBeUndefined();
  });

  it('should include the amount in the email HTML for high-value failures', async () => {
    await trackPaymentFailure({ error: 'card_declined', amount: 500 });

    const lastCall = mockEmailsSend.mock.calls[mockEmailsSend.mock.calls.length - 1];
    expect((lastCall[0] as { html: string }).html).toContain('500');
  });
});

// ---------------------------------------------------------------------------
// trackWebhookError
// ---------------------------------------------------------------------------

describe('trackWebhookError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
  });

  it('should resolve without throwing', async () => {
    await expect(
      trackWebhookError({ eventType: 'subscription.created', polarEventId: 'evt-1', error: 'parse error' })
    ).resolves.toBeUndefined();
  });

  it('should accept optional metadata without throwing', async () => {
    await expect(
      trackWebhookError({
        eventType: 'payment.failed',
        polarEventId: 'evt-2',
        error: 'signature mismatch',
        metadata: { attempt: 2 },
      })
    ).resolves.toBeUndefined();
  });

  it('should send a threshold alert email after 5 consecutive webhook errors', async () => {
    vi.clearAllMocks();

    for (let i = 0; i < 5; i++) {
      await trackWebhookError({
        eventType: 'payment.failed',
        polarEventId: `evt-${i}`,
        error: 'err',
      });
    }

    expect(mockEmailsSend).toHaveBeenCalled();
    const subjects = mockEmailsSend.mock.calls.map(
      (c) => (c[0] as { subject: string }).subject
    );
    expect(subjects.some((s) => s.includes('Webhook'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// trackCheckoutStart / trackCheckoutAbandon
// ---------------------------------------------------------------------------

describe('trackCheckoutStart and trackCheckoutAbandon', () => {
  it('should not throw when tracking checkout start', () => {
    expect(() => trackCheckoutStart()).not.toThrow();
  });

  it('should not throw when tracking checkout abandon', () => {
    expect(() => trackCheckoutAbandon()).not.toThrow();
  });

  it('should be callable in sequence without error', () => {
    expect(() => {
      trackCheckoutStart();
      trackCheckoutAbandon();
      trackCheckoutStart();
      trackCheckoutStart();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// sendCustomAlert
// ---------------------------------------------------------------------------

describe('sendCustomAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
  });

  it('should return true when the email is sent successfully', async () => {
    mockEmailsSend.mockResolvedValueOnce({ data: { id: 'email-ok' }, error: null });

    const result = await sendCustomAlert({
      severity: 'medium',
      type: 'custom_event',
      title: 'Test Alert',
      description: 'Something happened',
    });

    expect(result).toBe(true);
  });

  it('should include the severity level in the email subject', async () => {
    await sendCustomAlert({
      severity: 'high',
      type: 'test_type',
      title: 'My Custom Title',
      description: 'Details here',
    });

    expect(mockEmailsSend).toHaveBeenCalled();
    const callArg = mockEmailsSend.mock.calls[0][0] as { subject: string };
    expect(callArg.subject.toUpperCase()).toContain('HIGH');
  });

  it('should return false when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendCustomAlert({
      severity: 'low',
      type: 'no_key',
      title: 'No Key Alert',
      description: 'Should fail silently',
    });

    expect(result).toBe(false);
  });

  it('should include metadata values in the email HTML when provided', async () => {
    await sendCustomAlert({
      severity: 'critical',
      type: 'test',
      title: 'With Meta',
      description: 'Check meta',
      metadata: { key: 'value', count: 42 },
    });

    expect(mockEmailsSend).toHaveBeenCalled();
    const callArg = mockEmailsSend.mock.calls[0][0] as { html: string };
    expect(callArg.html).toContain('key');
    expect(callArg.html).toContain('42');
  });

  it('should return false when Resend.emails.send throws', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockEmailsSend.mockRejectedValueOnce(new Error('SMTP error'));

    const result = await sendCustomAlert({
      severity: 'low',
      type: 'err_test',
      title: 'Error Test',
      description: 'Should catch',
    });

    expect(result).toBe(false);
  });

  it('should send the email to at least one recipient', async () => {
    await sendCustomAlert({
      severity: 'low',
      type: 'test',
      title: 'Recipient Check',
      description: 'Who gets this?',
    });

    expect(mockEmailsSend).toHaveBeenCalled();
    const callArg = mockEmailsSend.mock.calls[0][0] as { to: string[] };
    expect(Array.isArray(callArg.to)).toBe(true);
    expect(callArg.to.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// sendCriticalAlert
// ---------------------------------------------------------------------------

describe('sendCriticalAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-resend-key';
  });

  it('should send an email that includes CRITICAL in the subject', async () => {
    await sendCriticalAlert('System Down', 'The database is unreachable');

    expect(mockEmailsSend).toHaveBeenCalled();
    const callArg = mockEmailsSend.mock.calls[0][0] as { subject: string };
    expect(callArg.subject.toUpperCase()).toContain('CRITICAL');
  });

  it('should include the title in the email HTML body', async () => {
    await sendCriticalAlert('DB Failure', 'Connection pool exhausted');

    expect(mockEmailsSend).toHaveBeenCalled();
    const callArg = mockEmailsSend.mock.calls[0][0] as { html: string };
    expect(callArg.html).toContain('DB Failure');
  });

  it('should return true on a successful send', async () => {
    const result = await sendCriticalAlert('Test', 'Test description');
    expect(result).toBe(true);
  });

  it('should include optional metadata values in the email HTML', async () => {
    await sendCriticalAlert('Test', 'Details', { region: 'us-east-1', pod: 'rowan-api-3' });

    expect(mockEmailsSend).toHaveBeenCalled();
    const callArg = mockEmailsSend.mock.calls[0][0] as { html: string };
    expect(callArg.html).toContain('us-east-1');
  });

  it('should return false when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendCriticalAlert('No Key', 'No key configured');
    expect(result).toBe(false);
  });
});
