// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/navigation/Footer';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('Footer', () => {
  it('renders without crashing', () => {
    const { container } = render(<Footer />);
    expect(container).toBeTruthy();
  });

  it('renders Rowan brand name', () => {
    render(<Footer />);
    expect(screen.getByText('Rowan')).toBeTruthy();
  });

  it('renders copyright year', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeTruthy();
  });

  it('renders Veteran Owned Business text', () => {
    render(<Footer />);
    expect(screen.getByText('Veteran Owned Business')).toBeTruthy();
  });

  it('renders Legal link', () => {
    render(<Footer />);
    expect(screen.getByText('Legal')).toBeTruthy();
  });

  it('renders footer element', () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('footer')).toBeTruthy();
  });
});
