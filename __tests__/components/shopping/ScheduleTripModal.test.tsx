// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode }) =>
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
        {footer}
      </div>
    ) : null,
}));

import { ScheduleTripModal } from '@/components/shopping/ScheduleTripModal';

const mockList = {
  id: 'list-1',
  title: 'Costco Run',
  store_name: 'Costco',
  status: 'active' as const,
  space_id: 'space-1',
  created_at: '2026-01-01',
};

describe('ScheduleTripModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSchedule: vi.fn().mockResolvedValue(undefined),
    list: mockList,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    const { container } = render(<ScheduleTripModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<ScheduleTripModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Schedule Shopping Trip title', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText('Schedule Shopping Trip')).toBeTruthy();
  });

  it('pre-fills event title with list title', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    const titleInput = screen.getByPlaceholderText('Shopping Trip') as HTMLInputElement;
    expect(titleInput.value).toBe('Shopping Trip: Costco Run');
  });

  it('shows Event Title label', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText('Event Title')).toBeTruthy();
  });

  it('shows Date label', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText('Date')).toBeTruthy();
  });

  it('shows Time label', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText('Time')).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Schedule Trip button', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText('Schedule Trip')).toBeTruthy();
  });

  it('Schedule Trip button is disabled when date is empty', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    const submitBtn = screen.getByText('Schedule Trip').closest('button')!;
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ScheduleTripModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows duration select with options', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText('30 minutes')).toBeTruthy();
    expect(screen.getByText('1 hour')).toBeTruthy();
  });

  it('shows reminder options', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText('No reminder')).toBeTruthy();
    expect(screen.getByText('15 minutes before')).toBeTruthy();
  });

  it('shows shopping list info text', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText(/Costco Run/)).toBeTruthy();
  });

  it('mentions the store name in info text', () => {
    render(<ScheduleTripModal {...defaultProps} />);
    expect(screen.getByText(/at Costco/)).toBeTruthy();
  });
});
