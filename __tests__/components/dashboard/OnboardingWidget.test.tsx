// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('a', { href, onClick }, children),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
       
      const { variants, initial, animate, exit, viewport, ...rest } = props as Record<string, unknown>;
      return React.createElement(tag as string, rest, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import { OnboardingWidget } from '@/components/dashboard/OnboardingWidget';

describe('OnboardingWidget', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders without crashing', () => {
    const { container } = render(<OnboardingWidget />);
    expect(container).toBeTruthy();
  });

  it('shows quick start content when not dismissed', () => {
    render(<OnboardingWidget />);
    expect(screen.getByText('Quick Start')).toBeTruthy();
  });

  it('shows 14-day Pro trial banner', () => {
    render(<OnboardingWidget />);
    expect(screen.getByText(/14-day Pro trial/)).toBeTruthy();
  });

  it('shows onboarding steps', () => {
    render(<OnboardingWidget />);
    expect(screen.getByText('Create your first task')).toBeTruthy();
    expect(screen.getByText('Add a calendar event')).toBeTruthy();
  });

  it('shows dismiss button', () => {
    render(<OnboardingWidget />);
    expect(screen.getByLabelText('Dismiss onboarding')).toBeTruthy();
  });

  it('hides widget after dismiss', () => {
    render(<OnboardingWidget />);
    fireEvent.click(screen.getByLabelText('Dismiss onboarding'));
    expect(screen.queryByText('Quick Start')).toBeNull();
  });

  it('shows progress tracker with step count', () => {
    render(<OnboardingWidget />);
    expect(screen.getByText(/0 of 5 complete/)).toBeTruthy();
  });

  it('shows invite household step', () => {
    render(<OnboardingWidget />);
    expect(screen.getByText('Invite your household')).toBeTruthy();
  });

  it('shows create shopping list step', () => {
    render(<OnboardingWidget />);
    expect(screen.getByText('Create a shopping list')).toBeTruthy();
  });

  it('shows set up chore rotation step', () => {
    render(<OnboardingWidget />);
    expect(screen.getByText('Set up a chore rotation')).toBeTruthy();
  });

  it('marks step as completed on link click', () => {
    render(<OnboardingWidget />);
    const taskLink = screen.getByText('Create your first task').closest('a');
    if (taskLink) {
      fireEvent.click(taskLink);
      // After click, step should be marked completed
      expect(screen.getByText(/1 of 5 complete/)).toBeTruthy();
    }
  });

  it('hides when dismissed flag is in localStorage', () => {
    localStorageMock.setItem('rowan_onboarding_progress', JSON.stringify({ completedSteps: [], dismissed: true }));
    const { container } = render(<OnboardingWidget />);
    // Widget should not render
    expect(container.firstChild).toBeNull();
  });

  it('hides when 3 or more steps completed', () => {
    localStorageMock.setItem('rowan_onboarding_progress', JSON.stringify({
      completedSteps: ['create-task', 'setup-chore', 'add-event'],
      dismissed: false,
    }));
    const { container } = render(<OnboardingWidget />);
    expect(container.firstChild).toBeNull();
  });
});
