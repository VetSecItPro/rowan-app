// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ success: true, url: 'https://example.com/image.jpg' }),
  }),
}));

import ImageUpload from '@/components/shared/ImageUpload';

describe('ImageUpload', () => {
  const defaultProps = {
    onUploadSuccess: vi.fn(),
    uploadEndpoint: '/api/upload/test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ImageUpload {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays default label', () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.getByText('Upload Image')).toBeTruthy();
  });

  it('displays custom label', () => {
    render(<ImageUpload {...defaultProps} label="Upload Avatar" />);
    expect(screen.getByText('Upload Avatar')).toBeTruthy();
  });

  it('displays default description', () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.getByText('Drag and drop or click to select')).toBeTruthy();
  });

  it('displays custom description', () => {
    render(<ImageUpload {...defaultProps} description="Drop your photo here" />);
    expect(screen.getByText('Drop your photo here')).toBeTruthy();
  });

  it('shows max file size info', () => {
    render(<ImageUpload {...defaultProps} maxSizeMB={5} />);
    expect(screen.getByText(/Max 5MB/)).toBeTruthy();
  });

  it('renders a hidden file input', () => {
    render(<ImageUpload {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
  });

  it('displays current image when provided', () => {
    render(<ImageUpload {...defaultProps} currentImageUrl="https://example.com/photo.jpg" />);
    const img = document.querySelector('img');
    expect(img).toBeTruthy();
  });
});
