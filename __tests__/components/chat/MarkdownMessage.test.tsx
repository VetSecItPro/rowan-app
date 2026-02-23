// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="react-markdown">{children}</div>
  ),
}));

vi.mock('remark-gfm', () => ({
  default: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, props as Record<string, unknown>, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import MarkdownMessage from '@/components/chat/MarkdownMessage';

describe('MarkdownMessage', () => {
  it('renders without crashing', () => {
    render(<MarkdownMessage content="Hello world" />);
    expect(screen.getByTestId('react-markdown')).toBeInTheDocument();
  });

  it('renders the content', () => {
    render(<MarkdownMessage content="Test content here" />);
    expect(screen.getByText('Test content here')).toBeInTheDocument();
  });

  it('shows streaming cursor when isStreaming is true', () => {
    const { container } = render(
      <MarkdownMessage content="Loading..." isStreaming={true} />
    );
    // The streaming cursor is a span with animate-pulse
    const cursor = container.querySelector('.animate-pulse');
    expect(cursor).toBeInTheDocument();
  });

  it('does not show streaming cursor when isStreaming is false', () => {
    const { container } = render(
      <MarkdownMessage content="Done" isStreaming={false} />
    );
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('does not show cursor when isStreaming is not provided', () => {
    const { container } = render(<MarkdownMessage content="Static text" />);
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
  });

  it('renders empty content without crashing', () => {
    render(<MarkdownMessage content="" />);
    expect(screen.getByTestId('react-markdown')).toBeInTheDocument();
  });

  it('renders markdown content with special characters', () => {
    render(<MarkdownMessage content="# Heading\n**bold** text" />);
    expect(screen.getByTestId('react-markdown')).toBeInTheDocument();
  });

  it('wraps content in prose-sm div', () => {
    const { container } = render(<MarkdownMessage content="Content" />);
    expect(container.querySelector('.prose-sm')).toBeInTheDocument();
  });
});
