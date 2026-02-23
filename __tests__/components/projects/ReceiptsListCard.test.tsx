// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/services/receipts-service', () => ({
  receiptsService: {
    searchReceipts: vi.fn().mockResolvedValue([
      {
        id: 'receipt-1',
        space_id: 'space-1',
        storage_path: 'receipts/receipt-1.jpg',
        merchant_name: 'Whole Foods',
        total_amount: 75.5,
        receipt_date: '2026-01-15',
        category: 'Groceries',
        created_at: new Date().toISOString(),
      },
    ]),
    deleteReceipt: vi.fn().mockResolvedValue(undefined),
    getReceiptImageUrl: vi.fn().mockResolvedValue('https://example.com/receipt.jpg'),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('ReceiptsListCard', () => {
  it('renders without crashing', { timeout: 15000 }, async () => {
    const { ReceiptsListCard } = await import('@/components/projects/ReceiptsListCard');
    const { container } = render(<ReceiptsListCard spaceId="space-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders merchant name after loading', async () => {
    const { ReceiptsListCard } = await import('@/components/projects/ReceiptsListCard');
    render(<ReceiptsListCard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Whole Foods')).toBeTruthy();
    });
  });

  it('renders receipt amount', async () => {
    const { ReceiptsListCard } = await import('@/components/projects/ReceiptsListCard');
    render(<ReceiptsListCard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('$75.50')).toBeTruthy();
    });
  });

  it('renders search input', async () => {
    const { ReceiptsListCard } = await import('@/components/projects/ReceiptsListCard');
    render(<ReceiptsListCard spaceId="space-1" />);
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/search/i);
      expect(input).toBeTruthy();
    });
  });
});
