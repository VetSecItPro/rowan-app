// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
     
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock('@/components/ui/SmartBackgroundCanvas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/SmartBackgroundCanvas')>();
  return {
    ...actual,
    useTimePeriod: vi.fn(() => 'morning'),
  };
});

import { TimeAwareWelcomeBox, CompactTimeAwareWelcome } from '@/components/ui/TimeAwareWelcomeBox';

describe('TimeAwareWelcomeBox', () => {
  it('renders without crashing', () => {
    render(
      <TimeAwareWelcomeBox
        greetingText="Good morning"
        currentDate="2024-01-15"
      />
    );
    expect(screen.getByText('Good morning')).toBeDefined();
  });

  it('renders greeting text', () => {
    render(
      <TimeAwareWelcomeBox
        greetingText="Good evening"
        currentDate="2024-01-15"
      />
    );
    expect(screen.getByText('Good evening')).toBeDefined();
  });

  it('renders user name when provided', () => {
    render(
      <TimeAwareWelcomeBox
        greetingText="Hello"
        userName="Alice"
        currentDate="2024-01-15"
      />
    );
    expect(screen.getByText(/Alice/i)).toBeDefined();
  });

  it('renders children when provided', () => {
    render(
      <TimeAwareWelcomeBox greetingText="Hello" currentDate="2024-01-15">
        <div>Welcome summary</div>
      </TimeAwareWelcomeBox>
    );
    expect(screen.getByText('Welcome summary')).toBeDefined();
  });

  it('renders background image', () => {
    render(
      <TimeAwareWelcomeBox greetingText="Hello" currentDate="2024-01-15" />
    );
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <TimeAwareWelcomeBox greetingText="Hello" currentDate="2024-01-15" className="custom-box" />
    );
    expect((container.firstChild as HTMLElement).className).toContain('custom-box');
  });
});

describe('CompactTimeAwareWelcome', () => {
  it('renders without crashing', () => {
    render(<CompactTimeAwareWelcome greetingText="Hi there" />);
    expect(screen.getByRole('heading')).toBeDefined();
  });

  it('renders greeting text', () => {
    render(<CompactTimeAwareWelcome greetingText="Good morning" />);
    expect(screen.getByText(/Good morning/)).toBeDefined();
  });

  it('renders with user name', () => {
    render(<CompactTimeAwareWelcome greetingText="Hi" userName="Bob" />);
    expect(screen.getByText(/Bob/)).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CompactTimeAwareWelcome greetingText="Hi" className="compact-class" />
    );
    expect((container.firstChild as HTMLElement).className).toContain('compact-class');
  });
});
