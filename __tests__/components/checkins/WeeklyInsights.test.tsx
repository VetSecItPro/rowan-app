// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, props as Record<string, unknown>, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetWeeklySummary = vi.fn(() => ({
  weekStart: new Date('2026-02-16'),
  weekEnd: new Date('2026-02-22'),
  averageScore: 3.5,
  dominantMood: 'good',
  moodDistribution: {
    great: 2,
    good: 3,
    okay: 1,
    meh: 0,
    rough: 0,
  },
  insights: [],
}));

const mockDetectPatterns = vi.fn(() => []);

vi.mock('@/lib/analytics/mood-insights', () => ({
  moodInsightsService: {
    getWeeklySummary: (...args: unknown[]) => mockGetWeeklySummary(...args),
    detectPatterns: (...args: unknown[]) => mockDetectPatterns(...args),
  },
}));

vi.mock('date-fns', async () => {
  const actual = await vi.importActual<typeof import('date-fns')>('date-fns');
  return {
    ...actual,
    format: vi.fn((date: Date, pattern: string) => {
      if (pattern === 'MMM d') return 'Feb 16';
      if (pattern === 'MMM d, yyyy') return 'Feb 22, 2026';
      return actual.format(date, pattern);
    }),
  };
});

import { WeeklyInsights } from '@/components/checkins/WeeklyInsights';

const sampleCheckIns = [
  {
    id: 'ci-1',
    space_id: 'space-1',
    user_id: 'user-1',
    mood: 'great' as const,
    mood_score: 5,
    notes: '',
    check_in_date: '2026-02-17',
    created_at: '2026-02-17T08:00:00Z',
    updated_at: '2026-02-17T08:00:00Z',
    streak: 3,
  },
  {
    id: 'ci-2',
    space_id: 'space-1',
    user_id: 'user-1',
    mood: 'good' as const,
    mood_score: 4,
    notes: '',
    check_in_date: '2026-02-18',
    created_at: '2026-02-18T08:00:00Z',
    updated_at: '2026-02-18T08:00:00Z',
    streak: 4,
  },
];

describe('WeeklyInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWeeklySummary.mockReturnValue({
      weekStart: new Date('2026-02-16'),
      weekEnd: new Date('2026-02-22'),
      averageScore: 3.5,
      dominantMood: 'good',
      moodDistribution: {
        great: 2,
        good: 3,
        okay: 1,
        meh: 0,
        rough: 0,
      },
      insights: [],
    });
    mockDetectPatterns.mockReturnValue([]);
  });

  it('renders without crashing with check-ins', () => {
    render(<WeeklyInsights checkIns={sampleCheckIns} />);
    expect(screen.getByText('Weekly Insights')).toBeInTheDocument();
  });

  it('renders empty state when no check-ins', () => {
    mockGetWeeklySummary.mockReturnValueOnce({
      weekStart: new Date('2026-02-16'),
      weekEnd: new Date('2026-02-22'),
      averageScore: 0,
      dominantMood: null,
      moodDistribution: { great: 0, good: 0, okay: 0, meh: 0, rough: 0 },
      insights: [],
    });

    render(<WeeklyInsights checkIns={[]} />);
    expect(screen.getByText('No check-ins this week yet')).toBeInTheDocument();
  });

  it('renders average score', () => {
    render(<WeeklyInsights checkIns={sampleCheckIns} />);
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('renders mood distribution section', () => {
    render(<WeeklyInsights checkIns={sampleCheckIns} />);
    expect(screen.getByText('Mood Distribution')).toBeInTheDocument();
  });

  it('renders dominant mood label', () => {
    render(<WeeklyInsights checkIns={sampleCheckIns} />);
    // The dominant mood renders as "Most common mood: good"
    expect(screen.getByText('Most common mood:')).toBeInTheDocument();
  });

  it('renders date range', () => {
    render(<WeeklyInsights checkIns={sampleCheckIns} />);
    expect(screen.getByText('Feb 16 - Feb 22, 2026')).toBeInTheDocument();
  });

  it('renders check-in count in footer', () => {
    render(<WeeklyInsights checkIns={sampleCheckIns} />);
    // Total = 2+3+1 = 6 from moodDistribution
    expect(screen.getByText(/6 check-ins this week/)).toBeInTheDocument();
  });

  it('renders AI Insights when insights exist', () => {
    mockGetWeeklySummary.mockReturnValueOnce({
      weekStart: new Date('2026-02-16'),
      weekEnd: new Date('2026-02-22'),
      averageScore: 3.5,
      dominantMood: 'good',
      moodDistribution: { great: 2, good: 3, okay: 1, meh: 0, rough: 0 },
      insights: [
        {
          type: 'trend',
          title: 'Mood improving',
          description: 'Your mood has been trending upward',
          severity: 'positive',
          confidence: 85,
        },
      ],
    });

    render(<WeeklyInsights checkIns={sampleCheckIns} />);
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(screen.getByText('Mood improving')).toBeInTheDocument();
  });

  it('renders detected patterns when patterns exist', () => {
    mockDetectPatterns.mockReturnValueOnce([
      { description: 'You feel better on weekdays', confidence: 75 },
    ]);

    render(<WeeklyInsights checkIns={sampleCheckIns} />);
    expect(screen.getByText('Detected Patterns')).toBeInTheDocument();
    expect(screen.getByText('You feel better on weekdays')).toBeInTheDocument();
  });
});
