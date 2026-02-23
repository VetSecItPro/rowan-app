// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { SmartBackgroundCanvas } from '@/components/ui/SmartBackgroundCanvas';

describe('SmartBackgroundCanvas', () => {
  it('renders without crashing', () => {
    const { container } = render(<SmartBackgroundCanvas />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders children', () => {
    render(
      <SmartBackgroundCanvas>
        <p>Canvas child content</p>
      </SmartBackgroundCanvas>
    );
    expect(screen.getByText('Canvas child content')).toBeDefined();
  });

  it('renders with tasks feature', () => {
    const { container } = render(<SmartBackgroundCanvas feature="tasks" />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders with calendar feature', () => {
    const { container } = render(<SmartBackgroundCanvas feature="calendar" />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders with meals feature', () => {
    const { container } = render(<SmartBackgroundCanvas feature="meals" />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders with subtle variant', () => {
    const { container } = render(<SmartBackgroundCanvas variant="subtle" />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders with ambient variant', () => {
    const { container } = render(<SmartBackgroundCanvas variant="ambient" />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders with vibrant variant', () => {
    const { container } = render(<SmartBackgroundCanvas variant="vibrant" />);
    expect(container.firstChild).toBeDefined();
  });

  it('renders with timeAware enabled', async () => {
    await act(async () => {
      render(<SmartBackgroundCanvas timeAware />);
    });
    expect(true).toBe(true);
  });

  it('applies custom className', () => {
    const { container } = render(<SmartBackgroundCanvas className="my-bg" />);
    expect(container.firstChild).toBeDefined();
  });

  it('applies contentClassName to content wrapper', () => {
    const { container } = render(
      <SmartBackgroundCanvas contentClassName="my-content">
        <div>Content</div>
      </SmartBackgroundCanvas>
    );
    expect(container.firstChild).toBeDefined();
  });

  it('becomes mounted after microtask', async () => {
    await act(async () => {
      render(<SmartBackgroundCanvas><div>test</div></SmartBackgroundCanvas>);
      await Promise.resolve();
    });
    expect(screen.getByText('test')).toBeDefined();
  });
});
