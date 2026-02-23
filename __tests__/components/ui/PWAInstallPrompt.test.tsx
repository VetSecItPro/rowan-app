// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
     
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock localStorage to control visibility
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(() => ({ matches: false })),
});

import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt';

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders without crashing', () => {
    localStorageMock.getItem.mockReturnValue(null);
    expect(() => render(<PWAInstallPrompt />)).not.toThrow();
  });

  it('does not crash when already dismissed recently', () => {
    // Simulate dismissed 1 minute ago
    localStorageMock.getItem.mockReturnValue(String(Date.now() - 60000));
    expect(() => render(<PWAInstallPrompt />)).not.toThrow();
  });
});
