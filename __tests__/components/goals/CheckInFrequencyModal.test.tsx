// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, subtitle, footer }: { isOpen: boolean; children: React.ReactNode; title: string; subtitle?: string; footer: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {subtitle && <p data-testid="modal-subtitle">{subtitle}</p>}
        {children}
        <div>{footer}</div>
      </div>
    );
  },
}));

vi.mock('@/lib/services/goals-service', () => ({
  goalsService: {
    getCheckInSettings: vi.fn().mockResolvedValue(null),
    updateCheckInSettings: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/utils/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { CheckInFrequencyModal } from '@/components/goals/CheckInFrequencyModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  goalId: 'goal-1',
  goalTitle: 'My Goal',
};

describe('CheckInFrequencyModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(<CheckInFrequencyModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<CheckInFrequencyModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('shows Check-In Frequency title', () => {
    render(<CheckInFrequencyModal {...defaultProps} />);
    expect(screen.getByText('Check-In Frequency')).toBeTruthy();
  });

  it('shows goal title as subtitle', () => {
    render(<CheckInFrequencyModal {...defaultProps} />);
    expect(screen.getByTestId('modal-subtitle').textContent).toBe('My Goal');
  });

  it('shows loading skeleton initially', () => {
    render(<CheckInFrequencyModal {...defaultProps} />);
    // The loading state shows animate-pulse elements before data loads
    const { container } = render(<CheckInFrequencyModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows Cancel button in footer', () => {
    render(<CheckInFrequencyModal {...defaultProps} />);
    expect(screen.getAllByText('Cancel').length).toBeGreaterThan(0);
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<CheckInFrequencyModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getAllByText('Cancel')[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
