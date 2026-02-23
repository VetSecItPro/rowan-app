// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/services/reminder-attachments-service', () => ({
  reminderAttachmentsService: {
    getAttachments: vi.fn().mockResolvedValue([]),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
    getFileUrl: vi.fn((path: string) => `https://example.com/${path}`),
    isImage: vi.fn().mockReturnValue(false),
    getAttachmentIcon: vi.fn().mockReturnValue('📄'),
    formatFileSize: vi.fn().mockReturnValue('1 KB'),
  },
}));

vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, onClose, onConfirm, title }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
  }) => isOpen ? (
    <div data-testid="confirm-dialog">
      <span>{title}</span>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ) : null,
}));

import { AttachmentList } from '@/components/reminders/AttachmentList';

describe('AttachmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with valid reminderId', () => {
    const { container } = render(<AttachmentList reminderId="reminder-1" />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<AttachmentList reminderId="reminder-1" />);
    expect(screen.getByText('Loading attachments...')).toBeTruthy();
  });

  it('returns null for undefined reminderId', () => {
    const { container } = render(<AttachmentList reminderId="undefined" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null for empty reminderId', () => {
    const { container } = render(<AttachmentList reminderId="" />);
    expect(container.firstChild).toBeNull();
  });

  it('accepts a refreshTrigger prop', () => {
    const { container } = render(
      <AttachmentList reminderId="reminder-1" refreshTrigger={0} />
    );
    expect(container).toBeTruthy();
  });

  it('renders with attachments from service', async () => {
    const { reminderAttachmentsService } = await import('@/lib/services/reminder-attachments-service');
    (reminderAttachmentsService.getAttachments as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 'att-1',
        reminder_id: 'reminder-1',
        display_name: 'test-file.pdf',
        type: 'file',
        file_path: 'path/to/file.pdf',
        file_size: 1024,
        uploaded_by: 'user-1',
        created_at: new Date().toISOString(),
      },
    ]);

    const { rerender } = render(<AttachmentList reminderId="reminder-1" />);
    // Initially loading
    expect(screen.getByText('Loading attachments...')).toBeTruthy();
  });
});
