// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresenceIndicator } from '@/components/presence/PresenceIndicator';

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('PresenceIndicator', () => {
  it('renders without crashing for online status', () => {
    const { container } = render(<PresenceIndicator status="online" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders without crashing for offline status', () => {
    const { container } = render(<PresenceIndicator status="offline" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders green dot for online status', () => {
    const { container } = render(<PresenceIndicator status="online" />);
    const dot = container.querySelector('[class*="bg-green-500"]');
    expect(dot).toBeTruthy();
  });

  it('renders gray dot for offline status', () => {
    const { container } = render(<PresenceIndicator status="offline" />);
    const dot = container.querySelector('[class*="bg-gray-600"]');
    expect(dot).toBeTruthy();
  });

  it('shows Online label when showLabel=true and status is online', () => {
    render(<PresenceIndicator status="online" showLabel={true} />);
    expect(screen.getByText('Online')).toBeTruthy();
  });

  it('shows Offline label when showLabel=true and status is offline', () => {
    render(<PresenceIndicator status="offline" showLabel={true} />);
    expect(screen.getByText('Offline')).toBeTruthy();
  });

  it('does not show label when showLabel is not set', () => {
    render(<PresenceIndicator status="online" />);
    expect(screen.queryByText('Online')).toBeNull();
  });

  it('applies sm size class', () => {
    const { container } = render(<PresenceIndicator status="online" size="sm" />);
    const dot = container.querySelector('[class*="w-2"]');
    expect(dot).toBeTruthy();
  });

  it('applies lg size class', () => {
    const { container } = render(<PresenceIndicator status="online" size="lg" />);
    const dot = container.querySelector('[class*="w-4"]');
    expect(dot).toBeTruthy();
  });
});
