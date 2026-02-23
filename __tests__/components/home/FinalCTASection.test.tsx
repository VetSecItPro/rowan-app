// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  useReducedMotion: vi.fn(() => false),
}));
vi.mock('@/components/ui/magnetic-button', () => ({
  MagneticButton: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

import { FinalCTASection } from '@/components/home/FinalCTASection';

describe('FinalCTASection', () => {
  it('renders without crashing', () => {
    const { container } = render(<FinalCTASection />);
    expect(container).toBeTruthy();
  });

  it('renders a section element', () => {
    const { container } = render(<FinalCTASection />);
    expect(container.querySelector('section')).toBeTruthy();
  });

  it('renders the CTA link to signup', () => {
    render(<FinalCTASection />);
    const link = document.querySelector('a[href="/signup"]');
    expect(link).toBeTruthy();
  });
});
