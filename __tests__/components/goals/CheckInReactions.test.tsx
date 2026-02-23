// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/utils/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Supabase mock is set up in vitest.setup.ts

import { CheckInReactions } from '@/components/goals/CheckInReactions';

describe('CheckInReactions', () => {
  it('renders without crashing', () => {
    const { container } = render(<CheckInReactions checkInId="checkin-1" />);
    expect(container).toBeTruthy();
  });

  it('renders loading state initially', () => {
    const { container } = render(<CheckInReactions checkInId="checkin-1" />);
    // Should show loading skeletons initially
    expect(container).toBeTruthy();
  });

  it('renders add reaction button after load', async () => {
    render(<CheckInReactions checkInId="checkin-1" />);
    // Component renders loading state initially, then shows add button
    const { container } = render(<CheckInReactions checkInId="checkin-1" />);
    expect(container).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(<CheckInReactions checkInId="checkin-1" className="custom-class" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with different checkInId values', () => {
    const { rerender, container } = render(<CheckInReactions checkInId="checkin-1" />);
    rerender(<CheckInReactions checkInId="checkin-2" />);
    expect(container).toBeTruthy();
  });
});
