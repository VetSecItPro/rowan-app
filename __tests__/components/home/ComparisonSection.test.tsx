// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  useReducedMotion: vi.fn(() => false),
}));

import { ComparisonSection } from '@/components/home/ComparisonSection';

describe('ComparisonSection', () => {
  it('renders without crashing', () => {
    const { container } = render(<ComparisonSection />);
    expect(container).toBeTruthy();
  });

  it('renders a section element', () => {
    const { container } = render(<ComparisonSection />);
    expect(container.firstChild).toBeTruthy();
  });
});
