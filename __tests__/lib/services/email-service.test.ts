import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock setup so it's available at module evaluation time
const mockSend = vi.hoisted(() => vi.fn());

vi.hoisted(() => {
  process.env.RESEND_API_KEY = 'test-api-key';
});

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import * as emailService from '@/lib/services/email-service';

vi.mock('@react-email/components', () => ({
  render: vi.fn((component) => Promise.resolve(`<html>${JSON.stringify(component)}</html>`)),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock all email templates individually (vi.mock is hoisted, can't use forEach)
vi.mock('@/lib/emails/templates/TaskAssignmentEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/EventReminderEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/SpaceInvitationEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/NewMessageEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/ShoppingListEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/MealReminderEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/GeneralReminderEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/DailyDigestEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/password-reset-email', () => ({
  PasswordResetEmail: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/magic-link-email', () => ({
  MagicLinkEmail: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/email-verification-email', () => ({
  EmailVerificationEmail: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/email-change-email', () => ({
  EmailChangeEmail: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/SubscriptionWelcomeEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/PaymentFailedEmail', () => ({
  default: vi.fn((data) => data),
}));

vi.mock('@/lib/emails/templates/SubscriptionCancelledEmail', () => ({
  default: vi.fn((data) => data),
}));

describe('email-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-api-key';
  });

  describe('sendTaskAssignmentEmail', () => {
    it('should send task assignment email successfully', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg-123' },
        error: null,
      });

      const data: emailService.TaskAssignmentData = {
        recipientEmail: 'user@example.com',
        recipientName: 'John Doe',
        assignerName: 'Jane Smith',
        taskTitle: 'Complete report',
        taskDescription: 'Quarterly report',
        dueDate: '2024-12-31',
        priority: 'high',
        spaceId: 'space-1',
        taskId: 'task-1',
        spaceName: 'Family',
      };

      const result = await emailService.sendTaskAssignmentEmail(data);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle send failures', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'API error' },
      });

      const data: emailService.TaskAssignmentData = {
        recipientEmail: 'user@example.com',
        recipientName: 'John',
        assignerName: 'Jane',
        taskTitle: 'Task',
        priority: 'low',
        spaceId: 'space-1',
        taskId: 'task-1',
        spaceName: 'Family',
      };

      const result = await emailService.sendTaskAssignmentEmail(data);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
  });

  describe('sendEventReminderEmail', () => {
    it('should send event reminder email', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg-456' },
        error: null,
      });

      const data: emailService.EventReminderData = {
        recipientEmail: 'user@example.com',
        recipientName: 'John',
        eventTitle: 'Team Meeting',
        eventDate: '2024-12-25',
        eventTime: '10:00 AM',
        reminderType: '15min',
        eventId: 'event-1',
        spaceId: 'space-1',
        spaceName: 'Work',
      };

      const result = await emailService.sendEventReminderEmail(data);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-456');
    });
  });

  describe('sendSpaceInvitationEmail', () => {
    it('should send invitation email', async () => {
      mockSend.mockResolvedValue({ data: { id: 'msg-789' }, error: null });

      const data: emailService.SpaceInvitationData = {
        recipientEmail: 'newuser@example.com',
        inviterName: 'John',
        spaceName: 'Family',
        invitationUrl: 'https://app.com/invite/xyz',
        expiresAt: '2024-12-31',
      };

      const result = await emailService.sendSpaceInvitationEmail(data);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle failures', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      });

      const data: emailService.SpaceInvitationData = {
        recipientEmail: 'user@example.com',
        inviterName: 'John',
        spaceName: 'Family',
        invitationUrl: 'https://app.com/invite/xyz',
        expiresAt: '2024-12-31',
      };

      const result = await emailService.sendSpaceInvitationEmail(data);

      expect(result.success).toBe(false);
    });
  });

  describe('sendBatchEmails', () => {
    it('should send multiple emails in parallel batches', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg-batch' },
        error: null,
      });

      const emails = Array.from({ length: 25 }, (_, i) => ({
        type: 'task' as const,
        data: {
          recipientEmail: `user${i}@example.com`,
          recipientName: `User ${i}`,
          assignerName: 'Admin',
          taskTitle: `Task ${i}`,
          priority: 'low' as const,
          spaceId: 'space-1',
          taskId: `task-${i}`,
          spaceName: 'Family',
        },
      }));

      const result = await emailService.sendBatchEmails(emails);

      expect(result.success).toBe(25);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(25);
    });

    it('should handle partial failures in batch', async () => {
      let callCount = 0;
      mockSend.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.resolve({ data: null, error: { message: 'Failed' } });
        }
        return Promise.resolve({ data: { id: `msg-${callCount}` }, error: null });
      });

      const emails = Array.from({ length: 10 }, (_, i) => ({
        type: 'task' as const,
        data: {
          recipientEmail: `user${i}@example.com`,
          recipientName: `User ${i}`,
          assignerName: 'Admin',
          taskTitle: `Task ${i}`,
          priority: 'low' as const,
          spaceId: 'space-1',
          taskId: `task-${i}`,
          spaceName: 'Family',
        },
      }));

      const result = await emailService.sendBatchEmails(emails);

      expect(result.success).toBe(5);
      expect(result.failed).toBe(5);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg-reset' },
        error: null,
      });

      const data: emailService.PasswordResetData = {
        userEmail: 'user@example.com',
        resetUrl: 'https://app.com/reset/token',
        userName: 'John',
      };

      const result = await emailService.sendPasswordResetEmail(data);

      expect(result.success).toBe(true);
    });
  });

  describe('sendMagicLinkEmail', () => {
    it('should send magic link email', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg-magic' },
        error: null,
      });

      const data: emailService.MagicLinkData = {
        userEmail: 'user@example.com',
        magicLinkUrl: 'https://app.com/magic/token',
        userName: 'John',
      };

      const result = await emailService.sendMagicLinkEmail(data);

      expect(result.success).toBe(true);
    });
  });

  describe('sendSubscriptionWelcomeEmail', () => {
    it('should send subscription welcome email', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg-welcome' },
        error: null,
      });

      const data: emailService.SubscriptionWelcomeData = {
        recipientEmail: 'user@example.com',
        recipientName: 'John',
        tier: 'pro',
        period: 'monthly',
        dashboardUrl: 'https://app.com/dashboard',
      };

      const result = await emailService.sendSubscriptionWelcomeEmail(data);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Pro'),
        })
      );
    });
  });

  describe('verifyEmailService', () => {
    it('should verify email service is configured', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg-test' },
        error: null,
      });

      const result = await emailService.verifyEmailService();

      expect(result.success).toBe(true);
    });

    // Note: Cannot test "Resend not configured" because the module-level
    // `const resend = ...` is evaluated once at import time with the mocked env var.
  });
});
