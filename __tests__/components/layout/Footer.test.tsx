// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/layout/Footer';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

describe('Footer', () => {
  it('renders without crashing', () => {
    const { container } = render(<Footer />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the Rowan brand name', () => {
    render(<Footer />);
    expect(screen.getByText('Rowan')).toBeTruthy();
  });

  it('renders the logo image', () => {
    render(<Footer />);
    const logo = screen.getByAltText('Rowan Logo');
    expect(logo).toBeTruthy();
  });

  it('renders column headings', () => {
    render(<Footer />);
    expect(screen.getByText('Product')).toBeTruthy();
    expect(screen.getByText('Resources')).toBeTruthy();
    expect(screen.getByText('Company')).toBeTruthy();
    expect(screen.getByText('Legal')).toBeTruthy();
  });

  it('renders product links', () => {
    render(<Footer />);
    expect(screen.getByText('Features')).toBeTruthy();
    expect(screen.getByText('Pricing')).toBeTruthy();
    expect(screen.getByText('Mobile App')).toBeTruthy();
  });

  it('renders legal links', () => {
    render(<Footer />);
    expect(screen.getByText('Privacy')).toBeTruthy();
    expect(screen.getByText('Terms')).toBeTruthy();
    expect(screen.getByText('Cookies')).toBeTruthy();
  });

  it('renders copyright text', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeTruthy();
  });

  it('renders "Veteran-Owned Business" label', () => {
    render(<Footer />);
    expect(screen.getByText('Veteran-Owned Business')).toBeTruthy();
  });

  it('renders LinkedIn link', () => {
    render(<Footer />);
    const linkedinLink = screen.getByLabelText('LinkedIn');
    expect(linkedinLink).toBeTruthy();
    expect(linkedinLink.getAttribute('href')).toContain('linkedin.com');
  });

  it('renders GitHub link', () => {
    render(<Footer />);
    const githubLink = screen.getByLabelText('GitHub');
    expect(githubLink).toBeTruthy();
    expect(githubLink.getAttribute('href')).toContain('github.com');
  });

  it('renders company links', () => {
    render(<Footer />);
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText('Security')).toBeTruthy();
  });

  it('renders footer as a footer element', () => {
    render(<Footer />);
    const footer = document.querySelector('footer');
    expect(footer).toBeTruthy();
  });
});
