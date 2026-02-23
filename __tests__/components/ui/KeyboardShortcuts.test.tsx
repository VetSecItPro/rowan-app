// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { KeyboardShortcuts } from '@/components/ui/KeyboardShortcuts';

describe('KeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<KeyboardShortcuts />);
    expect(container).toBeDefined();
  });

  it('does not show dialog by default', () => {
    render(<KeyboardShortcuts />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows dialog when ? key is pressed', () => {
    render(<KeyboardShortcuts />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('shows Keyboard Shortcuts title when open', () => {
    render(<KeyboardShortcuts />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined();
  });

  it('shows General and Navigation shortcut groups', () => {
    render(<KeyboardShortcuts />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByText('General')).toBeDefined();
    expect(screen.getByText('Navigation')).toBeDefined();
  });

  it('closes when Escape is pressed', () => {
    render(<KeyboardShortcuts />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes when close button is clicked', () => {
    render(<KeyboardShortcuts />);
    fireEvent.keyDown(window, { key: '?' });
    fireEvent.click(screen.getByLabelText('Close keyboard shortcuts'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('toggles off when ? is pressed again', () => {
    render(<KeyboardShortcuts />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog')).toBeDefined();
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not open when ? is pressed inside input', () => {
    render(
      <div>
        <KeyboardShortcuts />
        <input data-testid="the-input" />
      </div>
    );
    const input = screen.getByTestId('the-input');
    input.focus();
    fireEvent.keyDown(input, { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
