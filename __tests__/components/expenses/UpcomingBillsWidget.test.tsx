// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/services/bill-calendar-service', () => ({
  billCalendarService: {
    getUpcomingBills: vi.fn().mockResolvedValue([]),
    getOverdueBills: vi.fn().mockResolvedValue([]),
    getTotalBillsUpcoming: vi.fn().mockResolvedValue({ totalAmount: 0, count: 0 }),
    subscribeToUpcomingBills: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    markBillAsPaid: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import UpcomingBillsWidget from '@/components/expenses/UpcomingBillsWidget';

describe('UpcomingBillsWidget', () => {
  it('renders without crashing', () => {
    render(<UpcomingBillsWidget spaceId="space-1" />);
    expect(screen.getByText('Upcoming Bills')).toBeInTheDocument();
  });

  it('renders the header', () => {
    render(<UpcomingBillsWidget spaceId="space-1" />);
    expect(screen.getByText('Upcoming Bills')).toBeInTheDocument();
  });

  it('renders "Next X days" subheading with default daysAhead', () => {
    render(<UpcomingBillsWidget spaceId="space-1" />);
    expect(screen.getByText('Next 30 days')).toBeInTheDocument();
  });

  it('renders "Next X days" with custom daysAhead', () => {
    render(<UpcomingBillsWidget spaceId="space-1" daysAhead={14} />);
    expect(screen.getByText('Next 14 days')).toBeInTheDocument();
  });

  it('renders Total Due label', () => {
    render(<UpcomingBillsWidget spaceId="space-1" />);
    expect(screen.getByText('Total Due')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<UpcomingBillsWidget spaceId="space-1" />);
    expect(screen.getByText('Loading bills...')).toBeInTheDocument();
  });

  it('renders quick stats section', () => {
    render(<UpcomingBillsWidget spaceId="space-1" />);
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });
});
