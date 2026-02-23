// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillsList } from '@/components/budget/BillsList';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }),
}));

vi.mock('@/lib/services/bills-service', () => ({
  getBills: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/projects/BillCard', () => ({
  BillCard: ({ bill }: { bill: { name: string } }) => (
    <div data-testid="bill-card">{bill.name}</div>
  ),
}));

const defaultProps = {
  spaceId: 'space-1',
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onMarkPaid: vi.fn(),
  onCreateNew: vi.fn(),
};

describe('BillsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.queryByText('Loading bills...')).not.toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<BillsList {...defaultProps} />);
    expect(screen.getByText('Loading bills...')).toBeInTheDocument();
  });

  it('shows empty state when no bills exist', async () => {
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('No Bills Found')).toBeInTheDocument();
    });
  });

  it('shows Add Your First Bill button in empty state', async () => {
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Add Your First Bill')).toBeInTheDocument();
    });
  });

  it('calls onCreateNew when Add button is clicked', async () => {
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Add Your First Bill')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add Your First Bill'));
    expect(defaultProps.onCreateNew).toHaveBeenCalled();
  });

  it('renders search input', async () => {
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search bills...')).toBeInTheDocument();
    });
  });

  it('renders status filter buttons', async () => {
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('All Bills')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    const { getBills } = await import('@/lib/services/bills-service');
    vi.mocked(getBills).mockRejectedValueOnce(new Error('Network error'));
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Error Loading Bills')).toBeInTheDocument();
    });
  });

  it('shows bills when data is loaded', async () => {
    const { getBills } = await import('@/lib/services/bills-service');
    vi.mocked(getBills).mockResolvedValueOnce([
      {
        id: 'bill-1',
        name: 'Electric Bill',
        amount: 150,
        due_date: '2026-02-28',
        status: 'scheduled',
        space_id: 'space-1',
        is_recurring: true,
        recurrence_interval: 'monthly',
        payee: null,
        category: null,
        created_at: '2026-01-01',
        paid_date: null,
      },
    ]);
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('bill-card')).toBeInTheDocument();
    });
  });

  it('filters bills by status when filter button clicked', async () => {
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('All Bills')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Paid'));
    expect(screen.getByText('No paid bills found.')).toBeInTheDocument();
  });

  it('renders sort buttons', async () => {
    render(<BillsList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  it('shows invalid space error when spaceId is empty', async () => {
    render(<BillsList {...defaultProps} spaceId="" />);
    await waitFor(() => {
      expect(screen.getByText('Error Loading Bills')).toBeInTheDocument();
    });
  });
});
