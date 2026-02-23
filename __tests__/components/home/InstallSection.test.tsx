// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: vi.fn(() => false),
}));

import { InstallSection } from '@/components/home/InstallSection';

describe('InstallSection', () => {
  it('renders without crashing', () => {
    const { container } = render(<InstallSection onSignupClick={vi.fn()} />);
    expect(container).toBeTruthy();
  });

  it('renders the main heading', () => {
    render(<InstallSection onSignupClick={vi.fn()} />);
    expect(screen.getByText(/Ready to simplify your household/i)).toBeTruthy();
  });

  it('renders the Get Started Free button', () => {
    render(<InstallSection onSignupClick={vi.fn()} />);
    expect(screen.getByText('Get Started Free')).toBeTruthy();
  });

  it('calls onSignupClick when button is clicked', () => {
    const onSignupClick = vi.fn();
    render(<InstallSection onSignupClick={onSignupClick} />);
    fireEvent.click(screen.getByText('Get Started Free'));
    expect(onSignupClick).toHaveBeenCalledTimes(1);
  });

  it('renders device labels', () => {
    render(<InstallSection onSignupClick={vi.fn()} />);
    expect(screen.getByText('Phone')).toBeTruthy();
    expect(screen.getByText('Tablet')).toBeTruthy();
    expect(screen.getByText('Desktop')).toBeTruthy();
  });

  it('renders the install accordion button', () => {
    render(<InstallSection onSignupClick={vi.fn()} />);
    expect(screen.getByText('Install as an app on your device')).toBeTruthy();
  });

  it('toggles accordion open and shows install instructions', () => {
    render(<InstallSection onSignupClick={vi.fn()} />);
    const accordionBtn = screen.getByRole('button', { name: /Install as an app/i });
    fireEvent.click(accordionBtn);
    expect(screen.getByText('iPhone / iPad')).toBeTruthy();
    expect(screen.getByText('Android')).toBeTruthy();
  });

  it('renders the no credit card notice', () => {
    render(<InstallSection onSignupClick={vi.fn()} />);
    expect(screen.getByText(/No credit card required/i)).toBeTruthy();
  });
});
