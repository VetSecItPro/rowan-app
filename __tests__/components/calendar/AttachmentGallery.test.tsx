// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, session: null, loading: false, signOut: vi.fn() })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { alt: string }) =>
    <img alt={alt} {...props} />,
}));
vi.mock('@/lib/services/event-attachments-service', () => ({
  eventAttachmentsService: {
    getAttachments: vi.fn().mockResolvedValue([]),
    getAttachmentUrl: vi.fn().mockResolvedValue('http://example.com/file.jpg'),
    uploadAttachment: vi.fn().mockResolvedValue({}),
    deleteAttachment: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, onClose, onConfirm, title }: {
    isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string;
  }) => isOpen ? (
    <div>
      <div>{title}</div>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ) : null,
}));

import { AttachmentGallery } from '@/components/calendar/AttachmentGallery';

describe('AttachmentGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<AttachmentGallery eventId="event-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Upload Attachments')).toBeTruthy();
    });
  });

  it('shows upload button when canUpload is true', async () => {
    render(<AttachmentGallery eventId="event-1" spaceId="space-1" canUpload={true} />);
    await waitFor(() => {
      expect(screen.getByText('Upload Attachments')).toBeTruthy();
    });
  });

  it('hides upload button when canUpload is false', async () => {
    render(<AttachmentGallery eventId="event-1" spaceId="space-1" canUpload={false} />);
    await waitFor(() => {
      expect(screen.queryByText('Upload Attachments')).toBeNull();
    });
  });

  it('shows empty state when no attachments', async () => {
    render(<AttachmentGallery eventId="event-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('No attachments yet')).toBeTruthy();
    });
  });

  it('shows image attachments when present', async () => {
    const { eventAttachmentsService } = await import('@/lib/services/event-attachments-service');
    vi.mocked(eventAttachmentsService.getAttachments).mockResolvedValueOnce([
      {
        id: 'att-1',
        file_name: 'photo.jpg',
        mime_type: 'image/jpeg',
        file_size: 1024,
        uploaded_by: 'user-1',
        event_id: 'event-1',
        space_id: 'space-1',
        storage_path: 'path/to/photo.jpg',
        created_at: '2024-01-01',
      },
    ]);
    render(<AttachmentGallery eventId="event-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Images/)).toBeTruthy();
    });
  });
});
