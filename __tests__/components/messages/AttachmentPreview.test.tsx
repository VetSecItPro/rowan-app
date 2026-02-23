// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttachmentPreview } from '@/components/messages/AttachmentPreview';
import type { FileUploadResult } from '@/lib/services/file-upload-service';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizeUrl: vi.fn((url: string) => url),
}));

const makeAttachment = (overrides: Partial<FileUploadResult> = {}): FileUploadResult => ({
  id: 'attach-1',
  file_name: 'test-file.pdf',
  file_size: 1024,
  mime_type: 'application/pdf',
  public_url: 'https://example.com/test-file.pdf',
  storage_path: 'uploads/test-file.pdf',
  thumbnail_url: null,
  duration: null,
  width: null,
  height: null,
  ...overrides,
});

describe('AttachmentPreview', () => {
  it('renders without crashing for a PDF attachment', () => {
    const { container } = render(<AttachmentPreview attachment={makeAttachment()} />);
    expect(container).toBeTruthy();
  });

  it('shows file name for non-media attachments', () => {
    render(<AttachmentPreview attachment={makeAttachment({ file_name: 'document.pdf' })} />);
    expect(screen.getByText('document.pdf')).toBeTruthy();
  });

  it('shows file size formatted in KB', () => {
    render(<AttachmentPreview attachment={makeAttachment({ file_size: 2048 })} />);
    expect(screen.getByText('2.0 KB')).toBeTruthy();
  });

  it('shows file size formatted in bytes for small files', () => {
    render(<AttachmentPreview attachment={makeAttachment({ file_size: 512 })} />);
    expect(screen.getByText('512 B')).toBeTruthy();
  });

  it('renders image attachment container for image mime type', () => {
    // Image renders via Next.js Image — check there is any content
    const { container } = render(
      <AttachmentPreview
        attachment={makeAttachment({
          mime_type: 'image/jpeg',
          public_url: 'https://example.com/photo.jpg',
          width: 800,
          height: 600,
        })}
      />
    );
    // The container renders something (the image div)
    expect(container.firstChild).toBeTruthy();
  });

  it('shows delete button when onDelete is provided', () => {
    const { container } = render(
      <AttachmentPreview attachment={makeAttachment()} onDelete={vi.fn()} />
    );
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('does not crash in compact mode', () => {
    const { container } = render(
      <AttachmentPreview attachment={makeAttachment()} compact={true} />
    );
    expect(container).toBeTruthy();
  });
});
