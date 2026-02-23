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

import SuggestionCards from '@/components/chat/SuggestionCards';
import type { AISuggestion } from '@/lib/services/ai/suggestion-service';

const sampleSuggestions: AISuggestion[] = [
  {
    id: 'sug-1',
    title: 'You have overdue tasks',
    description: '3 tasks are past their due date',
    feature: 'tasks',
    priority: 'high',
    actionMessage: 'Show me my overdue tasks',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sug-2',
    title: 'Meal planning reminder',
    description: 'Plan your meals for the week',
    feature: 'meals',
    priority: 'medium',
    actionMessage: 'Help me plan this week\'s meals',
    createdAt: new Date().toISOString(),
  },
];

describe('SuggestionCards', () => {
  const onAction = vi.fn();
  const onDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <SuggestionCards
        suggestions={sampleSuggestions}
        onAction={onAction}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('You have overdue tasks')).toBeInTheDocument();
  });

  it('renders nothing when suggestions array is empty', () => {
    const { container } = render(
      <SuggestionCards suggestions={[]} onAction={onAction} onDismiss={onDismiss} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all suggestion cards', () => {
    render(
      <SuggestionCards
        suggestions={sampleSuggestions}
        onAction={onAction}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('You have overdue tasks')).toBeInTheDocument();
    expect(screen.getByText('Meal planning reminder')).toBeInTheDocument();
  });

  it('renders suggestion descriptions', () => {
    render(
      <SuggestionCards
        suggestions={sampleSuggestions}
        onAction={onAction}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('3 tasks are past their due date')).toBeInTheDocument();
  });

  it('renders priority labels', () => {
    render(
      <SuggestionCards
        suggestions={sampleSuggestions}
        onAction={onAction}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Suggested')).toBeInTheDocument();
  });

  it('calls onAction when Ask Rowan is clicked', () => {
    render(
      <SuggestionCards
        suggestions={[sampleSuggestions[0]]}
        onAction={onAction}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByText('Ask Rowan'));
    expect(onAction).toHaveBeenCalledWith('Show me my overdue tasks');
  });

  it('calls onDismiss when dismiss button clicked', () => {
    render(
      <SuggestionCards
        suggestions={[sampleSuggestions[0]]}
        onAction={onAction}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByLabelText('Dismiss suggestion'));
    expect(onDismiss).toHaveBeenCalledWith('sug-1');
  });

  it('renders low priority with Tip label', () => {
    const lowPrioritySuggestion: AISuggestion = {
      ...sampleSuggestions[0],
      id: 'sug-3',
      priority: 'low',
    };
    render(
      <SuggestionCards
        suggestions={[lowPrioritySuggestion]}
        onAction={onAction}
        onDismiss={onDismiss}
      />
    );
    expect(screen.getByText('Tip')).toBeInTheDocument();
  });
});
