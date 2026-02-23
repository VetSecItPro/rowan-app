// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) =>
      ({ children, ...props }: { children?: React.ReactNode }) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AIWelcomeModal } from '@/components/ai/AIWelcomeModal';

describe('AIWelcomeModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(
      <AIWelcomeModal isOpen={false} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays Meet Rowan AI heading', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    expect(screen.getByText('Meet Rowan AI')).toBeTruthy();
  });

  it('displays "Your personal household assistant" subtitle', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    expect(screen.getByText('Your personal household assistant')).toBeTruthy();
  });

  it('shows first capability: Ask Anything', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    expect(screen.getByText('Ask Anything')).toBeTruthy();
  });

  it('shows Next button on first step', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    expect(screen.getByText('Next')).toBeTruthy();
  });

  it('shows Skip button', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    expect(screen.getByText('Skip')).toBeTruthy();
  });

  it('calls onClose when Skip is clicked', () => {
    const onClose = vi.fn();
    render(
      <AIWelcomeModal isOpen={true} onClose={onClose} onTryIt={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Skip'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('advances to second capability on Next click', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Manage Your Schedule')).toBeTruthy();
  });

  it('advances to third capability and shows Try It Now', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Try It Now')).toBeTruthy();
  });

  it('calls onTryIt when Try It Now is clicked on last step', () => {
    const onTryIt = vi.fn();
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={onTryIt} />
    );
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Try It Now'));
    expect(onTryIt).toHaveBeenCalledTimes(1);
  });

  it('renders 3 step indicator dots', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    const stepDots = screen.getAllByLabelText(/Step/);
    expect(stepDots).toHaveLength(3);
  });

  it('navigates to step when dot is clicked', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Step 2'));
    expect(screen.getByText('Manage Your Schedule')).toBeTruthy();
  });

  it('renders privacy notice', () => {
    render(
      <AIWelcomeModal isOpen={true} onClose={vi.fn()} onTryIt={vi.fn()} />
    );
    expect(screen.getByText(/Rowan AI uses Google Gemini/)).toBeTruthy();
  });

  it('calls onClose when X close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <AIWelcomeModal isOpen={true} onClose={onClose} onTryIt={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
