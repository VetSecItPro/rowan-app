// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  useInView: vi.fn(() => true),
  useReducedMotion: vi.fn(() => false),
}));

import { HowItWorksSection } from '@/components/home/HowItWorksSection';

describe('HowItWorksSection', () => {
  it('renders without crashing', () => {
    const { container } = render(<HowItWorksSection />);
    expect(container).toBeTruthy();
  });

  it('renders the step titles', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('Create Your Space')).toBeTruthy();
    expect(screen.getByText('Invite Your People')).toBeTruthy();
    expect(screen.getByText('Manage Everything Together')).toBeTruthy();
  });

  it('renders step numbers', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
