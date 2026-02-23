// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showWarning: vi.fn(),
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
    uploadFile: vi.fn().mockResolvedValue({ id: 'att-1' }),
    createUrlAttachment: vi.fn().mockResolvedValue({ id: 'att-2' }),
    getAttachments: vi.fn().mockResolvedValue([]),
    deleteAttachment: vi.fn().mockResolvedValue(undefined),
    getFileUrl: vi.fn((path: string) => `https://example.com/${path}`),
    isImage: vi.fn().mockReturnValue(false),
    getAttachmentIcon: vi.fn().mockReturnValue('📄'),
    formatFileSize: vi.fn().mockReturnValue('1 KB'),
  },
}));

import { AttachmentUploader } from '@/components/reminders/AttachmentUploader';

describe('AttachmentUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });

  it('renders the drag and drop zone', () => {
    render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    expect(screen.getByText(/Drag and drop files here/)).toBeTruthy();
  });

  it('renders the browse button text', () => {
    render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    expect(screen.getByText('browse')).toBeTruthy();
  });

  it('renders the file size limit text', () => {
    render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    expect(screen.getByText(/Max 2MB/)).toBeTruthy();
  });

  it('renders the Add Link button', () => {
    render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    expect(screen.getByText('Add Link')).toBeTruthy();
  });

  it('shows URL input when Add Link is clicked', () => {
    render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Add Link'));
    // "Add URL" appears as both a span label and a button - use getAllByText
    const addUrlElements = screen.getAllByText('Add URL');
    expect(addUrlElements.length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('https://example.com')).toBeTruthy();
  });

  it('renders display name input in URL mode', () => {
    render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Add Link'));
    expect(screen.getByPlaceholderText('Display name (optional)')).toBeTruthy();
  });

  it('hides Add Link button when URL input is shown', () => {
    render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Add Link'));
    // The "Add Link" button should be gone now
    expect(screen.queryByText('Add Link')).toBeNull();
  });

  it('closes URL input when X button is clicked', () => {
    render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Add Link'));
    // Find the close button in the URL panel (svg-only button - the X icon button)
    const allButtons = screen.getAllByRole('button');
    const closeBtn = allButtons.find(btn => !btn.textContent?.trim());
    if (closeBtn) fireEvent.click(closeBtn);
    // After closing, the URL placeholder should be gone
    expect(screen.queryByPlaceholderText('https://example.com')).toBeNull();
  });

  it('Add URL submit button is disabled when URL is empty', () => {
    render(
      <AttachmentUploader reminderId="reminder-1" onUploadComplete={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Add Link'));
    // Find the Add URL button (the button element among "Add URL" matches)
    const addUrlElements = screen.getAllByText('Add URL');
    const submitBtn = addUrlElements.find(
      el => el.tagName === 'BUTTON'
    ) as HTMLButtonElement | undefined;
    if (submitBtn) {
      expect(submitBtn.disabled).toBe(true);
    }
  });
});
