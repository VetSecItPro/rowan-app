// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  useReducedMotion: vi.fn(() => false),
}));
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="remotion-player" />,
}));
vi.mock('@/remotion/compositions/OrganizeShowcase', () => ({ OrganizeShowcase: () => null }));
vi.mock('@/remotion/compositions/CoordinateShowcase', () => ({ CoordinateShowcase: () => null }));
vi.mock('@/remotion/compositions/GrowShowcase', () => ({ GrowShowcase: () => null }));

import { FeatureShowcase } from '@/components/home/FeatureShowcase';

describe('FeatureShowcase', () => {
  it('renders without crashing', () => {
    const { container } = render(<FeatureShowcase />);
    expect(container).toBeTruthy();
  });

  it('renders a section container', () => {
    const { container } = render(<FeatureShowcase />);
    expect(container.firstChild).toBeTruthy();
  });
});
