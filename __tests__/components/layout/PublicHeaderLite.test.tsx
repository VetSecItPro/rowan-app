// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PublicHeaderLite } from '@/components/layout/PublicHeaderLite';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

describe('PublicHeaderLite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<PublicHeaderLite />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the Rowan brand name', () => {
    render(<PublicHeaderLite />);
    expect(screen.getByText('Rowan')).toBeTruthy();
  });

  it('renders the logo image', () => {
    render(<PublicHeaderLite />);
    expect(screen.getByAltText('Rowan Logo')).toBeTruthy();
  });

  it('renders navigation links', () => {
    render(<PublicHeaderLite />);
    expect(screen.getAllByText('Features').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pricing').length).toBeGreaterThan(0);
  });

  it('renders Login link', () => {
    render(<PublicHeaderLite />);
    const loginLinks = screen.getAllByText('Login');
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  it('renders Sign Up link', () => {
    render(<PublicHeaderLite />);
    const signUpLinks = screen.getAllByText('Sign Up');
    expect(signUpLinks.length).toBeGreaterThan(0);
  });

  it('renders mobile menu toggle button', () => {
    render(<PublicHeaderLite />);
    const menuButton = screen.getByLabelText('Open menu');
    expect(menuButton).toBeTruthy();
  });

  it('opens mobile menu on toggle click', () => {
    render(<PublicHeaderLite />);
    const menuButton = screen.getByLabelText('Open menu');
    fireEvent.click(menuButton);
    expect(screen.getByLabelText('Close menu')).toBeTruthy();
  });

  it('closes mobile menu when a link is clicked', () => {
    render(<PublicHeaderLite />);
    fireEvent.click(screen.getByLabelText('Open menu'));
    // Mobile menu should be visible (find all Login links)
    const loginLinks = screen.getAllByText('Login');
    fireEvent.click(loginLinks[loginLinks.length - 1]);
    expect(screen.getByLabelText('Open menu')).toBeTruthy();
  });

  it('renders as animated when animated prop is true', () => {
    const { container } = render(<PublicHeaderLite animated />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders header element', () => {
    render(<PublicHeaderLite />);
    const header = document.querySelector('header');
    expect(header).toBeTruthy();
  });
});
