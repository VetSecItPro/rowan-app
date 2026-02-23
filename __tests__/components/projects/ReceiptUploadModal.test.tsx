// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/services/receipts-service', () => ({
  receiptsService: {
    uploadReceipt: vi.fn().mockResolvedValue({ id: 'receipt-1' }),
    deleteReceipt: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/services/ocr-service', () => ({
  ocrService: {
    processReceipt: vi.fn().mockResolvedValue({
      merchant_name: 'Walmart',
      total_amount: 50,
      date: '2026-01-15',
      category: 'Shopping',
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, title, isOpen }: React.PropsWithChildren<{ title?: string; isOpen?: boolean }>) =>
    isOpen
      ? React.createElement('div', { 'data-testid': 'modal' }, [
          React.createElement('h2', { key: 'title' }, title),
          children,
        ])
      : null,
}));

describe('ReceiptUploadModal', () => {
  it('renders without crashing when closed', async () => {
    const { ReceiptUploadModal } = await import('@/components/projects/ReceiptUploadModal');
    const { container } = render(
      <ReceiptUploadModal isOpen={false} onClose={vi.fn()} spaceId="space-1" />
    );
    expect(container).toBeTruthy();
  });

  it('renders modal when open', async () => {
    const { ReceiptUploadModal } = await import('@/components/projects/ReceiptUploadModal');
    render(<ReceiptUploadModal isOpen={true} onClose={vi.fn()} spaceId="space-1" />);
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('renders upload receipt title', async () => {
    const { ReceiptUploadModal } = await import('@/components/projects/ReceiptUploadModal');
    render(<ReceiptUploadModal isOpen={true} onClose={vi.fn()} spaceId="space-1" />);
    expect(screen.getByText(/upload receipt/i)).toBeTruthy();
  });

  it('renders file input and upload area', async () => {
    const { ReceiptUploadModal } = await import('@/components/projects/ReceiptUploadModal');
    render(<ReceiptUploadModal isOpen={true} onClose={vi.fn()} spaceId="space-1" />);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);
  });
});
