// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'My Space' },
    user: { id: 'user-1' },
  })),
}));

vi.mock('@/lib/services/receipt-scanning-service', () => ({
  receiptScanningService: {
    processReceiptImage: vi.fn(),
  },
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
     
    <img src={src} alt={alt} />
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: (string | undefined | false)[]) => args.filter(Boolean).join(' '),
}));

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
  Button: ({
    children,
    onClick,
    size,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    size?: string;
    variant?: string;
  }) => (
    <button onClick={onClick} data-size={size} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ReceiptScanner } from '@/components/expenses/ReceiptScanner';

describe('ReceiptScanner', () => {
  it('renders without crashing', () => {
    render(<ReceiptScanner />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('renders Receipt Scanner title', () => {
    render(<ReceiptScanner />);
    expect(screen.getByText('Receipt Scanner')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<ReceiptScanner />);
    expect(
      screen.getByText('Upload a photo of your receipt to automatically extract expense details')
    ).toBeInTheDocument();
  });

  it('renders upload area in idle state', () => {
    render(<ReceiptScanner />);
    expect(screen.getByText('Upload Receipt Photo')).toBeInTheDocument();
  });

  it('renders drag and drop instructions', () => {
    render(<ReceiptScanner />);
    expect(
      screen.getByText('Drag and drop an image here, or click to select')
    ).toBeInTheDocument();
  });

  it('renders Choose File button', () => {
    render(<ReceiptScanner />);
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('renders Take Photo button', () => {
    render(<ReceiptScanner />);
    expect(screen.getByText('Take Photo')).toBeInTheDocument();
  });

  it('renders file type info', () => {
    render(<ReceiptScanner />);
    expect(screen.getByText(/Supports JPG, PNG, WEBP/)).toBeInTheDocument();
  });

  it('renders hidden file input', () => {
    render(<ReceiptScanner />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('hidden');
  });
});
