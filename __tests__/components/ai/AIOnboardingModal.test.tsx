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

import { AIOnboardingModal } from '@/components/ai/AIOnboardingModal';

describe('AIOnboardingModal', () => {
  it('renders without crashing when open', () => {
    const { container } = render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(
      <AIOnboardingModal isOpen={false} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays intro slide title on first open', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    expect(screen.getByText('Meet Rowan, your AI assistant')).toBeTruthy();
  });

  it('shows Next and Back navigation buttons on first slide', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    expect(screen.getByLabelText('Next slide')).toBeTruthy();
    expect(screen.getByLabelText('Previous slide')).toBeTruthy();
  });

  it('Back button is disabled on first slide', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    const backBtn = screen.getByLabelText('Previous slide');
    expect(backBtn).toHaveProperty('disabled', true);
  });

  it('advances to second slide when Next is clicked', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Next slide'));
    expect(screen.getByText('What Rowan can do')).toBeTruthy();
  });

  it('shows capabilities on second slide', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Next slide'));
    expect(screen.getByText('Create and manage tasks')).toBeTruthy();
  });

  it('advances to third slide and shows Try it now', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Next slide'));
    fireEvent.click(screen.getByLabelText('Next slide'));
    expect(screen.getByText('Try it now')).toBeTruthy();
  });

  it('shows Open Chat button on last slide', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Next slide'));
    fireEvent.click(screen.getByLabelText('Next slide'));
    expect(screen.getByText('Open Chat')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <AIOnboardingModal isOpen={true} onClose={onClose} onOpenChat={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Close onboarding'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChat when Open Chat is clicked on last slide', () => {
    const onOpenChat = vi.fn();
    const onClose = vi.fn();
    render(
      <AIOnboardingModal isOpen={true} onClose={onClose} onOpenChat={onOpenChat} />
    );
    fireEvent.click(screen.getByLabelText('Next slide'));
    fireEvent.click(screen.getByLabelText('Next slide'));
    fireEvent.click(screen.getByText('Open Chat'));
    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('renders 3 dot indicator buttons', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    const dotButtons = screen.getAllByLabelText(/Go to slide/);
    expect(dotButtons).toHaveLength(3);
  });

  it('navigates to slide when dot is clicked', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Go to slide 2'));
    expect(screen.getByText('What Rowan can do')).toBeTruthy();
  });

  it('can navigate back after going forward', () => {
    render(
      <AIOnboardingModal isOpen={true} onClose={vi.fn()} onOpenChat={vi.fn()} />
    );
    fireEvent.click(screen.getByLabelText('Next slide'));
    fireEvent.click(screen.getByLabelText('Previous slide'));
    expect(screen.getByText('Meet Rowan, your AI assistant')).toBeTruthy();
  });
});
