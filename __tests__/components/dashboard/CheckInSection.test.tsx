// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
       
      const { variants, initial, animate, ...rest } = props as Record<string, unknown>;
      return React.createElement(tag as string, rest, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ default: React.ComponentType }>, opts?: { loading?: () => React.ReactNode }) => {
    if (opts?.loading) return opts.loading;
    // Return a placeholder component
    return () => React.createElement('div', { 'data-testid': 'dynamic-component' });
  },
}));

vi.mock('@/lib/hooks/useCheckIn', () => ({
  useCheckIn: vi.fn(() => ({
    viewMode: 'checkin',
    setViewMode: vi.fn(),
    journalView: 'calendar',
    setJournalView: vi.fn(),
    selectedMood: null,
    setSelectedMood: vi.fn(),
    handleMoodSelect: vi.fn(),
    checkInExpanded: false,
    setCheckInExpanded: vi.fn(),
    checkInEnergy: null,
    setCheckInEnergy: vi.fn(),
    checkInHighlights: '',
    setCheckInHighlights: vi.fn(),
    checkInGratitude: '',
    setCheckInGratitude: vi.fn(),
    checkInChallenges: '',
    setCheckInChallenges: vi.fn(),
    checkInNote: '',
    setCheckInNote: vi.fn(),
    checkInSaving: false,
    handleCheckIn: vi.fn(),
    checkInStats: null,
    recentCheckIns: [],
    moodOptions: [
      { emoji: '😊', label: 'Great', value: 'great' },
      { emoji: '😊', label: 'Good', value: 'good' },
      { emoji: '😐', label: 'Okay', value: 'okay' },
      { emoji: '😕', label: 'Meh', value: 'meh' },
      { emoji: '😢', label: 'Rough', value: 'rough' },
    ],
    checkInReactions: {},
    partnerReactionLoading: false,
    handleSendReaction: vi.fn(),
    showCheckInSuccess: false,
    setShowCheckInSuccess: vi.fn(),
    lastCheckInMood: null,
    calendarMonth: new Date(),
    setCalendarMonth: vi.fn(),
  })),
}));

vi.mock('@/components/shared/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatDate: vi.fn((date: string) => date),
  formatTimestamp: vi.fn((ts: string) => ts),
  getCurrentDateString: vi.fn(() => '2026-02-22'),
}));

import { CheckInSection } from '@/components/dashboard/CheckInSection';

describe('CheckInSection', () => {
  it('renders without crashing', () => {
    const { container } = render(<CheckInSection userId="user-1" spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('shows Daily Check-In heading', () => {
    render(<CheckInSection userId="user-1" spaceId="space-1" />);
    expect(screen.getByText('Daily Check-In')).toBeTruthy();
  });

  it('shows Household Balance section', () => {
    render(<CheckInSection userId="user-1" spaceId="space-1" />);
    expect(screen.getByText('Household Balance')).toBeTruthy();
  });

  it('shows Check In mode toggle', () => {
    render(<CheckInSection userId="user-1" spaceId="space-1" />);
    expect(screen.getByText('Check In')).toBeTruthy();
  });

  it('shows Journal mode toggle', () => {
    render(<CheckInSection userId="user-1" spaceId="space-1" />);
    expect(screen.getByText('Journal')).toBeTruthy();
  });

  it('renders mood emoji buttons', () => {
    render(<CheckInSection userId="user-1" spaceId="space-1" />);
    // Should render 5 mood options
    expect(screen.getByTitle('Great')).toBeTruthy();
  });
});
