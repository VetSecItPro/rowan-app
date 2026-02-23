// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

vi.mock('@/components/chat/MarkdownMessage', () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="briefing-markdown">{content}</div>
  ),
}));

import MorningBriefing from '@/components/chat/MorningBriefing';

const sampleBriefing = {
  greeting: 'Good morning!',
  briefingText: 'You have 3 tasks due today.',
  highlights: ['3 tasks due', '1 event today', 'Budget on track'],
  generatedAt: new Date().toISOString(),
};

describe('MorningBriefing', () => {
  const onAskRowan = vi.fn();
  const onDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('Good morning!')).toBeInTheDocument();
  });

  it('renders the greeting', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('Good morning!')).toBeInTheDocument();
  });

  it('renders Morning Briefing label', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('Morning Briefing')).toBeInTheDocument();
  });

  it('renders briefing text through MarkdownMessage', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByTestId('briefing-markdown')).toHaveTextContent('You have 3 tasks due today.');
  });

  it('renders highlight pills', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('3 tasks due')).toBeInTheDocument();
    expect(screen.getByText('1 event today')).toBeInTheDocument();
    expect(screen.getByText('Budget on track')).toBeInTheDocument();
  });

  it('renders Ask Rowan button', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('Ask Rowan')).toBeInTheDocument();
  });

  it('renders Dismiss button', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    // There are two dismiss triggers: the X button and the Dismiss text button
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button clicked', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onAskRowan when Ask Rowan button clicked', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByText('Ask Rowan'));
    expect(onAskRowan).toHaveBeenCalledWith('Tell me more about my day');
  });

  it('calls onDismiss when X button clicked', () => {
    render(
      <MorningBriefing
        briefing={sampleBriefing}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByLabelText('Dismiss briefing'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders with empty highlights array', () => {
    render(
      <MorningBriefing
        briefing={{ ...sampleBriefing, highlights: [] }}
        onAskRowan={onAskRowan}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('Good morning!')).toBeInTheDocument();
  });
});
