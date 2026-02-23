// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: vi.fn(() => false),
}));

import { FAQSection } from '@/components/home/FAQSection';

describe('FAQSection', () => {
  it('renders without crashing', () => {
    const { container } = render(<FAQSection />);
    expect(container).toBeTruthy();
  });

  it('renders FAQ questions', () => {
    render(<FAQSection />);
    expect(screen.getByText("Is my family's data safe?")).toBeTruthy();
  });

  it('renders multiple FAQ items', () => {
    render(<FAQSection />);
    expect(screen.getByText('How many family members can I add?')).toBeTruthy();
  });

  it('expands an answer when question is clicked', () => {
    render(<FAQSection />);
    const firstQuestion = screen.getByText("Is my family's data safe?");
    fireEvent.click(firstQuestion.closest('button') || firstQuestion);
    expect(screen.getByText(/industry-standard encryption/i)).toBeTruthy();
  });
});
