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

import ReactionPicker from '@/components/comments/ReactionPicker';

describe('ReactionPicker', () => {
  const onSelect = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByText('Pick a reaction')).toBeInTheDocument();
  });

  it('renders emoji buttons', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    const reactionButtons = screen.getAllByRole('button', { name: /React with/ });
    expect(reactionButtons.length).toBeGreaterThan(0);
  });

  it('renders exactly 16 common reaction buttons', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    const reactionButtons = screen.getAllByRole('button', { name: /React with/ });
    expect(reactionButtons).toHaveLength(16);
  });

  it('renders the close button', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByLabelText('Close reaction picker')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close reaction picker'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with emoji when emoji button is clicked', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    const thumbsUpButton = screen.getByLabelText('React with 👍');
    fireEvent.click(thumbsUpButton);
    expect(onSelect).toHaveBeenCalledWith('👍');
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside', () => {
    render(
      <div>
        <ReactionPicker onSelect={onSelect} onClose={onClose} />
        <div data-testid="outside">Outside</div>
      </div>
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the thumbs up emoji', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByLabelText('React with 👍')).toBeInTheDocument();
  });

  it('renders the heart emoji', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByLabelText('React with ❤️')).toBeInTheDocument();
  });

  it('renders fire emoji', () => {
    render(<ReactionPicker onSelect={onSelect} onClose={onClose} />);
    expect(screen.getByLabelText('React with 🔥')).toBeInTheDocument();
  });
});
