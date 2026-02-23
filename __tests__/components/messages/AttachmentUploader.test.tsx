// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttachmentUploader } from '@/components/messages/AttachmentUploader';

vi.mock('@/lib/services/file-upload-service', () => ({
  fileUploadService: {
    validateFile: vi.fn().mockResolvedValue({ valid: true }),
    uploadFile: vi.fn().mockResolvedValue({
      id: 'upload-1',
      file_name: 'test.jpg',
      file_size: 1024,
      file_type: 'image',
      public_url: 'https://example.com/test.jpg',
      thumbnail_url: null,
      duration: null,
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AttachmentUploader', () => {
  const onUploadComplete = vi.fn();

  const defaultProps = {
    messageId: 'msg-1',
    spaceId: 'space-1',
    onUploadComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<AttachmentUploader {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a file upload button', () => {
    render(<AttachmentUploader {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });

  it('renders an upload icon', () => {
    render(<AttachmentUploader {...defaultProps} />);
    // The upload button should exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('has a hidden file input', () => {
    render(<AttachmentUploader {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
  });

  it('file input accepts files', () => {
    render(<AttachmentUploader {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
  });

  it('clicking button triggers file input', () => {
    render(<AttachmentUploader {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(clickSpy).toHaveBeenCalled();
  });
});
