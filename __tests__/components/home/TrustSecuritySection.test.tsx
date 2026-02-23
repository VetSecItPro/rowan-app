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

import { TrustSecuritySection } from '@/components/home/TrustSecuritySection';

describe('TrustSecuritySection', () => {
  it('renders without crashing', () => {
    const { container } = render(<TrustSecuritySection />);
    expect(container).toBeTruthy();
  });

  it('renders the main heading', () => {
    render(<TrustSecuritySection />);
    expect(screen.getByText(/Your family.s data stays/i)).toBeTruthy();
  });

  it('renders all trust point titles', () => {
    render(<TrustSecuritySection />);
    expect(screen.getByText('Encrypted at rest & in transit')).toBeTruthy();
    expect(screen.getByText('We never sell your data')).toBeTruthy();
    expect(screen.getByText('Privacy-first architecture')).toBeTruthy();
    expect(screen.getByText('Your data is portable')).toBeTruthy();
  });

  it('renders the security practices link', () => {
    render(<TrustSecuritySection />);
    expect(screen.getByText(/Learn more about our security practices/i)).toBeTruthy();
  });

  it('renders a section element', () => {
    const { container } = render(<TrustSecuritySection />);
    expect(container.querySelector('section')).toBeTruthy();
  });
});
