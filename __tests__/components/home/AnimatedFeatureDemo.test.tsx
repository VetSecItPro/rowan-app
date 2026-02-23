// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MotionConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useInView: vi.fn(() => true),
  useReducedMotion: vi.fn(() => false),
}));

import { AnimatedFeatureDemo } from '@/components/home/AnimatedFeatureDemo';

const mockSteps = [
  { label: 'Step 1', content: <div>Step 1 content</div>, duration: 3000 },
  { label: 'Step 2', content: <div>Step 2 content</div>, duration: 3000 },
];

describe('AnimatedFeatureDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <AnimatedFeatureDemo
        featureName="Tasks"
        colorScheme={{ primary: 'blue', secondary: 'cyan', gradient: 'from-blue-500 to-cyan-500' }}
        steps={mockSteps}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders step content', () => {
    render(
      <AnimatedFeatureDemo
        featureName="Tasks"
        colorScheme={{ primary: 'blue', secondary: 'cyan', gradient: 'from-blue-500 to-cyan-500' }}
        steps={mockSteps}
      />
    );
    expect(screen.getByText('Step 1 content')).toBeTruthy();
  });

  it('renders navigation buttons for each step', () => {
    render(
      <AnimatedFeatureDemo
        featureName="Tasks"
        colorScheme={{ primary: 'blue', secondary: 'cyan', gradient: 'from-blue-500 to-cyan-500' }}
        steps={mockSteps}
      />
    );
    // Each step has a navigation dot button with aria-label "Go to step N: Label"
    expect(screen.getByRole('button', { name: /Go to step 1: Step 1/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Go to step 2: Step 2/i })).toBeTruthy();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <AnimatedFeatureDemo
        featureName="Tasks"
        colorScheme={{ primary: 'blue', secondary: 'cyan', gradient: 'from-blue-500 to-cyan-500' }}
        steps={mockSteps}
        className="custom-class"
      />
    );
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
