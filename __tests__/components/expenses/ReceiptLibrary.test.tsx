// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'My Space' },
    user: { id: 'user-1' },
  })),
}));

vi.mock('@/lib/services/receipt-scanning-service', () => ({
  receiptScanningService: {
    getSpaceReceipts: vi.fn().mockResolvedValue([]),
    deleteReceipt: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('use-debounce', () => ({
  useDebounce: (value: string) => [value],
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
     
    <img src={src} alt={alt} />
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: (string | undefined | false)[]) => args.filter(Boolean).join(' '),
}));

// Mock all shadcn/ui components used
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-title">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-description">{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange }: { placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <input placeholder={placeholder} value={value} onChange={onChange} />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ReceiptLibrary } from '@/components/expenses/ReceiptLibrary';

describe('ReceiptLibrary', () => {
  it('renders without crashing', () => {
    render(<ReceiptLibrary />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders the card wrapper', () => {
    render(<ReceiptLibrary />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<ReceiptLibrary />);
    // While loading, shows spinner text
    expect(screen.getByText('Loading receipts...')).toBeInTheDocument();
  });

  it('renders Receipt Library title after loading', async () => {
    render(<ReceiptLibrary />);
    await waitFor(() => {
      expect(screen.getByText('Receipt Library')).toBeInTheDocument();
    });
  });

  it('renders description text after loading', async () => {
    render(<ReceiptLibrary />);
    await waitFor(() => {
      expect(screen.getByText('Manage your scanned receipts and extracted data')).toBeInTheDocument();
    });
  });

  it('renders search placeholder after loading', async () => {
    render(<ReceiptLibrary />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by merchant or amount...')).toBeInTheDocument();
    });
  });

  it('renders empty receipts message after loading', async () => {
    render(<ReceiptLibrary />);
    await waitFor(() => {
      expect(screen.getByText('No receipts found')).toBeInTheDocument();
    });
  });

  it('renders status filter options after loading', async () => {
    render(<ReceiptLibrary />);
    await waitFor(() => {
      expect(screen.getByText('All Receipts')).toBeInTheDocument();
    });
  });
});
