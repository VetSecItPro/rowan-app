import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────
// Set env var before anything is imported (vi.hoisted runs first, before module eval)
const { mockEmailsSend, mockLogDeletionAction } = vi.hoisted(() => {
  process.env.RESEND_API_KEY = 'test-key';
  return {
    mockEmailsSend: vi.fn(),
    mockLogDeletionAction: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('resend', () => ({
  // Use a regular function (not arrow) so it can be called with `new`
  Resend: vi.fn(function () {
    return { emails: { send: mockEmailsSend } };
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/services/account-deletion-service', () => ({
  accountDeletionService: {
    logDeletionAction: mockLogDeletionAction,
  },
}));

import {
  sendDeletionInitiatedEmail,
  send30DayWarningEmail,
  sendPermanentDeletionConfirmationEmail,
} from '@/lib/services/email-notification-service';

describe('email-notification-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── sendDeletionInitiatedEmail ─────────────────────────────────────────────
  describe('sendDeletionInitiatedEmail', () => {
    it('returns success when email is sent', async () => {
      mockEmailsSend.mockResolvedValue({ error: null });

      const result = await sendDeletionInitiatedEmail('user@test.com', 'user-1', 'Alice');

      expect(result.success).toBe(true);
      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: expect.stringContaining('Deletion'),
        })
      );
    });

    it('logs audit event after successful send', async () => {
      mockEmailsSend.mockResolvedValue({ error: null });

      await sendDeletionInitiatedEmail('user@test.com', 'user-1');

      expect(mockLogDeletionAction).toHaveBeenCalledWith(
        'user-1',
        'email_sent',
        expect.objectContaining({ email_type: 'deletion_initiated' })
      );
    });

    it('returns failure when Resend returns an error', async () => {
      mockEmailsSend.mockResolvedValue({ error: new Error('Send failed') });

      const result = await sendDeletionInitiatedEmail('user@test.com', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure when Resend throws', async () => {
      mockEmailsSend.mockRejectedValue(new Error('Network error'));

      const result = await sendDeletionInitiatedEmail('user@test.com', 'user-1');

      expect(result.success).toBe(false);
    });
  });

  // ── send30DayWarningEmail ──────────────────────────────────────────────────
  describe('send30DayWarningEmail', () => {
    it('returns success when warning email is sent', async () => {
      mockEmailsSend.mockResolvedValue({ error: null });

      const result = await send30DayWarningEmail('user@test.com', 'user-1', 'Alice');

      expect(result.success).toBe(true);
      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: expect.stringContaining('Warning'),
        })
      );
    });

    it('uses provided deletion date in email HTML', async () => {
      mockEmailsSend.mockResolvedValue({ error: null });
      // Use local date constructor to avoid UTC timezone shift
      const deletionDate = new Date(2026, 5, 1); // June 1, 2026 local time
      const expectedDateStr = deletionDate.toLocaleDateString(); // same as service uses

      await send30DayWarningEmail('user@test.com', 'user-1', 'Alice', deletionDate);

      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(expectedDateStr),
        })
      );
    });

    it('returns failure on send error', async () => {
      mockEmailsSend.mockResolvedValue({ error: new Error('Error') });

      const result = await send30DayWarningEmail('user@test.com', 'user-1');

      expect(result.success).toBe(false);
    });

    it('logs audit event after successful send', async () => {
      mockEmailsSend.mockResolvedValue({ error: null });

      await send30DayWarningEmail('user@test.com', 'user-1');

      expect(mockLogDeletionAction).toHaveBeenCalledWith(
        'user-1',
        'email_sent',
        expect.objectContaining({ email_type: '30_day_warning' })
      );
    });
  });

  // ── sendPermanentDeletionConfirmationEmail ─────────────────────────────────
  describe('sendPermanentDeletionConfirmationEmail', () => {
    it('returns success when confirmation email is sent', async () => {
      mockEmailsSend.mockResolvedValue({ error: null });

      const result = await sendPermanentDeletionConfirmationEmail('user@test.com', 'user-1', 'Alice');

      expect(result.success).toBe(true);
      expect(mockEmailsSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: expect.stringContaining('Deleted'),
        })
      );
    });

    it('returns failure when Resend throws', async () => {
      mockEmailsSend.mockRejectedValue(new Error('SMTP error'));

      const result = await sendPermanentDeletionConfirmationEmail('user@test.com', 'user-1');

      expect(result.success).toBe(false);
    });

    it('logs audit event after successful send', async () => {
      mockEmailsSend.mockResolvedValue({ error: null });

      await sendPermanentDeletionConfirmationEmail('user@test.com', 'user-1');

      expect(mockLogDeletionAction).toHaveBeenCalledWith(
        'user-1',
        'email_sent',
        expect.objectContaining({ email_type: 'permanent_deletion_confirmation' })
      );
    });
  });
});
